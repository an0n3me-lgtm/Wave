import React, { useState, useEffect, useRef } from 'react';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
import Avatar from './Avatar';
import { SearchIcon, PlusIcon, WaveIcon, LogoutIcon, SettingsIcon, XIcon } from './Icons';
import { formatDistanceToNow } from 'date-fns';
import ProfileModal from './ProfileModal';

export default function Sidebar() {
  const { conversations, activeConversationId, setActiveConversation, searchResults, searchUsers, clearSearch, openConversation, onlineUsers } = useChatStore();
  const { user, logout } = useAuthStore();
  const [query, setQuery] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const searchRef = useRef(null);

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

  const getConvUser = (conv) => {
    if (conv.type === 'direct') {
      return conv.members?.find(m => m.id !== user?.id);
    }
    return null;
  };

  const isConvOnline = (conv) => {
    const other = getConvUser(conv);
    return other ? onlineUsers.has(other.id) : false;
  };

  return (
    <aside style={styles.sidebar}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.logo}>
          <WaveIcon size={28} />
          <span style={styles.logoText}>Wave</span>
        </div>
        <div style={styles.headerActions}>
          <button style={styles.iconBtn} onClick={() => setShowProfile(true)} title="Profile & Settings">
            <SettingsIcon size={18} />
          </button>
          <button style={styles.iconBtn} onClick={logout} title="Sign out">
            <LogoutIcon size={18} />
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div style={styles.searchWrap}>
        <SearchIcon size={16} color="var(--text-tertiary)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
        <input
          ref={searchRef}
          style={styles.searchInput}
          placeholder="Search people…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        {query && (
          <button style={styles.clearBtn} onClick={() => { setQuery(''); clearSearch(); }}>
            <XIcon size={14} />
          </button>
        )}
      </div>

      {/* Search results */}
      {query && (
        <div style={styles.searchResults}>
          <p style={styles.sectionLabel}>People</p>
          {searchResults.length === 0 ? (
            <p style={styles.emptySearch}>No users found</p>
          ) : (
            searchResults.map(u => (
              <button key={u.id} style={styles.searchItem} onClick={() => handleUserClick(u)}>
                <Avatar user={u} size={34} showStatus isOnline={onlineUsers.has(u.id)} />
                <div style={styles.searchItemInfo}>
                  <span style={styles.searchItemName}>{u.display_name}</span>
                  <span style={styles.searchItemUser}>@{u.username}</span>
                </div>
                <PlusIcon size={16} color="var(--text-tertiary)" />
              </button>
            ))
          )}
        </div>
      )}

      {/* Conversations list */}
      {!query && (
        <div style={styles.convList}>
          {conversations.length === 0 ? (
            <div style={styles.empty}>
              <p style={styles.emptyTitle}>No conversations yet</p>
              <p style={styles.emptyText}>Search for people to start chatting</p>
            </div>
          ) : (
            conversations.map(conv => {
              const convUser = getConvUser(conv);
              const name = getConvName(conv);
              const isActive = conv.id === activeConversationId;
              const isOnline = isConvOnline(conv);
              const hasUnread = conv.unread_count > 0;

              return (
                <button
                  key={conv.id}
                  style={{ ...styles.convItem, ...(isActive ? styles.convItemActive : {}) }}
                  onClick={() => setActiveConversation(conv.id)}
                >
                  <Avatar user={convUser} size={42} showStatus isOnline={isOnline} />
                  <div style={styles.convInfo}>
                    <div style={styles.convTop}>
                      <span style={{ ...styles.convName, ...(hasUnread ? styles.convNameBold : {}) }}>{name}</span>
                      {conv.last_message_at && (
                        <span style={styles.convTime}>
                          {formatDistanceToNow(new Date(conv.last_message_at * 1000), { addSuffix: false })
                            .replace('about ', '')
                            .replace('less than a minute', 'now')}
                        </span>
                      )}
                    </div>
                    <div style={styles.convBottom}>
                      <span style={{ ...styles.convPreview, ...(hasUnread ? styles.convPreviewBold : {}) }}>
                        {conv.last_message
                          ? (conv.last_sender_id === user?.id ? `You: ${conv.last_message}` : conv.last_message)
                          : <em>No messages yet</em>}
                      </span>
                      {hasUnread && (
                        <span style={styles.badge}>{conv.unread_count > 99 ? '99+' : conv.unread_count}</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}

      {/* Profile modal */}
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
    </aside>
  );
}

const styles = {
  sidebar: {
    width: 300,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-secondary)',
    borderRight: '1px solid var(--border)',
    height: '100%',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 16px 12px',
    borderBottom: '1px solid var(--border)',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  logoText: {
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: '-0.02em',
    color: 'var(--text-primary)',
  },
  headerActions: {
    display: 'flex',
    gap: 4,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 'var(--radius-sm)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-secondary)',
    transition: 'var(--transition)',
    ':hover': { background: 'var(--bg-hover)', color: 'var(--text-primary)' },
  },
  searchWrap: {
    position: 'relative',
    padding: '12px 12px 8px',
  },
  searchInput: {
    width: '100%',
    padding: '8px 32px 8px 36px',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)',
    fontSize: 13,
    transition: 'var(--transition)',
  },
  clearBtn: {
    position: 'absolute',
    right: 22,
    top: '50%',
    transform: 'translateY(-30%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-tertiary)',
    padding: 2,
  },
  searchResults: {
    flex: 1,
    overflowY: 'auto',
    padding: '4px 8px',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    padding: '4px 8px 8px',
  },
  emptySearch: {
    textAlign: 'center',
    color: 'var(--text-tertiary)',
    fontSize: 13,
    padding: '20px 0',
  },
  searchItem: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 10px',
    borderRadius: 'var(--radius-md)',
    transition: 'var(--transition)',
    textAlign: 'left',
  },
  searchItemInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  searchItemName: {
    fontSize: 14,
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  searchItemUser: {
    fontSize: 12,
    color: 'var(--text-secondary)',
  },
  convList: {
    flex: 1,
    overflowY: 'auto',
    padding: '4px 8px',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '60px 20px',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text-secondary)',
  },
  emptyText: {
    fontSize: 12,
    color: 'var(--text-tertiary)',
    textAlign: 'center',
  },
  convItem: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 10px',
    borderRadius: 'var(--radius-md)',
    transition: 'var(--transition)',
    textAlign: 'left',
    cursor: 'pointer',
  },
  convItemActive: {
    background: 'var(--bg-active)',
  },
  convInfo: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },
  convTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 4,
  },
  convName: {
    fontSize: 14,
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
  },
  convNameBold: {
    fontWeight: 600,
  },
  convTime: {
    fontSize: 11,
    color: 'var(--text-tertiary)',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  convBottom: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 4,
  },
  convPreview: {
    fontSize: 12,
    color: 'var(--text-secondary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
  },
  convPreviewBold: {
    color: 'var(--text-primary)',
    fontWeight: 500,
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    background: 'var(--accent)',
    color: '#fff',
    fontSize: 11,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 5px',
    flexShrink: 0,
  },
};
