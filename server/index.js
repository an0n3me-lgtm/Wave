const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');

const app = express();
const server = http.createServer(app);

const JWT_SECRET = process.env.JWT_SECRET || 'wave-secret-key-change-in-production';
const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());

// ─── Auth middleware ──────────────────────────────────────────────────────────

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'Unauthorized' });
  const token = header.split(' ')[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ─── Auth routes ──────────────────────────────────────────────────────────────

app.post('/api/auth/register', (req, res) => {
  const { username, display_name, password } = req.body;
  if (!username || !display_name || !password) {
    return res.status(400).json({ error: 'All fields required' });
  }
  if (username.length < 3 || username.length > 20) {
    return res.status(400).json({ error: 'Username must be 3–20 characters' });
  }
  if (!/^[a-z0-9_]+$/.test(username)) {
    return res.status(400).json({ error: 'Username may only contain lowercase letters, digits and underscores' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) return res.status(409).json({ error: 'Username already taken' });

  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#3b82f6'];
  const avatar_color = colors[Math.floor(Math.random() * colors.length)];
  const id = uuidv4();
  const password_hash = bcrypt.hashSync(password, 10);

  db.prepare('INSERT INTO users (id, username, display_name, avatar_color, password_hash) VALUES (?, ?, ?, ?, ?)')
    .run(id, username, display_name, avatar_color, password_hash);

  const token = jwt.sign({ id, username }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: { id, username, display_name, avatar_color, bio: '' } });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: { id: user.id, username: user.username, display_name: user.display_name, avatar_color: user.avatar_color, bio: user.bio } });
});

// ─── User routes ──────────────────────────────────────────────────────────────

