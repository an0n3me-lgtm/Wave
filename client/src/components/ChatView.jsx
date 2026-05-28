import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
import { getSocket } from '../hooks/useSocket';
import Avatar from './Avatar';
import { SendIcon, EditIcon, TrashIcon, XIcon, ArrowLeftIcon } from './Icons';
import TextareaAutosize from 'react-textarea-autosize';
import { format, isToday, isYesterday } from 'date-fns';
import api from '../api';

export default function ChatView({ onBack }) {
  const { activeConversationId, conversations, messages, typingUsers, onlineUsers } = useChatStore();
  const { user } = useAuthStore();
  const [text, setText] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const bottomRef = useRef(null);
  const msgsRef = useRef(null);
  const typingTimeout = useRef(null);

  const conv = conversations.find(c => c.id === activeConversationId);
  const convMessages = messages[activeConversationId] || [];
  const typing = typingUsers[activeConversationId] || new Set();
  const otherUser = conv?.type === 'direct' ? conv.members?.find(m => m.id !== user?.id) : null;
  const isOnline = otherUser ? onlineUsers.has(otherUser.id) : false;

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [convMessages.length, activeConversationId]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || convMessages.length === 0) return;
    setLoadingMore(true);
    const oldest = convMessages[0]?.created_at;
    try {
      const data = await useChatStore.getState().fetchMessages(activeConversationId, oldest);
      if (data.length < 50) setHasMore(false);
    } finally { setLoadingMore(false); }
  }, [loadingMore, hasMore, convMessages, activeConversationId]);

  const handleScroll = useCallback(() => {
    const el = msgsRef.current;
    if (el && el.scrollTop < 80) loadMore();
  }, [loadMore]);

  const sendTyping = (isTyping) => {
    const socket = getSocket();
    if (!socket || !activeConversationId) return;
    socket.emit(isTyping ? 'typing:start' : 'typing:stop', { conversation_id: activeConversationId });
  };

  const handleInput = (e) => {
    setText(e.target.value);
    sendTyping(true);
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => sendTyping(false), 2000);
  };

  const send = () => {
    const socket = getSocket();
    if (!socket || !text.trim() || !activeConversationId) return;
    socket.emit('message:send', { conversation_id: activeConversationId, content: text.trim() });
    setText('');
    sendTyping(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const startEdit = (msg) => { setEditingId(msg.id); setEditText(msg.content); };

  const submitEdit = () => {
    const socket = getSocket();
    if (!socket || !editText.trim()) return;
    socket.emit('message:edit', { message_id: editingId, content: editText.trim() });
    setEditingId(null);
    setEditText('');
  };

  const deleteMsg = async (id) => {
    try { await api.delete(`/api/messages/${id}`); } catch {}
  };

  if (!conv) {
    return (
      <div style={s.empty}>
        <div style={s.emptyContent}>
          <div style={s.emptyLogo}>
            <svg width="48" height="48" viewBox="0 0 32 32" fill="none">
              <path d="M4 20 Q9 10 14 20 Q19 30 24 20 Q29 10 29 16" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none"/>
            </svg>
          </div>
          <h2 style={s.emptyTitle} className="gradient-text">Wave</h2>
          <p style={s.emptyText}>Search for people or use 📡 Nearby to chat without internet</p>
          <div style={s.featurePills}>
            <span style={s.pill}>💬 Real-time messaging</span>
            <span style={s.pill}>📡 WiFi Direct</span>
            <span style={s.pill}>🔵 Bluetooth</span>
          </div>
        </div>
      </div>
    );
  }

  const grouped = groupByDate(convMessages);
  const typingList = [...typing].filter(id => id !== user?.id);

  return (
    <div style={s.root}>
      {/* Header */}
      <div style={s.header} className="glass">
        {onBack && (
          <button style={s.backBtn} onClick={onBack}>
            <ArrowLeftIcon size={20} />
          </button>
        )}
        <Avatar user={otherUser} size={38} showStatus isOnline={isOnline} />
        <div style={s.headerInfo}>
          <span style={s.headerName}>{otherUser?.display_name || conv.name || 'Unknown'}</span>
          <span style={{ ...s.headerStatus, color: isOnline ? 'var(--success)' : 'var(--text-tertiary)' }}>
            {isOnline ? '● Online' : '○ Offline'}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div style={s.messages} ref={msgsRef} onScroll={handleScroll}>
        {loadingMore && <div style={s.loadMore}>Loading earlier messages…</div>}

        {grouped.map(({ date, msgs }) => (
          <React.Fragment key={date}>
            <div style={s.dateDivider}>
              <span style={s.dateLabel}>{date}</span>
            </div>
            {msgs.map((msg, idx) => {
              const isMine = msg.sender_id === user?.id;
              const prevMsg = msgs[idx - 1];
              const isFirst = !prevMsg || prevMsg.sender_id !== msg.sender_id;
              return (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  isMine={isMine}
                  isFirst={isFirst}
                  isEditing={editingId === msg.id}
                  editText={editText}
                  setEditText={setEditText}
                  onEdit={() => startEdit(msg)}
                  onCancelEdit={() => { setEditingId(null); setEditText(''); }}
                  onSubmitEdit={submitEdit}
                  onDelete={() => deleteMsg(msg.id)}
                />
              );
            })}
          </React.Fragment>
        ))}

        {typingList.length > 0 && (
          <div style={s.typingRow} className="msg-in">
            <div style={s.typingBubble} className="glass-sm">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
            <span style={s.typingLabel}>{otherUser?.display_name || 'Someone'} is typing…</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={s.inputArea}>
        <div style={s.inputWrap} className="glass">
          <TextareaAutosize
            style={s.input}
            placeholder={`Message ${otherUser?.display_name || ''}…`}
            value={text}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            minRows={1}
            maxRows={6}
          />
          <button
            style={{ ...s.sendBtn, ...(text.trim() ? s.sendBtnActive : {}) }}
            onClick={send}
            disabled={!text.trim()}
          >
            <SendIcon size={17} />
          </button>
        </div>
        <p style={s.hint}>Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}

function MessageBubble({ msg, isMine, isFirst, isEditing, editText, setEditText, onEdit, onCancelEdit, onSubmitEdit, onDelete }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className={isMine ? 'msg-out' : 'msg-in'}
      style={{ ...s.msgRow, ...(isMine ? s.msgRowMine : s.msgRowTheirs), marginTop: isFirst ? 12 : 3 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {!isMine && isFirst && (
        <p style={s.senderName}>{msg.display_name || msg.username}</p>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, maxWidth: '75%' }}>
        {isMine && hovered && (
          <div style={s.actionsLeft}>
            <button style={s.actBtn} onClick={onEdit}><EditIcon size={13} /></button>
            <button style={{ ...s.actBtn, color: 'var(--danger)' }} onClick={onDelete}><TrashIcon size={13} /></button>
          </div>
        )}

        <div style={{
          ...s.bubble,
          ...(isMine ? s.bubbleMine : s.bubbleTheirs),
        }}>
          {isEditing ? (
            <div style={s.editBox}>
              <TextareaAutosize
                style={s.editInput}
                value={editText}
                onChange={e => setEditText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSubmitEdit(); }
                  if (e.key === 'Escape') onCancelEdit();
                }}
                autoFocus minRows={1} maxRows={5}
              />
              <div style={s.editBtns}>
                <button style={s.editCancel} onClick={onCancelEdit}><XIcon size={11} /> Cancel</button>
                <button style={s.editSave} onClick={onSubmitEdit}>Save</button>
              </div>
            </div>
          ) : (
            <p style={s.msgText}>{msg.content}</p>
          )}
          <div style={s.msgMeta}>
            <span style={s.msgTime}>
              {format(new Date(msg.created_at * 1000), 'HH:mm')}
              {msg.edited_at && <em style={{ marginLeft: 4, opacity: 0.65 }}>(edited)</em>}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function groupByDate(messages) {
  const groups = [];
  let current = null;
  for (const msg of messages) {
    const d = new Date(msg.created_at * 1000);
    const label = isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : format(d, 'MMMM d, yyyy');
    if (!current || current.date !== label) { current = { date: label, msgs: [] }; groups.push(current); }
    current.msgs.push(msg);
  }
  return groups;
}

const s = {
  root: { flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' },
  empty: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'transparent',
  },
  emptyContent: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  emptyLogo: {
    width: 80, height: 80, borderRadius: 24,
    background: 'var(--accent-gradient)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 8px 32px var(--accent-glow)', marginBottom: 4,
  },
  emptyTitle: { fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em' },
  emptyText: { fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', maxWidth: 300, lineHeight: 1.6 },
  featurePills: { display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 6 },
  pill: {
    padding: '4px 12px', borderRadius: 99,
    background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
    fontSize: 12, color: 'var(--text-secondary)',
    backdropFilter: 'var(--glass-blur-sm)',
  },

  header: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '12px 20px',
    borderBottom: '1px solid var(--glass-border)',
    flexShrink: 0,
    background: 'rgba(10,8,20,0.7)',
  },
  backBtn: { display: 'flex', alignItems: 'center', color: 'var(--text-secondary)', padding: 4 },
  headerInfo: { display: 'flex', flexDirection: 'column', gap: 2 },
  headerName: { fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' },
  headerStatus: { fontSize: 11, fontWeight: 500 },

  messages: { flex: 1, overflowY: 'auto', padding: '12px 24px' },
  loadMore: { textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 12, padding: '8px 0' },

  dateDivider: { display: 'flex', justifyContent: 'center', margin: '16px 0 8px' },
  dateLabel: {
    fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)',
    textTransform: 'uppercase', letterSpacing: '0.06em',
    background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
    padding: '3px 12px', borderRadius: 99,
    backdropFilter: 'var(--glass-blur-sm)',
  },

  msgRow: { display: 'flex', flexDirection: 'column' },
  msgRowMine: { alignItems: 'flex-end' },
  msgRowTheirs: { alignItems: 'flex-start' },
  senderName: {
    fontSize: 11, fontWeight: 600, color: 'var(--text-accent)',
    marginBottom: 3, paddingLeft: 12,
  },
  actionsLeft: { display: 'flex', gap: 4, marginBottom: 4 },
  actBtn: {
    width: 26, height: 26, borderRadius: 7,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
    color: 'var(--text-secondary)', cursor: 'pointer',
    backdropFilter: 'var(--glass-blur-sm)',
  },
  bubble: {
    padding: '9px 13px',
    borderRadius: 'var(--radius-lg)',
    maxWidth: '100%', wordBreak: 'break-word',
  },
  bubbleMine: {
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    color: '#fff', borderBottomRightRadius: 4,
    boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
  },
  bubbleTheirs: {
    background: 'rgba(255,255,255,0.08)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.10)',
    color: 'var(--text-primary)', borderBottomLeftRadius: 4,
  },
  msgText: { fontSize: 14, lineHeight: 1.55, whiteSpace: 'pre-wrap' },
  msgMeta: { display: 'flex', justifyContent: 'flex-end', marginTop: 3 },
  msgTime: { fontSize: 10, opacity: 0.55 },

  editBox: { display: 'flex', flexDirection: 'column', gap: 6, minWidth: 200 },
  editInput: {
    background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 8, color: 'inherit', fontSize: 14, padding: '5px 9px', resize: 'none',
  },
  editBtns: { display: 'flex', gap: 6, justifyContent: 'flex-end' },
  editCancel: {
    display: 'flex', alignItems: 'center', gap: 3,
    padding: '3px 8px', borderRadius: 6,
    background: 'rgba(255,255,255,0.1)', color: 'inherit', fontSize: 11, cursor: 'pointer',
  },
  editSave: {
    padding: '3px 10px', borderRadius: 6,
    background: 'rgba(255,255,255,0.2)', color: 'inherit',
    fontSize: 11, fontWeight: 700, cursor: 'pointer',
  },

  typingRow: {
    display: 'flex', alignItems: 'center', gap: 8, marginTop: 8,
  },
  typingBubble: {
    display: 'flex', alignItems: 'center', gap: 4,
    padding: '10px 14px',
    borderRadius: 'var(--radius-lg)', borderBottomLeftRadius: 4,
    border: '1px solid var(--glass-border)',
  },
  typingLabel: { fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic' },

  inputArea: { padding: '10px 20px 14px', flexShrink: 0 },
  inputWrap: {
    display: 'flex', alignItems: 'flex-end', gap: 8,
    padding: '8px 8px 8px 16px',
    borderRadius: 'var(--radius-xl)',
    border: '1px solid var(--glass-border)',
    background: 'rgba(10,8,20,0.6)',
  },
  input: {
    flex: 1, background: 'none', border: 'none',
    color: 'var(--text-primary)', fontSize: 14, resize: 'none',
    lineHeight: 1.5, padding: '4px 0',
  },
  sendBtn: {
    width: 38, height: 38, borderRadius: 12, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'var(--text-tertiary)', background: 'transparent', transition: 'var(--transition)',
  },
  sendBtnActive: {
    background: 'var(--accent-gradient)', color: '#fff',
    boxShadow: '0 0 16px var(--accent-glow)',
  },
  hint: { fontSize: 10, color: 'var(--text-tertiary)', textAlign: 'center', marginTop: 5 },
};
