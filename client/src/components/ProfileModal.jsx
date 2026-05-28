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
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.modal} className="glass">
        <div style={s.header}>
          <h2 style={s.title}>Profile</h2>
          <button style={s.closeBtn} onClick={onClose}><XIcon size={17} /></button>
        </div>

        <div style={s.avatarSection} className="glass-sm">
          <Avatar user={user} size={64} />
          <div>
            <p style={s.displayName}>{user?.display_name}</p>
            <p style={s.username}>@{user?.username}</p>
            {user?.bio && <p style={s.bio}>{user.bio}</p>}
          </div>
        </div>

        <div style={s.form}>
          {[['Display Name', 'display_name', 'text', 'Your name'], ['Bio', 'bio', 'textarea', 'Tell something about yourself…']].map(([label, key, type, ph]) => (
            <div key={key} style={s.field}>
              <label style={s.label}>{label}</label>
              {type === 'textarea'
                ? <textarea style={{ ...s.input, height: 72, resize: 'none' }} className="glass-sm" placeholder={ph} value={form[key]} onChange={update(key)} />
                : <input style={s.input} className="glass-sm" placeholder={ph} value={form[key]} onChange={update(key)} />
              }
            </div>
          ))}

          {error && <p style={s.error}>{error}</p>}

          <button style={s.saveBtn} onClick={save} disabled={saving}>
            {saved ? '✓ Saved!' : saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

const s = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, backdropFilter: 'blur(8px)',
  },
  modal: {
    width: '100%', maxWidth: 380,
    borderRadius: 'var(--radius-xl)',
    padding: '28px 28px 24px',
    margin: 20,
    border: '1px solid var(--glass-border-strong)',
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' },
  closeBtn: {
    width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center',
    justifyContent: 'center', color: 'var(--text-secondary)',
  },
  avatarSection: {
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '14px', borderRadius: 'var(--radius-md)',
    border: '1px solid var(--glass-border)', marginBottom: 18,
  },
  displayName: { fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' },
  username: { fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 },
  bio: { fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4, fontStyle: 'italic' },
  form: { display: 'flex', flexDirection: 'column', gap: 14 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' },
  input: {
    padding: '9px 12px',
    borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)',
    color: 'var(--text-primary)', fontSize: 14,
  },
  error: { color: 'var(--danger)', fontSize: 12 },
  saveBtn: {
    padding: '11px', background: 'var(--accent-gradient)', color: '#fff',
    borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: 14, cursor: 'pointer',
    boxShadow: '0 4px 16px var(--accent-glow)', border: 'none', marginTop: 4,
  },
};
