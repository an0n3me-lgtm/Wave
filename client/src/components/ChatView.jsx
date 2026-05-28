import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
import { getSocket } from '../hooks/useSocket';
import Avatar from './Avatar';
import { SendIcon, EditIcon, TrashIcon, XIcon, ArrowLeftIcon, MoreVertIcon } from './Icons';
import TextareaAutosize from 'react-textarea-autosize';
import { format, isToday, isYesterday } from 'date-fns';
import api from '../api';

export default function ChatView({ onBack }) {
  const { activeConversationId, conversations, messages, typingUsers, onlineUsers, setActiveConversation } = useChatStore();
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

  const otherUser = conv?.type === 'direct'
    ? conv.members?.find(m => m.id !== user?.id)
    : null;

  const isOnline = otherUser ? onlineUsers.has(otherUser.id) : false;

  // Scroll to bottom on new messages
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [convMessages.length, activeConversationId]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || convMessages.length === 0) return;
    setLoadingMore(true);
    const oldest = convMessages[0]?.created_at;
    try {
      const data = await useChatStore.getState().fetchMessages(activeConversationId, oldest);
      if (data.length < 50) setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, convMessages, activeConversationId]);

  const handleScroll = useCallback(() => {
    const el = msgsRef.current;
    if (!el) return;
    if (el.scrollTop < 80) loadMore();
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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const startEdit = (msg) => {
    setEditingId(msg.id);
    setEditText(msg.content);
  };

  const submitEdit = () => {
    const socket = getSocket();
    if (!socket || !editText.trim()) return;
    socket.emit('message:edit', { message_id: editingId, content: editText.trim() });
    setEditingId(null);
    setEditText('');
  };

  const deleteMsg = async (id) => {
    try {
      await api.delete(`/api/messages/${id}`);
    } catch {}
  };

  if (!conv) {
    return (
      <div style={styles.empty}>
        <div style={styles.emptyInner}>
          <div style={styles.emptyWave}>
            <svg width="64" height="64" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="10" fill="var(--accent-light)" />
              <path d="M6 20 Q10 12 14 20 Q18 28 22 20 Q26 12 26 16" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            </svg>
          </div>
          <h2 style={styles.emptyTitle}>Welcome to Wave</h2>
          <p style={styles.emptyText}>Search for people and start a conversation</p>
        </div>
      </div>
    );
  }

  // Group messages by date
  const grouped = groupByDate(convMessages);
  const typingList = [...typing].filter(id => id !== user?.id);

  return (
    <div style={styles.root}>
      {/* Header */}
      <div style={styles.header}>
        {onBack && (
          <button style={styles.backBtn} onClick={onBack}>
            <ArrowLeftIcon size={20} />
          </button>
        )}
        <Avatar user={otherUser} size={38} showStatus isOnline={isOnline} />
        <div style={styles.headerInfo}>
          <span style={styles.headerName}>{otherUser?.display_name || conv.name || 'Unknown'}</span>
          <span style={styles.headerStatus}>
            {isOnline ? 'Online' : otherUser ? 'Offline' : ''}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div style={styles.messages} ref={msgsRef} onScroll={handleScroll}>
        {loadingMore && <div style={styles.loadingMore}>Loading…</div>}

        {grouped.map(({ date, msgs }) => (
          <React.Fragment key={date}>
            <div style={styles.dateDivider}>
              <span style={styles.dateDividerText}>{date}</span>
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
          <div style={styles.typingIndicator}>
            <div style={styles.typingDots}>
              <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
            </div>
            <span style={styles.typingText}>
              {otherUser?.display_name || 'Someone'} is typing…
            </span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={styles.inputArea}>
        <div style={styles.inputWrap}>
          <TextareaAutosize
            style={styles.input}
            placeholder={`Message ${otherUser?.display_name || ''}…`}
            value={text}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            minRows={1}
            maxRows={6}
          />
          <button
            style={{ ...styles.sendBtn, ...(text.trim() ? styles.sendBtnActive : {}) }}
            onClick={send}
            disabled={!text.trim()}
          >
            <SendIcon size={18} />
          </button>
        </div>
        <p style={styles.inputHint}>Press Enter to send · Shift+Enter for newline</p>
      </div>
    </div>
  );
}

function MessageBubble({ msg, isMine, isFirst, isEditing, editText, setEditText, onEdit, onCancelEdit, onSubmitEdit, onDelete }) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      style={{
        ...styles.msgRow,
        ...(isMine ? styles.msgRowMine : styles.msgRowTheirs),
        marginTop: isFirst ? 12 : 3,
      }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {!isMine && isFirst && (
        <div style={styles.senderName}>{msg.display_name || msg.username}</div>
      )}

      <div style={styles.msgOuter}>
        {showActions && (
          <div style={{ ...styles.msgActions, ...(isMine ? styles.msgActionsMine : styles.msgActionsTheirs) }}>
            {isMine && (
              <>
                <button style={styles.actionBtn} onClick={onEdit} title="Edit">
                  <EditIcon size={14} />
                </button>
                <button style={{ ...styles.actionBtn, color: 'var(--danger)' }} onClick={onDelete} title="Delete">
                  <TrashIcon size={14} />
                </button>
              </>
            )}
          </div>
        )}

        <div style={{
          ...styles.bubble,
          ...(isMine ? styles.bubbleMine : styles.bubbleTheirs),
        }}>
          {isEditing ? (
            <div style={styles.editArea}>
              <TextareaAutosize
                style={styles.editInput}
                value={editText}
                onChange={e => setEditText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSubmitEdit(); }
                  if (e.key === 'Escape') onCancelEdit();
                }}
                autoFocus
                minRows={1}
                maxRows={6}
              />
              <div style={styles.editActions}>
                <button style={styles.editCancelBtn} onClick={onCancelEdit}><XIcon size={12} /> Cancel</button>
                <button style={styles.editSaveBtn} onClick={onSubmitEdit}>Save</button>
              </div>
            </div>
          ) : (
            <p style={styles.msgText}>{msg.content}</p>
          )}
          <div style={styles.msgMeta}>
            <span style={styles.msgTime}>
              {format(new Date(msg.created_at * 1000), 'HH:mm')}
              {msg.edited_at && <em style={{ marginLeft: 4, opacity: 0.7 }}>(edited)</em>}
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
    let label;
    if (isToday(d)) label = 'Today';
    else if (isYesterday(d)) label = 'Yesterday';
    else label = format(d, 'MMMM d, yyyy');

    if (!current || current.date !== label) {
      current = { date: label, msgs: [] };
      groups.push(current);
    }
    current.msgs.push(msg);
  }

  return groups;
}

const styles = {
  root: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
    background: 'var(--bg-primary)',
  },
  empty: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-primary)',
  },
  emptyInner: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
  },
  emptyWave: {
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  emptyText: {
    fontSize: 14,
    color: 'var(--text-secondary)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 20px',
    borderBottom: '1px solid var(--border)',
    background: 'var(--bg-secondary)',
    flexShrink: 0,
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-secondary)',
    padding: 4,
  },
  headerInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
  },
  headerName: {
    fontSize: 15,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  headerStatus: {
    fontSize: 12,
    color: 'var(--text-secondary)',
  },
  messages: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px 20px',
    display: 'flex',
    flexDirection: 'column',
  },
  loadingMore: {
    textAlign: 'center',
    color: 'var(--text-tertiary)',
    fontSize: 12,
    padding: '8px 0',
  },
  dateDivider: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    margin: '16px 0 8px',
  },
  dateDividerText: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    background: 'var(--bg-primary)',
    padding: '2px 10px',
    borderRadius: 99,
    border: '1px solid var(--border)',
    margin: '0 auto',
  },
  msgRow: {
    display: 'flex',
    flexDirection: 'column',
  },
  msgRowMine: {
    alignItems: 'flex-end',
  },
  msgRowTheirs: {
    alignItems: 'flex-start',
  },
  senderName: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginBottom: 3,
    paddingLeft: 12,
  },
  msgOuter: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 6,
    maxWidth: '75%',
    position: 'relative',
  },
  msgActions: {
    display: 'flex',
    gap: 4,
    alignItems: 'center',
    flexShrink: 0,
  },
  msgActionsMine: {
    order: -1,
  },
  msgActionsTheirs: {
    order: 1,
  },
  actionBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
  },
  bubble: {
    padding: '8px 12px',
    borderRadius: 'var(--radius-lg)',
    maxWidth: '100%',
    wordBreak: 'break-word',
  },
  bubbleMine: {
    background: 'var(--msg-out-bg)',
    color: 'var(--msg-out-text)',
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    background: 'var(--msg-in-bg)',
    color: 'var(--msg-in-text)',
    borderBottomLeftRadius: 4,
  },
  msgText: {
    fontSize: 14,
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap',
  },
  msgMeta: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: 2,
  },
  msgTime: {
    fontSize: 10,
    opacity: 0.6,
  },
  editArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    minWidth: 200,
  },
  editInput: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 6,
    color: 'inherit',
    fontSize: 14,
    padding: '4px 8px',
    resize: 'none',
  },
  editActions: {
    display: 'flex',
    gap: 6,
    justifyContent: 'flex-end',
  },
  editCancelBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 3,
    padding: '3px 8px',
    borderRadius: 4,
    background: 'rgba(255,255,255,0.1)',
    color: 'inherit',
    fontSize: 12,
    cursor: 'pointer',
  },
  editSaveBtn: {
    padding: '3px 10px',
    borderRadius: 4,
    background: 'rgba(255,255,255,0.2)',
    color: 'inherit',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
  typingIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '4px 0',
    marginTop: 6,
  },
  typingDots: {
    display: 'flex',
    gap: 3,
    padding: '8px 12px',
    background: 'var(--msg-in-bg)',
    borderRadius: 'var(--radius-lg)',
    borderBottomLeftRadius: 4,
  },
  typingText: {
    fontSize: 12,
    color: 'var(--text-secondary)',
    fontStyle: 'italic',
  },
  inputArea: {
    padding: '12px 20px 16px',
    borderTop: '1px solid var(--border)',
    background: 'var(--bg-secondary)',
    flexShrink: 0,
  },
  inputWrap: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 10,
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '6px 6px 6px 14px',
    transition: 'var(--transition)',
  },
  input: {
    flex: 1,
    background: 'none',
    border: 'none',
    color: 'var(--text-primary)',
    fontSize: 14,
    resize: 'none',
    lineHeight: 1.5,
    padding: '4px 0',
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-tertiary)',
    background: 'transparent',
    cursor: 'default',
    flexShrink: 0,
    transition: 'var(--transition)',
  },
  sendBtnActive: {
    background: 'var(--accent)',
    color: '#fff',
    cursor: 'pointer',
    boxShadow: '0 0 12px var(--accent-glow)',
  },
  inputHint: {
    fontSize: 11,
    color: 'var(--text-tertiary)',
    marginTop: 6,
    textAlign: 'center',
  },
};