app.get('/api/users/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, username, display_name, avatar_color, bio FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

app.patch('/api/users/me', authMiddleware, (req, res) => {
  const { display_name, bio } = req.body;
  db.prepare('UPDATE users SET display_name = COALESCE(?, display_name), bio = COALESCE(?, bio) WHERE id = ?')
    .run(display_name || null, bio !== undefined ? bio : null, req.user.id);
  const user = db.prepare('SELECT id, username, display_name, avatar_color, bio FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

app.get('/api/users/search', authMiddleware, (req, res) => {
  const q = (req.query.q || '').toLowerCase();
  if (!q) return res.json([]);
  const users = db.prepare(
    `SELECT id, username, display_name, avatar_color FROM users
     WHERE (LOWER(username) LIKE ? OR LOWER(display_name) LIKE ?) AND id != ?
     LIMIT 20`
  ).all(`%${q}%`, `%${q}%`, req.user.id);
  res.json(users);
});

// ─── Conversation routes ──────────────────────────────────────────────────────

app.get('/api/conversations', authMiddleware, (req, res) => {
  const conversations = db.prepare(`
    SELECT c.id, c.type, c.name, c.created_at,
      (SELECT content FROM messages WHERE conversation_id = c.id AND deleted = 0 ORDER BY created_at DESC LIMIT 1) as last_message,
      (SELECT created_at FROM messages WHERE conversation_id = c.id AND deleted = 0 ORDER BY created_at DESC LIMIT 1) as last_message_at,
      (SELECT sender_id FROM messages WHERE conversation_id = c.id AND deleted = 0 ORDER BY created_at DESC LIMIT 1) as last_sender_id,
      (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.deleted = 0
        AND m.sender_id != ? AND m.id NOT IN (SELECT message_id FROM message_reads WHERE user_id = ?)) as unread_count
    FROM conversations c
    JOIN conversation_members cm ON cm.conversation_id = c.id
    WHERE cm.user_id = ?
    ORDER BY COALESCE(last_message_at, c.created_at) DESC
  `).all(req.user.id, req.user.id, req.user.id);

  const result = conversations.map(conv => {
    const members = db.prepare(`
      SELECT u.id, u.username, u.display_name, u.avatar_color FROM users u
      JOIN conversation_members cm ON cm.user_id = u.id
      WHERE cm.conversation_id = ?
    `).all(conv.id);
    return { ...conv, members };
  });

  res.json(result);
});

app.post('/api/conversations', authMiddleware, (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });

  const target = db.prepare('SELECT id, username, display_name, avatar_color FROM users WHERE id = ?').get(user_id);
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (user_id === req.user.id) return res.status(400).json({ error: 'Cannot create conversation with yourself' });

  // Check if direct conversation already exists
  const existing = db.prepare(`
    SELECT c.id FROM conversations c
    JOIN conversation_members a ON a.conversation_id = c.id AND a.user_id = ?
    JOIN conversation_members b ON b.conversation_id = c.id AND b.user_id = ?
    WHERE c.type = 'direct'
  `).get(req.user.id, user_id);

  if (existing) {
    const conv = db.prepare('SELECT * FROM conversations WHERE id = ?').get(existing.id);
    const members = db.prepare(`
      SELECT u.id, u.username, u.display_name, u.avatar_color FROM users u
      JOIN conversation_members cm ON cm.user_id = u.id WHERE cm.conversation_id = ?
    `).all(existing.id);
    return res.json({ ...conv, members, unread_count: 0, last_message: null, last_message_at: null });
  }

  const id = uuidv4();
  db.prepare('INSERT INTO conversations (id, type) VALUES (?, ?)').run(id, 'direct');
  db.prepare('INSERT INTO conversation_members (conversation_id, user_id) VALUES (?, ?)').run(id, req.user.id);
  db.prepare('INSERT INTO conversation_members (conversation_id, user_id) VALUES (?, ?)').run(id, user_id);

  const me = db.prepare('SELECT id, username, display_name, avatar_color FROM users WHERE id = ?').get(req.user.id);
  res.json({ id, type: 'direct', name: null, created_at: Math.floor(Date.now() / 1000), members: [me, target], unread_count: 0, last_message: null, last_message_at: null });
});

// ─── Message routes ───────────────────────────────────────────────────────────

app.get('/api/conversations/:id/messages', authMiddleware, (req, res) => {
  const member = db.prepare('SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);
  if (!member) return res.status(403).json({ error: 'Access denied' });

  const before = req.query.before ? parseInt(req.query.before) : null;
  const limit = 50;

  const messages = before
    ? db.prepare(`SELECT m.*, u.username, u.display_name, u.avatar_color FROM messages m JOIN users u ON u.id = m.sender_id WHERE m.conversation_id = ? AND m.deleted = 0 AND m.created_at < ? ORDER BY m.created_at DESC LIMIT ?`).all(req.params.id, before, limit)
    : db.prepare(`SELECT m.*, u.username, u.display_name, u.avatar_color FROM messages m JOIN users u ON u.id = m.sender_id WHERE m.conversation_id = ? AND m.deleted = 0 ORDER BY m.created_at DESC LIMIT ?`).all(req.params.id, limit);

  // Mark messages as read
  const markRead = db.prepare('INSERT OR IGNORE INTO message_reads (message_id, user_id) VALUES (?, ?)');
  for (const msg of messages) {
    if (msg.sender_id !== req.user.id) markRead.run(msg.id, req.user.id);
  }

  res.json(messages.reverse());
});

app.delete('/api/messages/:id', authMiddleware, (req, res) => {
  const msg = db.prepare('SELECT * FROM messages WHERE id = ?').get(req.params.id);
  if (!msg) return res.status(404).json({ error: 'Not found' });
  if (msg.sender_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });
  db.prepare('UPDATE messages SET deleted = 1 WHERE id = ?').run(req.params.id);
  io.to(msg.conversation_id).emit('message:deleted', { id: req.params.id, conversation_id: msg.conversation_id });
  res.json({ ok: true });
});

// ─── Socket.io ────────────────────────────────────────────────────────────────

const onlineUsers = new Map(); // userId -> Set of socketIds

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Unauthorized'));
  try {
    socket.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  const userId = socket.user.id;

  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
  onlineUsers.get(userId).add(socket.id);

  // Join all conversation rooms
  const convs = db.prepare('SELECT conversation_id FROM conversation_members WHERE user_id = ?').all(userId);
  convs.forEach(({ conversation_id }) => socket.join(conversation_id));

  // Broadcast online status
  io.emit('user:online', { userId, online: true });

  socket.on('message:send', ({ conversation_id, content }) => {
    if (!conversation_id || !content?.trim()) return;

    const member = db.prepare('SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?')
      .get(conversation_id, userId);
    if (!member) return;

    const id = uuidv4();
    const created_at = Math.floor(Date.now() / 1000);
    db.prepare('INSERT INTO messages (id, conversation_id, sender_id, content, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(id, conversation_id, userId, content.trim(), created_at);

    const sender = db.prepare('SELECT id, username, display_name, avatar_color FROM users WHERE id = ?').get(userId);
    const message = { id, conversation_id, sender_id: userId, content: content.trim(), type: 'text', created_at, deleted: 0, ...sender };

    io.to(conversation_id).emit('message:new', message);
  });

  socket.on('message:edit', ({ message_id, content }) => {
    if (!message_id || !content?.trim()) return;
    const msg = db.prepare('SELECT * FROM messages WHERE id = ? AND sender_id = ?').get(message_id, userId);
    if (!msg) return;
    const edited_at = Math.floor(Date.now() / 1000);
    db.prepare('UPDATE messages SET content = ?, edited_at = ? WHERE id = ?').run(content.trim(), edited_at, message_id);
    io.to(msg.conversation_id).emit('message:edited', { id: message_id, content: content.trim(), edited_at });
  });

  socket.on('typing:start', ({ conversation_id }) => {
    socket.to(conversation_id).emit('typing:start', { userId, conversation_id });
  });

  socket.on('typing:stop', ({ conversation_id }) => {
    socket.to(conversation_id).emit('typing:stop', { userId, conversation_id });
  });

  socket.on('conversation:join', (conversation_id) => {
    socket.join(conversation_id);
  });


  // ── P2P / WebRTC signalling ───────────────────────────────────────────────

  socket.on('p2p:announce', (info) => {
    // Broadcast to everyone else on same server (same LAN session)
    socket.broadcast.emit('p2p:announce', info);
    socket.join('p2p:room');
  });

  socket.on('p2p:signal', ({ to, from, signal }) => {
    // Forward WebRTC signal to target peer
    const targetSockets = onlineUsers.get(to);
    if (targetSockets) {
      for (const sid of targetSockets) {
        io.to(sid).emit('p2p:signal', { from, signal });
      }
    }
  });

  socket.on('disconnect', () => {
    const sockets = onlineUsers.get(userId);
    if (sockets) {
      sockets.delete(socket.id);
      if (sockets.size === 0) {
        onlineUsers.delete(userId);
        io.emit('user:online', { userId, online: false });
      }
    }
  });
});

app.get('/api/users/online', authMiddleware, (req, res) => {
  res.json([...onlineUsers.keys()]);
});

server.listen(PORT, () => {
  console.log(`Wave server running on port ${PORT}`);
});
// Appended by patch — P2P signalling
