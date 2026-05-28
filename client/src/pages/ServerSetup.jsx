import React, { useState } from 'react';

export default function ServerSetup({ onDone }) {
  const [url, setUrl] = useState(localStorage.getItem('wave_server_url') || '');
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState(null); // 'ok' | 'error' | null

  const test = async (targetUrl) => {
    setTesting(true);
    setStatus(null);
    try {
      const res = await fetch(`${targetUrl}/api/auth/ping`).catch(() => null);
      // Any response (even 404) means the server is reachable
      if (res) {
        setStatus('ok');
        return true;
      }
    } catch {}
    setStatus('error');
    setTesting(false);
    return false;
  };

  const save = async () => {
    const trimmed = url.trim().replace(/\/$/, '');
    if (!trimmed) return;
    localStorage.setItem('wave_server_url', trimmed);
    onDone();
  };

  return (
    <div style={s.root}>
      <div style={s.card}>
        <div style={s.logoRow}>
          <div style={s.logoIcon}>
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
              <path d="M4 20 Q9 10 14 20 Q19 30 24 20 Q29 10 29 16"
                stroke="white" strokeWidth="3" strokeLinecap="round" fill="none"/>
            </svg>
          </div>
          <span style={s.logoText}>Wave</span>
        </div>

        <p style={s.heading}>Connect to Server</p>
        <p style={s.desc}>
          Enter the address of your Wave server to get started. If you're running
          it on your computer, use its local IP (e.g. <code style={s.code}>192.168.1.x:3001</code>).
        </p>

        <div style={s.field}>
          <label style={s.label}>Server URL</label>
          <input
            style={s.input}
            placeholder="http://192.168.1.100:3001"
            value={url}
            onChange={e => { setUrl(e.target.value); setStatus(null); }}
            autoCapitalize="none"
            autoCorrect="off"
            type="url"
          />
        </div>

        {status === 'ok' && (
          <div style={{ ...s.banner, background: 'rgba(52,211,153,0.15)', borderColor: 'rgba(52,211,153,0.4)', color: '#6ee7b7' }}>
            ✓ Server reachable
          </div>
        )}
        {status === 'error' && (
          <div style={{ ...s.banner, background: 'rgba(248,113,113,0.12)', borderColor: 'rgba(248,113,113,0.3)', color: '#fca5a5' }}>
            ✗ Could not reach server — check the URL and make sure the server is running
          </div>
        )}

        <div style={s.btns}>
          <button style={s.testBtn} disabled={!url.trim() || testing}
            onClick={() => test(url.trim().replace(/\/$/, ''))}>
            {testing ? 'Testing…' : 'Test Connection'}
          </button>
          <button style={s.saveBtn} disabled={!url.trim()} onClick={save}>
            Continue →
          </button>
        </div>

        <div style={s.divider}><span style={s.dividerText}>or</span></div>

        <button style={s.p2pBtn} onClick={() => {
          // Use P2P-only mode (no server)
          localStorage.removeItem('wave_server_url');
          localStorage.removeItem('wave_token');
          localStorage.removeItem('wave_user');
          onDone();
        }}>
          📡 Use Offline / Nearby Mode
        </button>
        <p style={s.p2pNote}>Chat with nearby Wave users via WiFi or Bluetooth — no server needed.</p>
      </div>
    </div>
  );
}

const s = {
  root: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minHeight: '100vh', padding: 20, overflow: 'hidden', position: 'relative',
  },
  card: {
    width: '100%', maxWidth: 420,
    background: 'rgba(22, 18, 38, 0.97)',
    border: '1px solid rgba(255,255,255,0.16)',
    borderRadius: 24, padding: '32px 26px 26px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
    position: 'relative', zIndex: 1,
  },
  logoRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 10, marginBottom: 20,
  },
  logoIcon: {
    width: 44, height: 44, borderRadius: 12,
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 16px rgba(99,102,241,0.45)',
  },
  logoText: {
    fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em',
    background: 'linear-gradient(135deg, #818cf8, #c084fc)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  heading: {
    fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 10,
    textAlign: 'center',
  },
  desc: {
    fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6,
    marginBottom: 20, textAlign: 'center',
  },
  code: {
    background: 'rgba(255,255,255,0.10)', padding: '1px 5px',
    borderRadius: 4, fontFamily: 'monospace', fontSize: 12,
    color: '#a5b4fc',
  },
  field: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 },
  label: {
    fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase', letterSpacing: '0.07em',
  },
  input: {
    padding: '12px 14px',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.16)',
    borderRadius: 10, color: '#fff', fontSize: 15,
    transition: '150ms ease', width: '100%',
  },
  banner: {
    padding: '10px 14px', borderRadius: 10,
    border: '1px solid', fontSize: 13, marginBottom: 14, lineHeight: 1.5,
  },
  btns: { display: 'flex', gap: 10 },
  testBtn: {
    flex: 1, padding: '12px',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.16)',
    borderRadius: 10, color: 'rgba(255,255,255,0.8)',
    fontWeight: 600, fontSize: 14, cursor: 'pointer',
  },
  saveBtn: {
    flex: 1, padding: '12px',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    border: 'none', borderRadius: 10,
    color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(99,102,241,0.4)',
  },
  divider: {
    display: 'flex', alignItems: 'center', gap: 12,
    margin: '18px 0', color: 'rgba(255,255,255,0.2)', fontSize: 12,
  },
  dividerText: {
    flex: 1, textAlign: 'center',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    paddingTop: 0, position: 'relative',
  },
  p2pBtn: {
    width: '100%', padding: '12px',
    background: 'rgba(56,189,248,0.12)',
    border: '1px solid rgba(56,189,248,0.3)',
    borderRadius: 10, color: '#7dd3fc',
    fontWeight: 600, fontSize: 14, cursor: 'pointer',
    marginBottom: 8,
  },
  p2pNote: {
    fontSize: 11, color: 'rgba(255,255,255,0.35)',
    textAlign: 'center', lineHeight: 1.5,
  },
};
