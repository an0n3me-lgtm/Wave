import React, { useState, useEffect, useRef } from 'react';
import { BleClient, numberToUUID } from '@capacitor-community/bluetooth-le';

// Wave BLE identifiers
const WAVE_SERVICE  = '0000fee0-0000-1000-8000-00805f9b34fb';
const WAVE_CHAR_MSG = '0000fee1-0000-1000-8000-00805f9b34fb';
const WAVE_CHAR_ADV = '0000fee2-0000-1000-8000-00805f9b34fb';

function encode(str) {
  return new DataView(new TextEncoder().encode(str).buffer);
}
function decode(dataView) {
  const bytes = new Uint8Array(dataView.buffer, dataView.byteOffset, dataView.byteLength);
  return new TextDecoder().decode(bytes);
}

export default function BTTestPage() {
  const [myName, setMyName] = useState(localStorage.getItem('bt_name') || '');
  const [nameEdit, setNameEdit] = useState(!localStorage.getItem('bt_name'));
  const [status, setStatus] = useState('idle'); // idle|init|scanning|connected|error
  const [error, setError] = useState('');
  const [devices, setDevices] = useState([]); // [{deviceId, name, rssi}]
  const [connected, setConnected] = useState(null); // {deviceId, name}
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [log, setLog] = useState([]);
  const bottomRef = useRef(null);
  const scanTimeout = useRef(null);

  const addLog = (msg) => setLog(l => [...l.slice(-40), `${new Date().toLocaleTimeString()} ${msg}`]);

  // Auto-scroll messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Init BLE on mount
  useEffect(() => {
    initBle();
    return () => {
      clearTimeout(scanTimeout.current);
      try { BleClient.stopLEScan(); } catch {}
    };
  }, []);

  async function initBle() {
    try {
      setStatus('init');
      addLog('Initialising Bluetooth…');
      await BleClient.initialize({ androidNeverForLocation: false });
      addLog('✓ BLE ready');
      setStatus('idle');
    } catch (e) {
      setError(e.message || String(e));
      setStatus('error');
      addLog('✗ BLE init failed: ' + (e.message || e));
    }
  }

  async function startScan() {
    setDevices([]);
    setStatus('scanning');
    addLog('Scanning for BLE devices…');
    try {
      await BleClient.requestLEScan(
        { allowDuplicates: false },
        (result) => {
          const name = result.device.name || result.localName || result.device.deviceId;
          addLog(`Found: ${name} (RSSI ${result.rssi ?? '?'} dBm)`);
          setDevices(prev => {
            const exists = prev.find(d => d.deviceId === result.device.deviceId);
            if (exists) {
              return prev.map(d => d.deviceId === result.device.deviceId
                ? { ...d, rssi: result.rssi, name }
                : d);
            }
            return [...prev, { deviceId: result.device.deviceId, name, rssi: result.rssi }];
          });
        }
      );
      // Auto-stop after 15 s
      scanTimeout.current = setTimeout(() => {
        BleClient.stopLEScan().catch(() => {});
        setStatus('idle');
        addLog('Scan finished.');
      }, 15000);
    } catch (e) {
      setStatus('error');
      setError(e.message || String(e));
      addLog('✗ Scan error: ' + (e.message || e));
    }
  }

  async function stopScan() {
    clearTimeout(scanTimeout.current);
    try { await BleClient.stopLEScan(); } catch {}
    setStatus('idle');
    addLog('Scan stopped.');
  }

  async function connectDevice(device) {
    addLog(`Connecting to ${device.name}…`);
    setStatus('connecting');
    try {
      await BleClient.connect(device.deviceId, () => {
        addLog(`Disconnected from ${device.name}`);
        setConnected(null);
        setStatus('idle');
      });

      addLog('✓ Connected. Looking for Wave service…');

      // Try to get Wave service
      try {
        const services = await BleClient.getServices(device.deviceId);
        const hasWave = services.some(s => s.uuid.toLowerCase().includes('fee0'));
        addLog(hasWave ? '✓ Wave service found!' : '⚠ Wave service not found (generic device)');

        if (hasWave) {
          // Subscribe to incoming messages
          await BleClient.startNotifications(device.deviceId, WAVE_SERVICE, WAVE_CHAR_MSG, (dv) => {
            try {
              const raw = decode(dv);
              const msg = JSON.parse(raw);
              addLog(`← ${msg.from}: ${msg.content}`);
              setMessages(m => [...m, { ...msg, mine: false }]);
            } catch {
              addLog(`← raw: ${decode(dv)}`);
            }
          });
        }
      } catch (e) {
        addLog('Note: could not enumerate services: ' + e.message);
      }

      setConnected(device);
      setStatus('connected');
      addLog('✓ Ready to chat');
    } catch (e) {
      setStatus('idle');
      addLog('✗ Connect failed: ' + (e.message || e));
    }
  }

  async function disconnect() {
    if (!connected) return;
    try {
      await BleClient.disconnect(connected.deviceId);
    } catch {}
    setConnected(null);
    setStatus('idle');
    addLog('Disconnected.');
  }

  async function sendMessage() {
    if (!text.trim() || !connected) return;
    const payload = { from: myName || 'Me', content: text.trim(), ts: Date.now() };
    const msg = { ...payload, mine: true };
    try {
      await BleClient.write(connected.deviceId, WAVE_SERVICE, WAVE_CHAR_MSG, encode(JSON.stringify(payload)));
      addLog(`→ ${payload.content}`);
      setMessages(m => [...m, msg]);
      setText('');
    } catch (e) {
      addLog('✗ Send failed: ' + (e.message || e));
      // Still show it locally
      setMessages(m => [...m, { ...msg, failed: true }]);
      setText('');
    }
  }

  const saveName = () => {
    localStorage.setItem('bt_name', myName.trim() || 'Unknown');
    setNameEdit(false);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (nameEdit || !myName) {
    return (
      <div style={p.root}>
        <div style={p.card}>
          <div style={p.logoRow}>
            <div style={p.logoIcon}>
              <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
                <path d="M4 20 Q9 10 14 20 Q19 30 24 20 Q29 10 29 16"
                  stroke="white" strokeWidth="3" strokeLinecap="round" fill="none"/>
              </svg>
            </div>
            <span style={p.logoText}>Wave</span>
          </div>
          <p style={p.heading}>Your Name</p>
          <p style={p.sub}>This name will be shown to nearby devices over Bluetooth.</p>
          <input
            style={p.input}
            placeholder="Enter your name…"
            value={myName}
            onChange={e => setMyName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && myName.trim() && saveName()}
            autoFocus
          />
          <button
            style={{ ...p.btn, opacity: myName.trim() ? 1 : 0.5 }}
            disabled={!myName.trim()}
            onClick={saveName}
          >
            Continue →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={p.root}>
      {/* Header */}
      <div style={p.header}>
        <div style={p.logoRow2}>
          <div style={p.logoIconSm}>
            <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
              <path d="M4 20 Q9 10 14 20 Q19 30 24 20 Q29 10 29 16"
                stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
            </svg>
          </div>
          <span style={p.logoTextSm}>Wave</span>
          <span style={p.btBadge}>🔵 BT Test</span>
        </div>
        <div style={p.myName}>
          <span style={p.myNameLabel}>You:</span>
          <button style={p.myNameBtn} onClick={() => setNameEdit(true)}>{myName} ✏</button>
        </div>
      </div>

      {/* Status bar */}
      <div style={{ ...p.statusBar, background: statusColor(status) }}>
        <span style={p.statusDot} />
        <span style={p.statusText}>{statusLabel(status, connected)}</span>
        {connected && (
          <button style={p.discBtn} onClick={disconnect}>Disconnect</button>
        )}
      </div>

      {error ? (
        <div style={p.errorBox}>
          <p style={p.errorTitle}>⚠ Bluetooth Error</p>
          <p style={p.errorMsg}>{error}</p>
          <p style={p.errorHint}>
            Make sure Bluetooth is ON and you granted all permissions.
            On Android 12+ grant NEARBY DEVICES permission in Settings → Apps → Wave → Permissions.
          </p>
          <button style={p.retryBtn} onClick={() => { setError(''); initBle(); }}>Retry</button>
        </div>
      ) : connected ? (
        /* ── Chat view ── */
        <div style={p.chatRoot}>
          <div style={p.chatHeader}>
            <div style={p.btIcon}>🔵</div>
            <div>
              <p style={p.chatName}>{connected.name}</p>
              <p style={p.chatSub}>Connected via Bluetooth</p>
            </div>
          </div>

          <div style={p.messages}>
            {messages.length === 0 && (
              <p style={p.noMsgs}>Connected! Send a message to test →</p>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{ ...p.msgRow, justifyContent: m.mine ? 'flex-end' : 'flex-start' }}>
                <div style={{ ...p.bubble, ...(m.mine ? p.bubbleMine : p.bubbleTheirs), opacity: m.failed ? 0.6 : 1 }}>
                  {!m.mine && <p style={p.msgFrom}>{m.from}</p>}
                  <p style={p.msgText}>{m.content}</p>
                  <p style={p.msgTime}>{new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  {m.failed && <p style={{ fontSize: 10, color: '#fca5a5' }}>⚠ not sent</p>}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div style={p.inputRow}>
            <input
              style={p.chatInput}
              placeholder="Type a message…"
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
            />
            <button style={{ ...p.sendBtn, opacity: text.trim() ? 1 : 0.4 }}
              disabled={!text.trim()} onClick={sendMessage}>▶</button>
          </div>
        </div>
      ) : (
        /* ── Scan / devices view ── */
        <div style={p.body}>
          {/* Scan controls */}
          <div style={p.section}>
            {status === 'scanning' ? (
              <button style={p.stopBtn} onClick={stopScan}>⏹ Stop Scan</button>
            ) : (
              <button style={p.scanBtn} disabled={status === 'init' || status === 'connecting'}
                onClick={startScan}>
                🔍 Scan for Devices
              </button>
            )}
            <p style={p.scanNote}>
              Scans for ALL nearby Bluetooth devices.{'\n'}
              Both devices must have Bluetooth ON.
            </p>
          </div>

          {/* Device list */}
          {devices.length > 0 && (
            <div style={p.section}>
              <p style={p.sectionTitle}>Nearby Devices ({devices.length})</p>
              {devices.map(d => (
                <div key={d.deviceId} style={p.deviceRow}>
                  <div style={p.deviceIcon}>
                    {d.name.toLowerCase().includes('wave') ? '🌊' : '📱'}
                  </div>
                  <div style={p.deviceInfo}>
                    <p style={p.deviceName}>{d.name}</p>
                    <p style={p.deviceSub}>{d.rssi ? `${d.rssi} dBm` : 'RSSI unknown'}</p>
                  </div>
                  <button style={p.connectBtn}
                    onClick={() => { stopScan(); connectDevice(d); }}>
                    Connect
                  </button>
                </div>
              ))}
            </div>
          )}

          {status === 'scanning' && devices.length === 0 && (
            <div style={p.scanning}>
              <div style={p.pulseRing} />
              <p style={p.scanningText}>Scanning…</p>
              <p style={p.scanningHint}>Make sure the other device has Bluetooth ON</p>
            </div>
          )}

          {status === 'idle' && devices.length === 0 && (
            <div style={p.emptyState}>
              <p style={p.emptyIcon}>🔵</p>
              <p style={p.emptyTitle}>Ready to Scan</p>
              <p style={p.emptyText}>Press "Scan for Devices" to find nearby Bluetooth devices</p>
            </div>
          )}
        </div>
      )}

      {/* Debug log */}
      <div style={p.logBox}>
        <p style={p.logTitle}>Log</p>
        <div style={p.logScroll}>
          {log.map((l, i) => <p key={i} style={p.logLine}>{l}</p>)}
        </div>
      </div>
    </div>
  );
}

function statusColor(s) {
  if (s === 'connected') return 'rgba(52,211,153,0.18)';
  if (s === 'scanning' || s === 'connecting') return 'rgba(251,191,36,0.15)';
  if (s === 'error') return 'rgba(248,113,113,0.15)';
  return 'rgba(255,255,255,0.05)';
}

function statusLabel(s, connected) {
  if (s === 'connected' && connected) return `Connected to ${connected.name}`;
  if (s === 'scanning') return 'Scanning for devices…';
  if (s === 'connecting') return 'Connecting…';
  if (s === 'init') return 'Initialising Bluetooth…';
  if (s === 'error') return 'Bluetooth error';
  return 'Ready';
}

const p = {
  root: {
    display: 'flex', flexDirection: 'column', height: '100vh',
    background: '#0b0a14', color: '#fff', overflow: 'hidden',
    fontFamily: "'Inter', -apple-system, sans-serif",
  },

  // Name entry
  card: {
    background: 'rgba(22,18,38,0.98)', border: '1px solid rgba(255,255,255,0.16)',
    borderRadius: 20, padding: '36px 24px', margin: 'auto 20px',
    maxWidth: 380, width: '100%', alignSelf: 'center',
    boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
  },
  logoRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 20,
  },
  logoIcon: {
    width: 46, height: 46, borderRadius: 13,
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 18px rgba(99,102,241,0.5)',
  },
  logoText: {
    fontSize: 30, fontWeight: 800, letterSpacing: '-0.03em',
    background: 'linear-gradient(135deg, #818cf8, #c084fc)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  heading: { fontSize: 18, fontWeight: 700, marginBottom: 8, textAlign: 'center' },
  sub: {
    fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6,
    textAlign: 'center', marginBottom: 20,
  },
  input: {
    width: '100%', padding: '13px 14px',
    background: 'rgba(255,255,255,0.09)',
    border: '1px solid rgba(255,255,255,0.18)',
    borderRadius: 12, color: '#fff', fontSize: 16,
    marginBottom: 14,
  },
  btn: {
    width: '100%', padding: '14px',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    border: 'none', borderRadius: 12, color: '#fff',
    fontWeight: 700, fontSize: 16, cursor: 'pointer',
    boxShadow: '0 4px 18px rgba(99,102,241,0.45)',
  },

  // Header
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 16px 10px',
    background: 'rgba(22,18,38,0.97)',
    borderBottom: '1px solid rgba(255,255,255,0.10)',
    flexShrink: 0,
  },
  logoRow2: { display: 'flex', alignItems: 'center', gap: 8 },
  logoIconSm: {
    width: 30, height: 30, borderRadius: 8,
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  logoTextSm: {
    fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em',
    background: 'linear-gradient(135deg, #818cf8, #c084fc)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  btBadge: {
    fontSize: 11, fontWeight: 700, padding: '2px 8px',
    background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(129,140,248,0.4)',
    borderRadius: 99, color: '#a5b4fc',
  },
  myName: { display: 'flex', alignItems: 'center', gap: 5 },
  myNameLabel: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  myNameBtn: {
    fontSize: 13, fontWeight: 600, color: '#a5b4fc',
    background: 'rgba(129,140,248,0.1)', border: '1px solid rgba(129,140,248,0.25)',
    borderRadius: 8, padding: '3px 9px', cursor: 'pointer',
  },

  // Status
  statusBar: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '9px 16px', flexShrink: 0, transition: '300ms ease',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  statusDot: {
    width: 7, height: 7, borderRadius: '50%',
    background: 'currentColor', flexShrink: 0,
  },
  statusText: { flex: 1, fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.8)' },
  discBtn: {
    fontSize: 11, fontWeight: 700, color: '#fca5a5',
    background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.3)',
    borderRadius: 7, padding: '3px 10px', cursor: 'pointer',
  },

  // Error
  errorBox: {
    margin: 16, padding: 18,
    background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
    borderRadius: 14,
  },
  errorTitle: { fontSize: 15, fontWeight: 700, color: '#fca5a5', marginBottom: 6 },
  errorMsg: { fontSize: 13, color: '#fca5a5', marginBottom: 8, lineHeight: 1.5 },
  errorHint: { fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, marginBottom: 12 },
  retryBtn: {
    padding: '9px 18px',
    background: 'rgba(248,113,113,0.2)', border: '1px solid rgba(248,113,113,0.4)',
    borderRadius: 9, color: '#fca5a5', fontWeight: 700, fontSize: 13, cursor: 'pointer',
  },

  // Body / scan
  body: { flex: 1, overflowY: 'auto', padding: '12px 14px' },
  section: { marginBottom: 18 },
  sectionTitle: {
    fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.07em', color: 'rgba(255,255,255,0.45)', marginBottom: 10,
  },
  scanBtn: {
    width: '100%', padding: '15px',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    border: 'none', borderRadius: 14, color: '#fff',
    fontWeight: 700, fontSize: 16, cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(99,102,241,0.45)', marginBottom: 8,
  },
  stopBtn: {
    width: '100%', padding: '15px',
    background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.4)',
    borderRadius: 14, color: '#fca5a5', fontWeight: 700, fontSize: 16, cursor: 'pointer',
    marginBottom: 8,
  },
  scanNote: {
    fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 1.6,
    whiteSpace: 'pre-line',
  },
  deviceRow: {
    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)',
    borderRadius: 14, marginBottom: 8,
  },
  deviceIcon: { fontSize: 24, flexShrink: 0 },
  deviceInfo: { flex: 1, minWidth: 0 },
  deviceName: {
    fontSize: 14, fontWeight: 600, color: '#fff',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  deviceSub: { fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 },
  connectBtn: {
    padding: '8px 16px', borderRadius: 10, flexShrink: 0,
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', border: 'none',
  },

  // Scanning animation
  scanning: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '40px 20px', gap: 12,
  },
  pulseRing: {
    width: 60, height: 60, borderRadius: '50%',
    border: '3px solid #818cf8',
    animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite',
    opacity: 0.7,
  },
  scanningText: { fontSize: 16, fontWeight: 600, color: '#a5b4fc' },
  scanningHint: { fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center' },

  // Empty
  emptyState: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '50px 20px', gap: 10,
  },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,0.7)' },
  emptyText: { fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 1.6 },

  // Chat
  chatRoot: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  chatHeader: {
    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
    background: 'rgba(22,18,38,0.95)', borderBottom: '1px solid rgba(255,255,255,0.10)',
    flexShrink: 0,
  },
  btIcon: { fontSize: 28, flexShrink: 0 },
  chatName: { fontSize: 15, fontWeight: 700 },
  chatSub: { fontSize: 12, color: '#34d399', marginTop: 2 },
  messages: { flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 },
  noMsgs: { textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: 13, padding: '30px 0' },
  msgRow: { display: 'flex' },
  bubble: { maxWidth: '78%', padding: '10px 13px', borderRadius: 18 },
  bubbleMine: {
    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
    borderBottomRightRadius: 4,
    boxShadow: '0 3px 12px rgba(99,102,241,0.35)',
  },
  bubbleTheirs: {
    background: 'rgba(255,255,255,0.10)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderBottomLeftRadius: 4,
  },
  msgFrom: { fontSize: 10, fontWeight: 700, color: '#a5b4fc', marginBottom: 3 },
  msgText: { fontSize: 14, lineHeight: 1.45, color: '#fff' },
  msgTime: { fontSize: 10, opacity: 0.5, textAlign: 'right', marginTop: 4 },

  inputRow: {
    display: 'flex', gap: 10, padding: '10px 14px 16px',
    background: 'rgba(22,18,38,0.97)', borderTop: '1px solid rgba(255,255,255,0.10)',
    flexShrink: 0,
  },
  chatInput: {
    flex: 1, padding: '12px 14px',
    background: 'rgba(255,255,255,0.09)',
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: 12, color: '#fff', fontSize: 15,
  },
  sendBtn: {
    width: 46, height: 46, borderRadius: 12, flexShrink: 0,
    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
    color: '#fff', fontWeight: 700, fontSize: 18,
    border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },

  // Log
  logBox: {
    maxHeight: 120, flexShrink: 0,
    background: 'rgba(0,0,0,0.5)', borderTop: '1px solid rgba(255,255,255,0.08)',
    padding: '6px 12px',
  },
  logTitle: { fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' },
  logScroll: { overflowY: 'auto', maxHeight: 90 },
  logLine: { fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, fontFamily: 'monospace' },
};
