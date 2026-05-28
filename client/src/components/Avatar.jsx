import React from 'react';

export default function Avatar({ user, size = 36, showStatus = false, isOnline = false }) {
  const initials = (user?.display_name || user?.username || '?')
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const color = user?.avatar_color || '#6366f1';

  return (
    <div style={{ position: 'relative', display: 'inline-block', flexShrink: 0 }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size * 0.38,
          fontWeight: 700,
          color: '#fff',
          letterSpacing: '-0.02em',
          userSelect: 'none',
          boxShadow: `0 2px 10px ${color}66`,
        }}
      >
        {initials}
      </div>
      {showStatus && (
        <span
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: size * 0.28,
            height: size * 0.28,
            borderRadius: '50%',
            background: isOnline ? 'var(--success)' : 'rgba(255,255,255,0.2)',
            border: `${Math.max(2, size * 0.05)}px solid rgba(10,8,20,0.9)`,
            boxShadow: isOnline ? '0 0 6px var(--success)' : 'none',
          }}
        />
      )}
    </div>
  );
}
