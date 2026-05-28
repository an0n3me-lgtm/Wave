import React, { useEffect, useState, useRef } from 'react';
import { useP2PStore } from '../store/p2pStore';
import { useAuthStore } from '../store/authStore';
import { getSocket } from '../hooks/useSocket';
import Avatar from './Avatar';
import TextareaAutosize from 'react-textarea-autosize';
import { SendIcon } from './Icons';
import { format } from 'date-fns';

export default function P2PPanel() {
  const { user } = useAuthStore();
  const {
    lanPeers, btDevice, btConnected, btScanning, btError,
    connectLan, sendLan, btScanStart, btSendMessage, btDisconnect,
    p2pMessages, activePeerId, setActivePeer, init, addLanPeer, removeLanPeer,
    isBtSupported,
  } = useP2PStore();

  const [lanMode, setLanMode] = useState(false);
  const [btMode, setBtMode] = useState(false);
  const [text, setText] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    if (user?.id) init(user.id);
  }, [user?.id]);

  // Listen for nearby peer announcements via socket
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !user?.id) return;

    const handleAnnounce = (peer) => {
      if (peer.id === user.id) return;
      addLanPeer({ ...peer, connected: false, type: 'lan' });
    };
    const handleLeave = ({ id }) => removeLanPeer(id);

    socket.on('p2p:announce', handleAnnounce);
    socket.on('p2p:leave', handleLeave);

    // Announce ourselves
    if (lanMode) {
      socket.emit('p2p:announce', {
        id: user.id,
        displayName: user.display_name,
        username: user.username,
        avatarColor: user.avatar_color,
      });
    }

    return () => {
      socket.off('p2p:announce', handleAnnounce);
      socket.off('p2p:leave', handleLeave);
    };
  }, [lanMode, user]);

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [p2pMessages, activePeerId]);

  const currentMessages = activePeerId ? (p2pMessages[activePeerId] || []) : [];

  const handleSend = () => {
    if (!text.trim()) return;
    const isBt = activePeerId === '__bluetooth__';
    if (isBt) {
      btSendMessage(text.trim(), user.display_name);
    } else if (activePeerId) {
      sendLan(activePeerId, text.trim(), user.display_name);
      useP2PStore.getState().addP2PMessage(activePeerId, {
        from: user.display_name,
        content: text.trim(),
        ts: Date.now(),
        type: 'lan',
        mine: true,
      });
    }
    setText('');
  };

  // If a peer is selected, show chat view
  if (activePeerId) {
    const peer = activePeerId === '__bluetooth__'
      ? { displayName: btDevice?.name || 'BT Device', type: 'bt' }
      : lanPeers.find(p => p.id === activePeerId);

    return (
      <div style={s.chatRoot}>
        <div style={s.chatHeader} className="glass-sm">
          <button style={s.backBtn} onClick={() => setActivePeer(null)}>← Back</button>
          <span style={s.chatTitle}>{peer?.displayName || 'Peer'}</span>
          <span className={`p2p-badge ${peer?.type === 'bt' ? 'bt' : 'wifi'}`}>
            {peer?.type === 'bt' ? '📶 BT' : '📡 WiFi'}
          </span>
        </div>
        <div style={s.messages}>
          {currentMessages.length === 0 && (
            <p style={s.noMsgs}>No messages yet. Say hi! 👋</p>
          )}
          {currentMessages.map((msg, i) => (
            <div key={i} style={{ ...s.msgRow, ...(msg.mine ? s.msgRowMine : s.msgRowTheirs) }}>
              <div style={{ ...s.bubble, ...(msg.mine ? s.bubbleMine : s.bubbleTheirs) }}>
                {!msg.mine && <p style={s.msgFrom}>{msg.from}</p>}
                <p style={s.msgText}>{msg.content}</p>
                <p style={s.msgTime}>{format(new Date(msg.ts), 'HH:mm')}</p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <div style={s.inputArea} className="glass-sm">
          <TextareaAutosize
            style={s.input}
            placeholder="Message…"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            minRows={1} maxRows={4}
          />
          <button
            style={{ ...s.sendBtn, ...(text.trim() ? s.sendBtnActive : {}) }}
            onClick={handleSend} disabled={!text.trim()}
          >
            <SendIcon size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={s.root}>
      <p style={s.desc}>Chat directly with people nearby — no internet required.</p>

      {/* ── WiFi / LAN section ── */}
      <Section
        icon="📡"
        title="Local Network (WiFi)"
        badge="WiFi Direct"
        badgeClass="wifi"
        desc="Discover Wave users on the same WiFi network."
      >
        {!lanMode ? (
          <button style={s.actionBtn} onClick={() => setLanMode(true)}>
            Start Discovery
          </button>
        ) : (
          <>
            <div style={s.scanning}>
              <span style={s.scanDot} /> Scanning for nearby users…
            </div>
            {lanPeers.length === 0 ? (
              <p style={s.noResults}>No Wave users found on this network yet</p>
            ) : (
              lanPeers.map(peer => (
                <div key={peer.id} style={s.peerRow} className="glass-sm">
                  <Avatar
                    user={{ display_name: peer.displayName, username: peer.username, avatar_color: peer.avatarColor }}
                    size={36}
                  />
                  <div style={s.peerInfo}>
                    <span style={s.peerName}>{peer.displayName}</span>
                    <span style={s.peerSub}>@{peer.username}</span>
                  </div>
                  {peer.connected ? (
                    <button style={s.openBtn} onClick={() => setActivePeer(peer.id)}>
                      Open
                    </button>
                  ) : (
                    <button style={s.connectBtn} onClick={() => {
                      connectLan(peer, user.id);
                    }}>
                      Connect
                    </button>
                  )}
                </div>
              ))
            )}
            <button style={s.stopBtn} onClick={() => { setLanMode(false); }}>
              Stop Discovery
            </button>
          </>
        )}
      </Section>

      {/* ── Bluetooth section ── */}
      <Section
        icon="🔵"
        title="Bluetooth"
        badge="BLE"
        badgeClass="bt"
        desc="Connect to a nearby Wave device over Bluetooth Low Energy."
      >
        {!isBtSupported() ? (
          <p style={s.noResults}>Bluetooth not available in this browser.<br/>Use Chrome on desktop or the Wave Android app.</p>
        ) : btConnected ? (
          <>
            <div style={s.peerRow} className="glass-sm">
              <div style={s.btIcon}>🔵</div>
              <div style={s.peerInfo}>
                <span style={s.peerName}>{btDevice?.name || 'BT Device'}</span>
                <span style={s.peerSub}>Connected via BLE</span>
              </div>
              <button style={s.openBtn} onClick={() => setActivePeer('__bluetooth__')}>
                Chat
              </button>
            </div>
            <button style={s.stopBtn} onClick={btDisconnect}>
              Disconnect
            </button>
          </>
        ) : (
          <>
            {btError && <p style={s.errMsg}>⚠ {btError}</p>}
            <button style={s.actionBtn} disabled={btScanning} onClick={btScanStart}>
              {btScanning ? 'Scanning…' : 'Scan for Devices'}
            </button>
          </>
        )}
      </Section>
    </div>
  );
}

function Section({ icon, title, badge, badgeClass, desc, children }) {
  return (
    <div style={sec.wrap} className="glass-sm">
      <div style={sec.header}>
        <span style={sec.icon}>{icon}</span>
        <div style={{ flex: 1 }}>
          <div style={sec.titleRow}>
            <span style={sec.title}>{title}</span>
            <span className={`p2p-badge ${badgeClass}`}>{badge}</span>
          </div>
          <p style={sec.desc}>{desc}</p>
        </div>
      </div>
      <div style={sec.body}>{children}</div>
    </div>
  );
}

const s = {
  root: { flex: 1, overflowY: 'auto', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 10 },
  desc: { fontSize: 12, color: 'var(--text-secondary)', padding: '4px 4px 2px', lineHeight: 1.6 },
  scanning: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)', padding: '6px 0' },
  scanDot: {
    width: 8, height: 8, borderRadius: '50%', background: 'var(--success)',
    boxShadow: '0 0 6px var(--success)', flexShrink: 0,
  },
  noResults: { fontSize: 12, color: 'var(--text-tertiary)', padding: '8px 0', lineHeight: 1.6 },
  errMsg: { fontSize: 12, color: 'var(--danger)', padding: '4px 0' },
  peerRow: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '8px 10px', borderRadius: 'var(--radius-md)',
    border: '1px solid var(--glass-border)', marginBottom: 6,
  },
  peerInfo: { flex: 1, minWidth: 0 },
  peerName: { fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'block' },
  peerSub: { fontSize: 11, color: 'var(--text-secondary)' },
  btIcon: { fontSize: 24, flexShrink: 0 },
  connectBtn: {
    padding: '5px 12px', borderRadius: 8,
    background: 'var(--accent-gradient)', color: '#fff',
    fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
  },
  openBtn: {
    padding: '5px 12px', borderRadius: 8,
    background: 'rgba(52,211,153,0.2)', color: 'var(--success)',
    border: '1px solid rgba(52,211,153,0.35)',
    fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
  },
  actionBtn: {
    width: '100%', padding: '10px',
    background: 'var(--accent-gradient)', color: '#fff',
    borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: 13,
    cursor: 'pointer', boxShadow: '0 2px 12px var(--accent-glow)',
    border: 'none',
  },
  stopBtn: {
    marginTop: 6, width: '100%', padding: '8px',
    background: 'rgba(248,113,113,0.12)', color: 'var(--danger)',
    border: '1px solid rgba(248,113,113,0.25)',
    borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: 12, cursor: 'pointer',
  },

  // Chat sub-view
  chatRoot: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  chatHeader: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 12px', borderBottom: '1px solid var(--glass-border)',
    margin: '0 -10px', flexShrink: 0,
  },
  backBtn: { fontSize: 12, color: 'var(--text-accent)', cursor: 'pointer', fontWeight: 600 },
  chatTitle: { flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' },
  messages: { flex: 1, overflowY: 'auto', padding: '8px 0', display: 'flex', flexDirection: 'column', gap: 3 },
  noMsgs: { textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 12, padding: '30px 0' },
  msgRow: { display: 'flex' },
  msgRowMine: { justifyContent: 'flex-end' },
  msgRowTheirs: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '80%', padding: '7px 11px', borderRadius: 'var(--radius-lg)' },
  bubbleMine: { background: 'var(--accent-gradient)', borderBottomRightRadius: 4 },
  bubbleTheirs: { background: 'var(--msg-in-bg)', borderBottomLeftRadius: 4 },
  msgFrom: { fontSize: 10, fontWeight: 600, color: 'var(--text-accent)', marginBottom: 2 },
  msgText: { fontSize: 13, color: '#fff', lineHeight: 1.4 },
  msgTime: { fontSize: 9, opacity: 0.55, textAlign: 'right', marginTop: 2 },
  inputArea: {
    display: 'flex', alignItems: 'flex-end', gap: 8,
    padding: '8px 10px', borderTop: '1px solid var(--glass-border)',
    margin: '0 -10px', flexShrink: 0,
    border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)',
    marginTop: 6,
  },
  input: {
    flex: 1, background: 'none', border: 'none',
    color: 'var(--text-primary)', fontSize: 13, resize: 'none', padding: '3px 0',
  },
  sendBtn: {
    width: 32, height: 32, borderRadius: 8,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'var(--text-tertiary)', background: 'transparent', flexShrink: 0,
  },
  sendBtnActive: {
    background: 'var(--accent-gradient)', color: '#fff',
    boxShadow: '0 0 10px var(--accent-glow)',
  },
};

const sec = {
  wrap: {
    borderRadius: 'var(--radius-md)', padding: '12px 14px',
    border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: 10,
  },
  header: { display: 'flex', gap: 10, alignItems: 'flex-start' },
  icon: { fontSize: 20, marginTop: 2, flexShrink: 0 },
  titleRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 },
  title: { fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' },
  desc: { fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 },
  body: { display: 'flex', flexDirection: 'column', gap: 4 },
};
