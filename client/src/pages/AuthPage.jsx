import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ username: '', display_name: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, register } = useAuthStore();

  const update = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') await login(form.username, form.password);
      else await register(form.username, form.display_name, form.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Connection failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.root}>
      {/* Gradient blobs */}
      <div style={s.blob1} />
      <div style={s.blob2} />

      <div style={s.card}>
        {/* Logo */}
        <div style={s.logoRow}>
          <div style={s.logoIcon}>
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
              <path d="M4 20 Q9 10 14 20 Q19 30 24 20 Q29 10 29 16"
                stroke="white" strokeWidth="3" strokeLinecap="round" fill="none"/>
            </svg>
          </div>
          <span style={s.logoText}>Wave</span>
        </div>
        <p style={s.tagline}>Connect with anyone, anywhere</p>

        {/* Tabs */}
        <div style={s.tabs}>
          {['login', 'register'].map(m => (
            <button key={m}
              style={{ ...s.tab, ...(mode === m ? s.tabActive : {}) }}
              onClick={() => { setMode(m); setError(''); }}>
              {m === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        {/* Fields */}
        <form onSubmit={submit} style={s.form}>
          {mode === 'register' && (
            <Field label="Display Name">
              <input style={s.input} placeholder="Your name"
                value={form.display_name} onChange={update('display_name')} required />
            </Field>
          )}
          <Field label="Username">
            <input style={s.input} placeholder="e.g. john_doe"
              value={form.username} onChange={update('username')}
              autoCapitalize="none" autoCorrect="off" required />
          </Field>
          <Field label="Password">
            <input style={s.input} type="password" placeholder="••••••••"
              value={form.password} onChange={update('password')} required />
          </Field>

          {error && <div style={s.error}>⚠ {error}</div>}

          <button style={{ ...s.btn, opacity: loading ? 0.65 : 1 }}
            type="submit" disabled={loading}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p style={s.hint}>
          {mode === 'login' ? "No account? " : "Have an account? "}
          <button style={s.hintBtn}
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.55)',
        textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</label>
      {children}
    </div>
  );
}

const s = {
  root: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minHeight: '100vh', padding: 20,
    position: 'relative', overflow: 'hidden',
  },
  blob1: {
    position: 'fixed', width: 400, height: 400, borderRadius: '50%', pointerEvents: 'none',
    background: 'radial-gradient(circle, rgba(99,102,241,0.4) 0%, transparent 70%)',
    top: -180, left: -80,
  },
  blob2: {
    position: 'fixed', width: 350, height: 350, borderRadius: '50%', pointerEvents: 'none',
    background: 'radial-gradient(circle, rgba(139,92,246,0.3) 0%, transparent 70%)',
    bottom: -140, right: -80,
  },
  card: {
    width: '100%', maxWidth: 400,
    background: 'rgba(22, 18, 38, 0.96)',
    border: '1px solid rgba(255,255,255,0.18)',
    borderRadius: 24,
    padding: '36px 28px 28px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
    position: 'relative', zIndex: 1,
  },
  logoRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 10, marginBottom: 8,
  },
  logoIcon: {
    width: 48, height: 48, borderRadius: 14,
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 20px rgba(99,102,241,0.5)',
  },
  logoText: {
    fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em',
    background: 'linear-gradient(135deg, #818cf8, #c084fc)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  tagline: {
    textAlign: 'center', fontSize: 14,
    color: 'rgba(255,255,255,0.5)', marginBottom: 24,
  },
  tabs: {
    display: 'flex',
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 12, padding: 3, marginBottom: 22,
  },
  tab: {
    flex: 1, padding: '9px 0', borderRadius: 9,
    fontSize: 14, fontWeight: 500,
    color: 'rgba(255,255,255,0.45)', transition: '150ms ease',
    border: 'none', background: 'none', cursor: 'pointer',
  },
  tabActive: {
    background: 'rgba(99,102,241,0.4)',
    color: '#fff', fontWeight: 700,
    boxShadow: '0 2px 8px rgba(99,102,241,0.3)',
  },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  input: {
    width: '100%', padding: '12px 14px',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.16)',
    borderRadius: 10, color: '#fff', fontSize: 15,
    transition: '150ms ease',
  },
  error: {
    padding: '10px 14px', borderRadius: 10,
    background: 'rgba(248,113,113,0.15)',
    border: '1px solid rgba(248,113,113,0.35)',
    color: '#fca5a5', fontSize: 13, lineHeight: 1.5,
  },
  btn: {
    padding: '14px', marginTop: 4,
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#fff', border: 'none', borderRadius: 12,
    fontWeight: 700, fontSize: 15, cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(99,102,241,0.45)',
    letterSpacing: '-0.01em',
  },
  hint: {
    marginTop: 20, textAlign: 'center',
    fontSize: 13, color: 'rgba(255,255,255,0.45)',
  },
  hintBtn: {
    color: '#a5b4fc', fontWeight: 600, fontSize: 13,
    border: 'none', background: 'none', cursor: 'pointer',
  },
};
