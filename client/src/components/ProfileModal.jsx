import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import Avatar from './Avatar';
import { XIcon } from './Icons';

export default function ProfileModal({ onClose }) {
  const { user, updateProfile } = useAuthStore();
  const [form, setForm] = useState({ display_name: user?.display_name || '', bio: user?.bio || '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const update = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await updateProfile(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>Profile</h2>
          <button style={styles.closeBtn} onClick={onClose}><XIcon size={18} /></button>
        </div>

        <div style={styles.avatarSection}>
          <Avatar user={user} size={72} />
          <div>
            <p style={styles.displayName}>{user?.display_name}</p>
            <p style={styles.username}>@{user?.username}</p>
          </div>
        </div>

        <div style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Display Name</label>
            <input style={styles.input} value={form.display_name} onChange={update('display_name')} />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Bio</label>
            <textarea
              style={{ ...styles.input, height: 80, resize: 'none' }}
              placeholder="Tell something about yourself…"
              value={form.bio}
              onChange={update('bio')}
            />
          </div>
          {error && <p style={styles.error}>{error}</p>}
          <button style={styles.saveBtn} onClick={save} disabled={saving}>
            {saved ? '✓ Saved!' : saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(4px)',
  },
  modal: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-xl)',
    width: '100%',
    maxWidth: 380,
    padding: 28,
    boxShadow: 'var(--shadow-lg)',
    margin: 20,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  closeBtn: {
    width: 30,
    height: 30,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-secondary)',
  },
  avatarSection: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
    padding: '16px',
    background: 'var(--bg-tertiary)',
    borderRadius: 'var(--radius-md)',
  },
  displayName: {
    fontSize: 16,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  username: {
    fontSize: 13,
    color: 'var(--text-secondary)',
    marginTop: 2,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--text-secondary)',
  },
  input: {
    padding: '9px 12px',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    fontSize: 14,
  },
  error: {
    color: 'var(--danger)',
    fontSize: 12,
  },
  saveBtn: {
    padding: '10px',
    background: 'var(--accent)',
    color: '#fff',
    borderRadius: 'var(--radius-sm)',
    fontWeight: 600,
    fontSize: 14,
    cursor: 'pointer',
    marginTop: 4,
  },
};
