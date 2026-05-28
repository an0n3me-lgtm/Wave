import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { WaveIcon } from '../components/Icons';

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
      if (mode === 'login') {
        await login(form.username, form.password);
      } else {
        await register(form.username, form.display_name, form.password);
      }
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.root}>
      <div style={styles.card}>
        <div style={styles.header}>
          <WaveIcon size={48} />
          <h1 style={styles.title}>Wave</h1>
          <p style={styles.subtitle}>Connect with anyone, instantly</p>
        </div>

        <div style={styles.tabs}>
          <button style={{ ...styles.tab, ...(mode === 'login' ? styles.tabActive : {}) }} onClick={() => { setMode('login'); setError(''); }}>
            Sign In
          </button>
          <button style={{ ...styles.tab, ...(mode === 'register' ? styles.tabActive : {}) }} onClick={() => { setMode('register'); setError(''); }}>
            Sign Up
          </button>
        </div>

        <form onSubmit={submit} style={styles.form}>
          {mode === 'register' && (
            <div style={styles.field}>
              <label style={styles.label}>Display Name</label>
              <input
                style={styles.input}
                placeholder="Your name"
                value={form.display_name}
                onChange={update('display_name')}
                required
              />
            </div>
          )}
          <div style={styles.field}>
            <label style={styles.label}>Username</label>
            <input
              style={styles.input}
              placeholder="e.g. john_doe"
              value={form.username}
              onChange={update('username')}
              autoCapitalize="none"
              autoCorrect="off"
              required
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              style={styles.input}
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={update('password')}
              required
            />
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button style={{ ...styles.btn, ...(loading ? styles.btnDisabled : {}) }} type="submit" disabled={loading}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {mode === 'login' && (
          <p style={styles.hint}>
            Don't have an account?{' '}
            <button style={styles.link} onClick={() => { setMode('register'); setError(''); }}>Sign up</button>
          </p>
        )}
      </div>
    </div>
  );
}

const styles = {
  root: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'var(--bg-primary)',
    padding: 20,
  },
  card: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-xl)',
    padding: '40px 36px',
    width: '100%',
    maxWidth: 400,
    boxShadow: 'var(--shadow-lg)',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    letterSpacing: '-0.02em',
    color: 'var(--text-primary)',
  },
  subtitle: {
    fontSize: 13,
    color: 'var(--text-secondary)',
  },
  tabs: {
    display: 'flex',
    background: 'var(--bg-tertiary)',
    borderRadius: 'var(--radius-md)',
    padding: 3,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    padding: '8px 0',
    borderRadius: 'calc(var(--radius-md) - 2px)',
    fontSize: 14,
    fontWeight: 500,
    color: 'var(--text-secondary)',
    transition: 'var(--transition)',
  },
  tabActive: {
    background: 'var(--bg-active)',
    color: 'var(--text-primary)',
    boxShadow: 'var(--shadow-sm)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  input: {
    padding: '10px 14px',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    fontSize: 14,
    transition: 'var(--transition)',
  },
  error: {
    color: 'var(--danger)',
    fontSize: 13,
    padding: '8px 12px',
    background: 'rgba(239,68,68,0.1)',
    borderRadius: 'var(--radius-sm)',
  },
  btn: {
    padding: '12px',
    background: 'var(--accent)',
    color: '#fff',
    borderRadius: 'var(--radius-sm)',
    fontWeight: 600,
    fontSize: 15,
    marginTop: 4,
    transition: 'var(--transition)',
  },
  btnDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  hint: {
    marginTop: 20,
    textAlign: 'center',
    fontSize: 13,
    color: 'var(--text-secondary)',
  },
  link: {
    color: 'var(--text-accent)',
    fontWeight: 500,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 13,
  },
};
