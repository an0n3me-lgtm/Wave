import React, { useState, useEffect, useRef } from 'react';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
import Avatar from './Avatar';
import { SearchIcon, PlusIcon, LogoutIcon, SettingsIcon, XIcon, WaveIcon } from './Icons';
import { formatDistanceToNow } from 'date-fns';
import ProfileModal from './ProfileModal';
import P2PPanel from './P2PPanel';

export default function Sidebar() {
  const { conversations, activeConversationId, setActiveConversation, searchResults, searchUsers, clearSearch, openConversation, onlineUsers } = useChatStore();
  const { user, logout } = useAuthStore();
  const [query, setQuery] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const [activeTab, setActiveTab] = useState('chats'); // 'chats' | 'local'

  useEffect(() => {
    const t = setTimeout(() => searchUsers(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  const handleUserClick = async (u) => {
    await openConversation(u.id);
    setQuery('');
    clearSearch();
  };

  const getConvName = (conv) => {
    if (conv.type === 'direct') {
      const other = conv.members?.find(m => m.id !== user?.id);
      return other?.display_name || other?.username || 'Unknown';
    }
    return conv.name || 'Group';
  };

  const getConvUser = (conv) => conv.type === 'direct'
    ? conv.members?.find(m => m.id !== user?.id)
    : null;

  const isConvOnline = (conv) => {
    const other = getConvUser(conv);
    return other ? onlineUsers.has(other.id) : false;
  };

  return (
    <aside style={s.sidebar} className="glass">
      {/* Header */}
      <div style={s.header}>
        <div style={s.logo}>
          <div style={s.logoIcon}>
            <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
              <path d="M4 20 Q9 10 14 20 Q19 30 24 20 Q29 10 29 16" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none"/>
            </svg>
          </div>
          <span style={s.logoText} className="gradient-text">Wave</span>
        </div>
        <div style={s.headerActions}>
          <button style={s.iconBtn} onClick={() => setShowProfile(true)} title="Profile">
            <SettingsIcon size={17} />
          </button>
          <button style={s.iconBtn} onClick={logout} title="Sign out">
            <LogoutIcon size={17} />
          </button>
        </div>
      </div>

      {/* Me */}
      <div style={s.meRow} className="glass-sm">
        <Avatar user={user} size={34} showStatus isOnline />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={s.meName}>{user?.display_name}</p>
          <p style={s.meUser}>@{user?.username}</p>
        </div>
        <span style={{ ...s.onlinePill }}>● Online</span>
      </div>

      {/* Tabs: Chats / Local */}
      <div style={s.tabBar} className="glass-sm">
        {[['chats', '💬 Chats'], ['local', '📡 Nearby']].map(([k, label]) => (
          <button
            key={k}
            style={{ ...s.tabBtn, ...(activeTab === k ? s.tabBtnActive : {}) }}
            onClick={() => setActiveTab(k)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Chats tab ── */}
      {activeTab === 'chats' && (
        <>
          {/* Search */}
          <div style={s.searchWrap}>
            <SearchIcon size={15} color="var(--text-tertiary)" style={{ position: 'absolute', left: 24, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              style={s.searchInput}
              className="glass-sm"
              placeholder="Search people…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            {query && (
              <button style={s.clearBtn} onClick={() => { setQuery(''); clearSearch(); }}>
                <XIcon size={13} />
              </button>
            )}
          </div>

          {/* Search results */}
          {query ? (
            <div style={s.list}>
              {searchResults.length === 0
                ? <p style={s.emptyText}>No users found</p>
                : searchResults.map(u => (
                  <button key={u.id} style={s.item} onClick={() => handleUserClick(u)}>
                    <Avatar user={u} size={36} showStatus isOnline={onlineUsers.has(u.id)} />
                    <div style={s.itemInfo}>
                      <span style={s.itemName}>{u.display_name}</span>
                      <span style={s.itemSub}>@{u.username}</span>
                    </div>
                    <PlusIcon size={15} color="var(--text-tertiary)" />
                  </button>
                ))}
            </div>
          ) : (
            <div style={s.list}>
              {conversations.length === 0
                ? (
                  <div style={s.emptyState}>
                    <div style={s.emptyIcon}>💬</div>
                    <p style={s.emptyTitle}>No conversations</p>
                    <p style={s.emptyText}>Search for people to start chatting</p>
                  </div>
                )
                : conversations.map(conv => {
                  const convUser = getConvUser(conv);
                  const name = getConvName(conv);
                  const isActive = conv.id === activeConversationId;
                  const isOnline = isConvOnline(conv);
                  const hasUnread = conv.unread_count > 0;

                  return (
                    <button
                      key={conv.id}
                      style={{ ...s.item, ...(isActive ? s.itemActive : {}) }}
                      onClick={() => setActiveConversation(conv.id)}
                    >
                      <Avatar user={convUser} size={42} showStatus isOnline={isOnline} />
                      <div style={s.itemInfo}>
                        <div style={s.itemTop}>
                          <span style={{ ...s.itemName, ...(hasUnread ? { fontWeight: 700 } : {}) }}>{name}</span>
                          {conv.last_message_at && (
                            <span style={s.itemTime}>
                              {formatDistanceToNow(new Date(conv.last_message_at * 1000), { addSuffix: false })
                                .replace('about ', '').replace('less than a minute', 'now')}
                            </span>
                          )}
                        </div>
                        <div style={s.itemBottom}>
                          <span style={{ ...s.itemSub, ...(hasUnread ? { color: 'var(--text-primary)', fontWeight: 500 } : {}) }}>
                            {conv.last_message
                              ? (conv.last_sender_id === user?.id ? `You: ${conv.last_message}` : conv.last_message)
                              : <em>No messages yet</em>}
                          </span>
                          {hasUnread && <span style={s.badge}>{conv.unread_count > 99 ? '99+' : conv.unread_count}</span>}
                        </div>
                      </div>
                    </button>
                  );
                })}
            </div>
          )}
        </>
      )}

      {/* ── Nearby tab ── */}
      {activeTab === 'local' && <P2PPanel />}

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
    </aside>
  );
}

const s = {
  sidebar: {
    width: 300, flexShrink: 0,
    display: 'flex', flexDirection: 'column',
    borderRight: '1px solid var(--glass-border)',
    height: '100%', overflow: 'hidden',
    background: 'rgba(15,10,30,0.65)',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 16px 10px',
    borderBottom: '1px solid var(--glass-border)',
  },
  logo: { display: 'flex', alignItems: 'center', gap: 8 },
  logoIcon: {
    width: 32, height: 32, borderRadius: 9,
    background: 'var(--accent-gradient)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 2px 12px var(--accent-glow)',
  },
  logoText: { fontSize: 19, fontWeight: 800, letterSpacing: '-0.02em' },
  headerActions: { display: 'flex', gap: 2 },
  iconBtn: {
    width: 30, height: 30, borderRadius: 8,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'var(--text-secondary)', transition: 'var(--transition)',
  },
  meRow: {
    display: 'flex', alignItems: 'center', gap: 10,
    margin: '10px 12px 6px',
    padding: '8px 12px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--glass-border)',
  },
  meName: { fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' },
  meUser: { fontSize: 11, color: 'var(--text-secondary)' },
  onlinePill: {
    fontSize: 10, fontWeight: 600, color: 'var(--success)',
    background: 'rgba(52,211,153,0.12)',
    padding: '2px 7px', borderRadius: 99,
    border: '1px solid rgba(52,211,153,0.25)',
    whiteSpace: 'nowrap',
  },
  tabBar: {
    display: 'flex', margin: '4px 12px 8px',
    borderRadius: 'var(--radius-md)', padding: 3,
    border: '1px solid var(--glass-border)',
  },
  tabBtn: {
    flex: 1, padding: '7px 0',
    borderRadius: 'calc(var(--radius-md) - 2px)',
    fontSize: 12, fontWeight: 500,
    color: 'var(--text-secondary)', transition: 'var(--transition)',
  },
  tabBtnActive: {
    background: 'rgba(255,255,255,0.12)',
    color: 'var(--text-primary)', fontWeight: 600,
  },
  searchWrap: { position: 'relative', padding: '0 10px 6px' },
  searchInput: {
    width: '100%', padding: '8px 32px 8px 36px',
    borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)',
    color: 'var(--text-primary)', fontSize: 13, transition: 'var(--transition)',
  },
  clearBtn: {
    position: 'absolute', right: 20, top: '50%', transform: 'translateY(-60%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'var(--text-tertiary)', padding: 2,
  },
  list: { flex: 1, overflowY: 'auto', padding: '0 6px 8px' },
  emptyState: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
    padding: '50px 20px',
  },
  emptyIcon: { fontSize: 32, marginBottom: 6 },
  emptyTitle: { fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' },
  emptyText: {
    fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center',
    padding: '20px 0',
  },
  item: {
    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
    padding: '8px 10px', borderRadius: 'var(--radius-md)',
    transition: 'var(--transition)', textAlign: 'left', cursor: 'pointer',
  },
  itemActive: { background: 'rgba(255,255,255,0.10)' },
  itemInfo: { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 3 },
  itemTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 },
  itemName: { fontSize: 14, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 },
  itemTime: { fontSize: 11, color: 'var(--text-tertiary)', whiteSpace: 'nowrap', flexShrink: 0 },
  itemBottom: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 },
  itemSub: { fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 },
  badge: {
    minWidth: 18, height: 18, borderRadius: 9,
    background: 'var(--accent-gradient)', color: '#fff',
    fontSize: 10, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '0 5px', flexShrink: 0,
  },
};
