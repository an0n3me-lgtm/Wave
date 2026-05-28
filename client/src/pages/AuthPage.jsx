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
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.root}>
      {/* Background blobs */}
      <div style={s.blob1} />
      <div style={s.blob2} />
      <div style={s.blob3} />

      <div style={s.card} className="glass">
        {/* Logo */}
        <div style={s.logoWrap}>
          <div style={s.logoIcon}>
            <svg width="36" height="36" viewBox="0 0 32 32" fill="none">
              <path d="M4 20 Q9 10 14 20 Q19 30 24 20 Q29 10 29 16" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none"/>
            </svg>
          </div>
          <h1 style={s.title} className="gradient-text">Wave</h1>
        </div>
        <p style={s.subtitle}>Connect with anyone, anywhere</p>

        {/* Tabs */}
        <div style={s.tabs} className="glass-sm">
          {['login', 'register'].map(m => (
            <button
              key={m}
              style={{ ...s.tab, ...(mode === m ? s.tabActive : {}) }}
              onClick={() => { setMode(m); setError(''); }}
            >
              {m === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={submit} style={s.form}>
          {mode === 'register' && (
            <Field label="Display Name">
              <input style={s.input} className="glass-sm" placeholder="Your name" value={form.display_name} onChange={update('display_name')} required />
            </Field>
          )}
          <Field label="Username">
            <input style={s.input} className="glass-sm" placeholder="e.g. john_doe" value={form.username} onChange={update('username')} autoCapitalize="none" autoCorrect="off" required />
          </Field>
          <Field label="Password">
            <input style={s.input} className="glass-sm" type="password" placeholder="••••••••" value={form.password} onChange={update('password')} required />
          </Field>

          {error && (
            <div style={s.error} className="glass-sm">
              <span>⚠</span> {error}
            </div>
          )}

          <button style={{ ...s.btn, ...(loading ? s.btnDisabled : {}) }} type="submit" disabled={loading}>
            {loading ? (
              <span style={s.loadingDots}><span>·</span><span>·</span><span>·</span></span>
            ) : (
              mode === 'login' ? 'Sign In' : 'Create Account'
            )}
          </button>
        </form>

        <p style={s.hint}>
          {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button style={s.hintLink} onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
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
      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const s = {
  root: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  blob1: {
    position: 'fixed', width: 500, height: 500,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(99,102,241,0.35) 0%, transparent 70%)',
    top: '-200px', left: '-100px', pointerEvents: 'none',
  },
  blob2: {
    position: 'fixed', width: 400, height: 400,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(139,92,246,0.25) 0%, transparent 70%)',
    bottom: '-150px', right: '-100px', pointerEvents: 'none',
  },
  blob3: {
    position: 'fixed', width: 300, height: 300,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(56,189,248,0.15) 0%, transparent 70%)',
    top: '50%', left: '60%', pointerEvents: 'none',
  },
  card: {
    width: '100%', maxWidth: 400,
    borderRadius: 'var(--radius-xl)',
    padding: '40px 36px',
    position: 'relative', zIndex: 1,
  },
  logoWrap: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 8,
  },
  logoIcon: {
    width: 52, height: 52, borderRadius: 16,
    background: 'var(--accent-gradient)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 20px var(--accent-glow)',
  },
  title: {
    fontSize: 36, fontWeight: 800, letterSpacing: '-0.03em',
  },
  subtitle: {
    textAlign: 'center', fontSize: 14, color: 'var(--text-secondary)', marginBottom: 28,
  },
  tabs: {
    display: 'flex', borderRadius: 'var(--radius-md)', padding: 4, marginBottom: 24,
  },
  tab: {
    flex: 1, padding: '9px 0', borderRadius: 'calc(var(--radius-md) - 2px)',
    fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)',
    transition: 'var(--transition)',
  },
  tabActive: {
    background: 'rgba(255,255,255,0.12)',
    color: 'var(--text-primary)',
    fontWeight: 600,
  },
  form: {
    display: 'flex', flexDirection: 'column', gap: 16,
  },
  input: {
    width: '100%', padding: '11px 14px',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)',
    fontSize: 14,
    border: '1px solid var(--glass-border)',
    transition: 'var(--transition)',
  },
  error: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 14px',
    borderRadius: 'var(--radius-md)',
    color: 'var(--danger)',
    fontSize: 13,
    border: '1px solid rgba(248,113,113,0.3)',
    background: 'rgba(248,113,113,0.08) !important',
  },
  btn: {
    padding: '13px',
    background: 'var(--accent-gradient)',
    color: '#fff',
    borderRadius: 'var(--radius-md)',
    fontWeight: 700,
    fontSize: 15,
    marginTop: 4,
    transition: 'var(--transition)',
    boxShadow: '0 4px 20px var(--accent-glow)',
    border: 'none',
    cursor: 'pointer',
    letterSpacing: '-0.01em',
  },
  btnDisabled: {
    opacity: 0.6, cursor: 'not-allowed',
  },
  loadingDots: {
    display: 'flex', gap: 4, justifyContent: 'center', alignItems: 'center',
  },
  hint: {
    marginTop: 22, textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)',
  },
  hintLink: {
    color: 'var(--text-accent)', fontWeight: 600, fontSize: 13, cursor: 'pointer',
  },
};
