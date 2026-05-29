import React, { useState, useEffect, useRef } from 'react';

// Wave BLE UUIDs
const WAVE_SERVICE  = '0000fee0-0000-1000-8000-00805f9b34fb';
const WAVE_CHAR_MSG = '0000fee1-0000-1000-8000-00805f9b34fb';

// ── Lazy BleClient loader ────────────────────────────────────────────────────
let _ble = null;
async function getBle() {
  if (_ble) return _ble;
  try {
    const mod = await import('@capacitor-community/bluetooth-le');
    _ble = mod.BleClient;
    return _ble;
  } catch (e) {
    throw new Error('BLE module load failed: ' + e.message);
  }
}

function encode(str) {
  return new DataView(new TextEncoder().encode(str).buffer);
}
function decode(dv) {
  try {
    const bytes = new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength);
    return new TextDecoder().decode(bytes);
  } catch { return ''; }
}

// ── Error Boundary ───────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(p) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(e) { return { err: e }; }
  render() {
    if (this.state.err) {
      return (
        <div style={{ padding: 24, color: '#fca5a5', background: '#0b0a14', minHeight: '100vh' }}>
          <h2 style={{ fontSize: 18, marginBottom: 12 }}>⚠ Startup Error</h2>
          <pre style={{ fontSize: 12, whiteSpace: 'pre-wrap', opacity: 0.8 }}>
            {this.state.err.toString()}
          </pre>
          <button onClick={() => window.location.reload()}
            style={{ marginTop: 16, padding: '10px 20px', background: '#6366f1',
              border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, cursor: 'pointer' }}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Main component ───────────────────────────────────────────────────────────
function BTTestInner() {
  const [myName, setMyName] = useState(localStorage.getItem('bt_name') || '');
  const [editingName, setEditingName] = useState(!localStorage.getItem('bt_name'));
  const [bleStatus, setBleStatus] = useState('idle'); // idle|ready|error|scanning|connecting|connected
  const [bleError, setBleError] = useState('');
  const [devices, setDevices] = useState([]);
  const [connected, setConnected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [log, setLog] = useState(['App started.']);
  const scanTimer = useRef(null);
  const bottomRef = useRef(null);

  const addLog = (msg) =>
    setLog(prev => [...prev.slice(-60), new Date().toLocaleTimeString('ru') + '  ' + msg]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behaviour: 'smooth' });
  }, [messages]);

  // ── Init BLE ──
  async function initBle() {
    setBleStatus('idle');
    setBleError('');
    addLog('Loading BLE module…');
    try {
      const BleClient = await getBle();
      addLog('Module loaded. Initialising…');
      await BleClient.initialize({ androidNeverForLocation: false });
      addLog('✓ Bluetooth ready');
      setBleStatus('ready');
    } catch (e) {
      const msg = e.message || String(e);
      addLog('✗ Init error: ' + msg);
      setBleError(msg);
      setBleStatus('error');
    }
  }

  // ── Scan ──
  async function startScan() {
    setBleError('');
    setDevices([]);
    setBleStatus('scanning');
    addLog('Starting scan…');
    try {
      const BleClient = await getBle();
      await BleClient.requestLEScan({ allowDuplicates: false }, (result) => {
        const name = result.device?.name || result.localName || result.device?.deviceId || 'Unknown';
        const rssi = result.rssi ?? null;
        addLog('Found: ' + name + (rssi ? ' (' + rssi + ' dBm)' : ''));
        setDevices(prev => {
          const id = result.device?.deviceId;
          if (!id) return prev;
          const exists = prev.find(d => d.deviceId === id);
          const updated = { deviceId: id, name, rssi };
          return exists ? prev.map(d => d.deviceId === id ? updated : d) : [...prev, updated];
        });
      });
      scanTimer.current = setTimeout(async () => {
        try { await BleClient.stopLEScan(); } catch {}
        setBleStatus('ready');
        addLog('Scan finished (15 s).');
      }, 15000);
    } catch (e) {
      const msg = e.message || String(e);
      addLog('✗ Scan error: ' + msg);
      setBleError(msg);
      setBleStatus('ready');
    }
  }

  async function stopScan() {
    clearTimeout(scanTimer.current);
    try { const BleClient = await getBle(); await BleClient.stopLEScan(); } catch {}
    setBleStatus('ready');
    addLog('Scan stopped.');
  }

  // ── Connect ──
  async function connectDevice(device) {
    clearTimeout(scanTimer.current);
    try { const BleClient = await getBle(); await BleClient.stopLEScan(); } catch {}
    setBleStatus('connecting');
    addLog('Connecting to ' + device.name + '…');
    try {
      const BleClient = await getBle();
      await BleClient.connect(device.deviceId, () => {
        addLog('Disconnected from ' + device.name);
        setConnected(null);
        setBleStatus('ready');
      });
      addLog('✓ Connected. Checking services…');

      // Try Wave service subscription
      try {
        const services = await BleClient.getServices(device.deviceId);
        const waveService = services.find(s =>
          s.uuid && s.uuid.toLowerCase().includes('fee0'));
        if (waveService) {
          addLog('✓ Wave BLE service found!');
          await BleClient.startNotifications(
            device.deviceId, WAVE_SERVICE, WAVE_CHAR_MSG,
            (dv) => {
              try {
                const raw = decode(dv);
                const msg = JSON.parse(raw);
                addLog('← ' + msg.from + ': ' + msg.content);
                setMessages(m => [...m, { ...msg, mine: false }]);
              } catch {
                addLog('← raw data received');
              }
            }
          );
          addLog('✓ Subscribed to messages');
        } else {
          addLog('⚠ No Wave service. Generic BLE device (can still test connect).');
        }
      } catch (e) {
        addLog('Note: service listing: ' + e.message);
      }

      setConnected(device);
      setBleStatus('connected');
      addLog('Ready.');
    } catch (e) {
      const msg = e.message || String(e);
      addLog('✗ Connect failed: ' + msg);
      setBleError(msg);
      setBleStatus('ready');
    }
  }

  async function disconnect() {
    if (!connected) return;
    try {
      const BleClient = await getBle();
      await BleClient.disconnect(connected.deviceId);
    } catch {}
    setConnected(null);
    setBleStatus('ready');
    addLog('Disconnected.');
  }

  async function sendMsg() {
    if (!text.trim() || !connected) return;
    const payload = { from: myName || 'Me', content: text.trim(), ts: Date.now() };
    try {
      const BleClient = await getBle();
      await BleClient.write(connected.deviceId, WAVE_SERVICE, WAVE_CHAR_MSG, encode(JSON.stringify(payload)));
      addLog('→ ' + payload.content);
      setMessages(m => [...m, { ...payload, mine: true }]);
    } catch (e) {
      addLog('✗ Send: ' + e.message + ' (saved locally)');
      setMessages(m => [...m, { ...payload, mine: true, failed: true }]);
    }
    setText('');
  }

  // ── Name screen ──────────────────────────────────────────────────────────
  if (editingName) {
    return (
      <div style={s.center}>
        <div style={s.card}>
          <Logo />
          <p style={s.h2}>Your Name</p>
          <p style={s.muted}>This name is sent to nearby devices over Bluetooth.</p>
          <input
            style={s.input}
            placeholder="Enter your name…"
            value={myName}
            autoFocus
            onChange={e => setMyName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && myName.trim()) {
                localStorage.setItem('bt_name', myName.trim());
                setEditingName(false);
              }
            }}
          />
          <button
            style={{ ...s.btnPrimary, opacity: myName.trim() ? 1 : 0.45 }}
            disabled={!myName.trim()}
            onClick={() => {
              localStorage.setItem('bt_name', myName.trim());
              setEditingName(false);
            }}>
            Continue →
          </button>
        </div>
      </div>
    );
  }

  // ── Chat screen ──────────────────────────────────────────────────────────
  if (bleStatus === 'connected' && connected) {
    return (
      <div style={s.page}>
        <div style={s.header}>
          <Logo small />
          <span style={s.btBadge}>🔵 BT</span>
          <button style={s.backBtn} onClick={disconnect}>✕ Disconnect</button>
        </div>

        <div style={s.chatHeader}>
          <span style={s.chatIcon}>📱</span>
          <div>
            <p style={s.chatName}>{connected.name}</p>
            <p style={s.onlineLabel}>● Connected via Bluetooth</p>
          </div>
        </div>

        <div style={s.messages}>
          {messages.length === 0 && (
            <p style={s.noMsg}>Connected! Send a test message 👇</p>
          )}
          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.mine ? 'flex-end' : 'flex-start', marginBottom: 6 }}>
              <div style={{ ...s.bubble, ...(m.mine ? s.bubbleMine : s.bubbleTheirs) }}>
                {!m.mine && <p style={s.bubbleFrom}>{m.from}</p>}
                <p style={s.bubbleText}>{m.content}</p>
                <p style={s.bubbleTime}>{new Date(m.ts).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}{m.failed ? ' ⚠' : ''}</p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div style={s.inputRow}>
          <input
            style={s.chatInput}
            placeholder="Message…"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMsg()}
          />
          <button
            style={{ ...s.sendBtn, opacity: text.trim() ? 1 : 0.35 }}
            disabled={!text.trim()}
            onClick={sendMsg}>▶
          </button>
        </div>

        <LogBox log={log} />
      </div>
    );
  }

  // ── Main scan screen ─────────────────────────────────────────────────────
  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <Logo small />
        <span style={s.btBadge}>🔵 Bluetooth Test</span>
        <button style={s.nameBtn} onClick={() => setEditingName(true)}>{myName} ✏</button>
      </div>

      {/* BLE status */}
      <div style={{ ...s.statusBar, background: statusBg(bleStatus) }}>
        <span style={{ ...s.statusDot, background: statusDotColor(bleStatus) }} />
        <span style={s.statusText}>{statusText(bleStatus)}</span>
      </div>

      {/* Error */}
      {bleError && (
        <div style={s.errorBox}>
          <p style={s.errorTitle}>⚠ BLE Error</p>
          <p style={s.errorMsg}>{bleError}</p>
          <p style={s.errorHint}>Check that Bluetooth is ON and the app has "Nearby devices" permission (Android 12+).</p>
        </div>
      )}

      {/* Controls */}
      <div style={s.body}>
        {bleStatus === 'idle' || bleStatus === 'error' ? (
          <button style={s.btnPrimary} onClick={initBle}>
            🔵 Initialise Bluetooth
          </button>
        ) : bleStatus === 'scanning' ? (
          <button style={s.btnStop} onClick={stopScan}>⏹ Stop Scan</button>
        ) : (
          <button style={s.btnPrimary} disabled={bleStatus === 'connecting'} onClick={startScan}>
            {bleStatus === 'connecting' ? 'Connecting…' : '🔍 Scan for Devices'}
          </button>
        )}

        {bleStatus === 'scanning' && devices.length === 0 && (
          <div style={s.pulse}>
            <div style={s.pulseCircle} />
            <p style={s.pulseText}>Scanning…</p>
            <p style={s.muted}>Turn Bluetooth ON on the other device</p>
          </div>
        )}

        {devices.length > 0 && (
          <>
            <p style={s.sectionLabel}>Found {devices.length} device(s)</p>
            {devices.map(d => (
              <div key={d.deviceId} style={s.deviceRow}>
                <span style={s.deviceIcon}>
                  {d.name.toLowerCase().includes('wave') ? '🌊' : '📱'}
                </span>
                <div style={s.deviceInfo}>
                  <p style={s.deviceName}>{d.name}</p>
                  <p style={s.deviceSub}>{d.deviceId.slice(0, 17)}{d.rssi ? '  •  ' + d.rssi + ' dBm' : ''}</p>
                </div>
                <button style={s.connectBtn} onClick={() => connectDevice(d)}>
                  Connect
                </button>
              </div>
            ))}
          </>
        )}

        {bleStatus === 'ready' && devices.length === 0 && (
          <div style={s.emptyState}>
            <p style={{ fontSize: 40 }}>🔵</p>
            <p style={s.emptyTitle}>Bluetooth Ready</p>
            <p style={s.muted}>Press "Scan for Devices" to find nearby phones</p>
          </div>
        )}
      </div>

      <LogBox log={log} />
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Logo({ small }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: small ? 6 : 10 }}>
      <div style={{
        width: small ? 28 : 46, height: small ? 28 : 46,
        borderRadius: small ? 8 : 13,
        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 3px 12px rgba(99,102,241,0.45)', flexShrink: 0,
      }}>
        <svg width={small ? 16 : 26} height={small ? 16 : 26} viewBox="0 0 32 32" fill="none">
          <path d="M4 20 Q9 10 14 20 Q19 30 24 20 Q29 10 29 16"
            stroke="white" strokeWidth="3" strokeLinecap="round" fill="none"/>
        </svg>
      </div>
      <span style={{
        fontSize: small ? 17 : 28, fontWeight: 800, letterSpacing: '-0.02em',
        background: 'linear-gradient(135deg, #818cf8, #c084fc)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
      }}>Wave</span>
    </div>
  );
}

function LogBox({ log }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [log]);
  return (
    <div style={s.logBox}>
      <p style={s.logLabel}>LOG</p>
      <div ref={ref} style={s.logScroll}>
        {log.map((l, i) => <p key={i} style={s.logLine}>{l}</p>)}
      </div>
    </div>
  );
}

function statusText(st) {
  switch (st) {
    case 'idle': return 'Bluetooth not initialised';
    case 'ready': return 'Bluetooth ready';
    case 'scanning': return 'Scanning for devices…';
    case 'connecting': return 'Connecting…';
    case 'connected': return 'Connected';
    case 'error': return 'Bluetooth error';
    default: return st;
  }
}
function statusBg(st) {
  if (st === 'connected') return 'rgba(52,211,153,0.14)';
  if (st === 'scanning' || st === 'connecting') return 'rgba(251,191,36,0.12)';
  if (st === 'error') return 'rgba(248,113,113,0.12)';
  if (st === 'ready') return 'rgba(129,140,248,0.10)';
  return 'rgba(255,255,255,0.04)';
}
function statusDotColor(st) {
  if (st === 'connected') return '#34d399';
  if (st === 'scanning' || st === 'connecting') return '#fbbf24';
  if (st === 'error') return '#f87171';
  if (st === 'ready') return '#818cf8';
  return '#6b7280';
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  page: {
    display: 'flex', flexDirection: 'column', height: '100vh',
    background: '#0b0a14', color: '#fff',
    fontFamily: "'Inter', -apple-system, sans-serif",
    overflow: 'hidden',
  },
  center: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minHeight: '100vh', background: '#0b0a14', padding: 20,
  },
  card: {
    width: '100%', maxWidth: 400, padding: '34px 24px 26px',
    background: 'rgba(22,18,38,0.98)',
    border: '1px solid rgba(255,255,255,0.15)', borderRadius: 22,
    boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
    display: 'flex', flexDirection: 'column', gap: 14,
  },
  h2: { fontSize: 18, fontWeight: 700, textAlign: 'center' },
  muted: { fontSize: 12, color: 'rgba(255,255,255,0.42)', textAlign: 'center', lineHeight: 1.6 },
  input: {
    padding: '13px 14px',
    background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.17)',
    borderRadius: 12, color: '#fff', fontSize: 16, width: '100%',
  },
  btnPrimary: {
    width: '100%', padding: '15px',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    border: 'none', borderRadius: 14, color: '#fff',
    fontWeight: 700, fontSize: 15, cursor: 'pointer',
    boxShadow: '0 4px 18px rgba(99,102,241,0.4)',
  },
  btnStop: {
    width: '100%', padding: '15px',
    background: 'rgba(248,113,113,0.14)', border: '1px solid rgba(248,113,113,0.38)',
    borderRadius: 14, color: '#fca5a5', fontWeight: 700, fontSize: 15, cursor: 'pointer',
  },

  header: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px 10px',
    background: 'rgba(22,18,38,0.98)', borderBottom: '1px solid rgba(255,255,255,0.09)',
    flexShrink: 0,
  },
  btBadge: {
    fontSize: 11, fontWeight: 700, padding: '2px 8px',
    background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(129,140,248,0.38)',
    borderRadius: 99, color: '#a5b4fc', flexShrink: 0,
  },
  nameBtn: {
    marginLeft: 'auto', fontSize: 12, color: '#a5b4fc',
    background: 'rgba(129,140,248,0.10)', border: '1px solid rgba(129,140,248,0.25)',
    borderRadius: 8, padding: '3px 10px', cursor: 'pointer', whiteSpace: 'nowrap',
  },
  backBtn: {
    marginLeft: 'auto', fontSize: 12, color: '#fca5a5',
    background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.28)',
    borderRadius: 8, padding: '4px 10px', cursor: 'pointer',
  },

  statusBar: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px',
    flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.07)',
  },
  statusDot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  statusText: { fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.78)' },

  errorBox: {
    margin: '10px 14px', padding: '14px 16px',
    background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.3)',
    borderRadius: 14,
  },
  errorTitle: { fontSize: 14, fontWeight: 700, color: '#fca5a5', marginBottom: 5 },
  errorMsg: { fontSize: 12, color: '#fca5a5', lineHeight: 1.5, marginBottom: 6 },
  errorHint: { fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 },

  body: {
    flex: 1, overflowY: 'auto', padding: '14px 14px 10px',
    display: 'flex', flexDirection: 'column', gap: 10,
  },
  sectionLabel: {
    fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.07em', color: 'rgba(255,255,255,0.42)',
  },
  deviceRow: {
    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)',
    borderRadius: 14,
  },
  deviceIcon: { fontSize: 22, flexShrink: 0 },
  deviceInfo: { flex: 1, minWidth: 0 },
  deviceName: {
    fontSize: 14, fontWeight: 600, color: '#fff',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  deviceSub: { fontSize: 11, color: 'rgba(255,255,255,0.42)', marginTop: 2, fontFamily: 'monospace' },
  connectBtn: {
    flexShrink: 0, padding: '8px 14px',
    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none',
    borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
  },
  pulse: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '30px 0',
  },
  pulseCircle: {
    width: 56, height: 56, borderRadius: '50%',
    border: '3px solid #818cf8', opacity: 0.7,
    animation: 'pulse-bt 1.4s ease-out infinite',
  },
  pulseText: { fontSize: 15, fontWeight: 600, color: '#a5b4fc' },
  emptyState: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, paddingTop: 40,
  },
  emptyTitle: { fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.65)' },

  chatHeader: {
    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
    background: 'rgba(22,18,38,0.95)', borderBottom: '1px solid rgba(255,255,255,0.09)',
    flexShrink: 0,
  },
  chatIcon: { fontSize: 26, flexShrink: 0 },
  chatName: { fontSize: 15, fontWeight: 700, color: '#fff' },
  onlineLabel: { fontSize: 12, color: '#34d399', marginTop: 2 },
  messages: {
    flex: 1, overflowY: 'auto', padding: '10px 14px',
    display: 'flex', flexDirection: 'column',
  },
  noMsg: { textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: 13, paddingTop: 30 },
  bubble: { maxWidth: '78%', padding: '9px 13px', borderRadius: 18, wordBreak: 'break-word' },
  bubbleMine: {
    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderBottomRightRadius: 4,
    boxShadow: '0 2px 10px rgba(99,102,241,0.35)',
  },
  bubbleTheirs: {
    background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.11)',
    borderBottomLeftRadius: 4,
  },
  bubbleFrom: { fontSize: 10, fontWeight: 700, color: '#a5b4fc', marginBottom: 3 },
  bubbleText: { fontSize: 14, lineHeight: 1.45, color: '#fff' },
  bubbleTime: { fontSize: 10, opacity: 0.45, textAlign: 'right', marginTop: 3 },
  inputRow: {
    display: 'flex', gap: 8, padding: '10px 14px 14px',
    background: 'rgba(22,18,38,0.97)', borderTop: '1px solid rgba(255,255,255,0.09)',
    flexShrink: 0,
  },
  chatInput: {
    flex: 1, padding: '12px 14px',
    background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: 12, color: '#fff', fontSize: 15,
  },
  sendBtn: {
    width: 46, height: 46, flexShrink: 0,
    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none',
    borderRadius: 12, color: '#fff', fontWeight: 800, fontSize: 18, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },

  logBox: {
    flexShrink: 0, maxHeight: 110,
    background: 'rgba(0,0,0,0.55)', borderTop: '1px solid rgba(255,255,255,0.07)',
    padding: '6px 12px 8px',
  },
  logLabel: {
    fontSize: 9, fontWeight: 800, letterSpacing: '0.1em',
    color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', marginBottom: 3,
  },
  logScroll: { overflowY: 'auto', maxHeight: 88 },
  logLine: {
    fontSize: 11, color: 'rgba(255,255,255,0.55)',
    lineHeight: 1.55, fontFamily: 'monospace', whiteSpace: 'pre-wrap',
  },
};

// ── Export wrapped in boundary ─────────────────────────────────────────────
export default function BTTestPage() {
  return (
    <ErrorBoundary>
      <BTTestInner />
    </ErrorBoundary>
  );
}
