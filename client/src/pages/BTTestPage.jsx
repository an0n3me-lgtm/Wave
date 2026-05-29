// Static import so Vite bundles @capacitor/core into the same chunk.
// Dynamic import creates a separate chunk that Android WebView can't resolve.
import { BleClient } from '@capacitor-community/bluetooth-le';
import React, { useState, useEffect, useRef } from 'react';

const WAVE_SERVICE  = '0000fee0-0000-1000-8000-00805f9b34fb';
const WAVE_CHAR_MSG = '0000fee1-0000-1000-8000-00805f9b34fb';

function encode(str) {
  return new DataView(new TextEncoder().encode(str).buffer);
}
function decode(dv) {
  try {
    return new TextDecoder().decode(new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength));
  } catch { return ''; }
}

// ── Error Boundary ────────────────────────────────────────────────────────────
class Boundary extends React.Component {
  state = { err: null };
  static getDerivedStateFromError(e) { return { err: e }; }
  render() {
    if (this.state.err) return (
      <div style={{ padding: 24, color: '#fca5a5', background: '#0b0a14', minHeight: '100vh', fontFamily: 'sans-serif' }}>
        <h2 style={{ fontSize: 17, marginBottom: 10 }}>⚠ Error</h2>
        <pre style={{ fontSize: 12, whiteSpace: 'pre-wrap', opacity: 0.8 }}>{String(this.state.err)}</pre>
        <button onClick={() => window.location.reload()}
          style={{ marginTop: 16, padding: '10px 20px', background: '#6366f1', border: 'none', borderRadius: 10, color: '#fff', fontSize: 14 }}>
          Reload
        </button>
      </div>
    );
    return this.props.children;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
function Inner() {
  const [myName, setMyName] = useState(localStorage.getItem('bt_name') || '');
  const [nameDone, setNameDone] = useState(!!localStorage.getItem('bt_name'));
  const [phase, setPhase] = useState('idle'); // idle|ready|error|scanning|connecting|connected
  const [errMsg, setErrMsg] = useState('');
  const [devices, setDevices] = useState([]);
  const [peer, setPeer] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const [log, setLog] = useState(['App loaded OK.']);
  const scanRef = useRef(null);
  const bottomRef = useRef(null);

  const lg = (t) => setLog(p => [...p.slice(-80), new Date().toLocaleTimeString() + '  ' + t]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  // ── Init ──────────────────────────────────────────────────────────────────
  async function doInit() {
    setErrMsg('');
    setPhase('idle');
    lg('Calling BleClient.initialize()…');
    try {
      await BleClient.initialize({ androidNeverForLocation: false });
      lg('✓ BLE initialised');
      setPhase('ready');
    } catch (e) {
      const m = e?.message || String(e);
      lg('✗ initialize error: ' + m);
      setErrMsg(m);
      setPhase('error');
    }
  }

  // ── Scan ──────────────────────────────────────────────────────────────────
  async function doScan() {
    setDevices([]);
    setErrMsg('');
    setPhase('scanning');
    lg('requestLEScan…');
    try {
      await BleClient.requestLEScan({ allowDuplicates: false }, (r) => {
        const name = r.device?.name || r.localName || r.device?.deviceId || 'Unknown';
        lg('Found: ' + name + (r.rssi ? ' ' + r.rssi + 'dBm' : ''));
        setDevices(prev => {
          const id = r.device?.deviceId;
          if (!id) return prev;
          const ex = prev.find(d => d.id === id);
          const upd = { id, name, rssi: r.rssi };
          return ex ? prev.map(d => d.id === id ? upd : d) : [...prev, upd];
        });
      });
      scanRef.current = setTimeout(async () => {
        try { await BleClient.stopLEScan(); } catch {}
        setPhase('ready');
        lg('Scan finished (15 s).');
      }, 15000);
    } catch (e) {
      const m = e?.message || String(e);
      lg('✗ scan error: ' + m);
      setErrMsg(m);
      setPhase('ready');
    }
  }

  async function doStopScan() {
    clearTimeout(scanRef.current);
    try { await BleClient.stopLEScan(); } catch {}
    setPhase('ready');
    lg('Scan stopped.');
  }

  // ── Connect ───────────────────────────────────────────────────────────────
  async function doConnect(dev) {
    clearTimeout(scanRef.current);
    try { await BleClient.stopLEScan(); } catch {}
    setPhase('connecting');
    lg('Connecting to ' + dev.name + '…');
    try {
      await BleClient.connect(dev.id, () => {
        lg('Disconnected from ' + dev.name);
        setPeer(null);
        setPhase('ready');
      });
      lg('✓ Connected. Reading services…');

      // Try to subscribe to Wave messages
      try {
        const svcs = await BleClient.getServices(dev.id);
        const hasSvc = svcs.some(s => s.uuid?.toLowerCase().includes('fee0'));
        lg(hasSvc ? '✓ Wave service found — subscribing…' : '⚠ No Wave service (test connect only).');
        if (hasSvc) {
          await BleClient.startNotifications(dev.id, WAVE_SERVICE, WAVE_CHAR_MSG, (dv) => {
            try {
              const m = JSON.parse(decode(dv));
              lg('← ' + m.from + ': ' + m.content);
              setMsgs(p => [...p, { ...m, mine: false }]);
            } catch { lg('← raw bytes received'); }
          });
          lg('✓ Subscribed to messages.');
        }
      } catch (e) { lg('Services: ' + (e?.message || e)); }

      setPeer(dev);
      setPhase('connected');
    } catch (e) {
      const m = e?.message || String(e);
      lg('✗ connect error: ' + m);
      setErrMsg(m);
      setPhase('ready');
    }
  }

  async function doDisconnect() {
    try { await BleClient.disconnect(peer?.id); } catch {}
    setPeer(null);
    setPhase('ready');
    lg('Disconnected.');
  }

  async function doSend() {
    if (!text.trim() || !peer) return;
    const payload = { from: myName || 'Me', content: text.trim(), ts: Date.now() };
    try {
      await BleClient.write(peer.id, WAVE_SERVICE, WAVE_CHAR_MSG, encode(JSON.stringify(payload)));
      lg('→ ' + payload.content);
      setMsgs(p => [...p, { ...payload, mine: true }]);
    } catch (e) {
      lg('✗ send: ' + (e?.message || e));
      setMsgs(p => [...p, { ...payload, mine: true, failed: true }]);
    }
    setText('');
  }

  // ── Name screen ───────────────────────────────────────────────────────────
  if (!nameDone) {
    return (
      <div style={S.center}>
        <div style={S.card}>
          <WaveLogo />
          <p style={S.h2}>Your Name</p>
          <p style={S.muted}>This name is shown to nearby devices over Bluetooth.</p>
          <input style={S.inp} placeholder="Enter your name…" value={myName} autoFocus
            onChange={e => setMyName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && myName.trim() && saveName()} />
          <button style={{ ...S.btnV, opacity: myName.trim() ? 1 : 0.4 }}
            disabled={!myName.trim()} onClick={saveName}>Continue →</button>
        </div>
      </div>
    );
    function saveName() {
      localStorage.setItem('bt_name', myName.trim());
      setNameDone(true);
    }
  }

  // ── Chat screen ───────────────────────────────────────────────────────────
  if (phase === 'connected' && peer) {
    return (
      <div style={S.page}>
        <Bar myName={myName} onEdit={() => setNameDone(false)}>
          <button style={S.btnDanger} onClick={doDisconnect}>✕ Disconnect</button>
        </Bar>
        <div style={{ ...S.statusBar, background: '#0f2a1e' }}>
          <span style={{ ...S.dot, background: '#34d399' }} />
          <span style={S.stText}>Connected to {peer.name}</span>
        </div>
        <div style={S.msgs}>
          {msgs.length === 0 && <p style={S.noMsg}>Send a test message 👇</p>}
          {msgs.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.mine ? 'flex-end' : 'flex-start', marginBottom: 6 }}>
              <div style={{ ...S.bubble, ...(m.mine ? S.bMine : S.bTheir) }}>
                {!m.mine && <p style={S.bFrom}>{m.from}</p>}
                <p style={S.bText}>{m.content}</p>
                <p style={S.bTime}>{new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{m.failed ? ' ⚠' : ''}</p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <div style={S.inputRow}>
          <input style={S.chatInp} placeholder="Message…" value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doSend()} />
          <button style={{ ...S.sendBtn, opacity: text.trim() ? 1 : 0.3 }}
            disabled={!text.trim()} onClick={doSend}>▶</button>
        </div>
        <LogPanel log={log} />
      </div>
    );
  }

  // ── Scan screen ───────────────────────────────────────────────────────────
  return (
    <div style={S.page}>
      <Bar myName={myName} onEdit={() => setNameDone(false)} />

      <div style={{ ...S.statusBar, background: statusBg(phase) }}>
        <span style={{ ...S.dot, background: dotColor(phase) }} />
        <span style={S.stText}>{stLabel(phase)}</span>
      </div>

      {errMsg && (
        <div style={S.errBox}>
          <p style={{ fontWeight: 700, marginBottom: 6, color: '#fca5a5' }}>⚠ BLE Error</p>
          <p style={S.errTxt}>{errMsg}</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, marginTop: 6 }}>
            Check Bluetooth is ON. On Android 12+ grant "Nearby devices" in Settings → Apps → Wave → Permissions.
          </p>
        </div>
      )}

      <div style={S.body}>
        {phase === 'idle' || phase === 'error' ? (
          <button style={S.btnV} onClick={doInit}>🔵 Initialise Bluetooth</button>
        ) : phase === 'scanning' ? (
          <button style={S.btnStop} onClick={doStopScan}>⏹ Stop Scan</button>
        ) : (
          <button style={S.btnV} disabled={phase === 'connecting'} onClick={doScan}>
            {phase === 'connecting' ? 'Connecting…' : '🔍 Scan for Devices'}
          </button>
        )}

        {phase === 'scanning' && devices.length === 0 && (
          <div style={S.pulseBox}>
            <div style={S.pulseRing} />
            <p style={{ fontSize: 15, fontWeight: 600, color: '#a5b4fc' }}>Scanning…</p>
            <p style={S.muted}>Make sure Bluetooth is ON on both devices</p>
          </div>
        )}

        {devices.length > 0 && (
          <>
            <p style={S.secLabel}>Nearby devices ({devices.length})</p>
            {devices.map(d => (
              <div key={d.id} style={S.devRow}>
                <span style={{ fontSize: 22 }}>
                  {d.name.toLowerCase().includes('wave') ? '🌊' : '📱'}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={S.devName}>{d.name}</p>
                  <p style={S.devSub}>{d.id.slice(0, 17)}{d.rssi ? '  ' + d.rssi + ' dBm' : ''}</p>
                </div>
                <button style={S.connBtn} onClick={() => doConnect(d)}>Connect</button>
              </div>
            ))}
          </>
        )}

        {phase === 'ready' && devices.length === 0 && (
          <div style={S.emptyBox}>
            <p style={{ fontSize: 38 }}>🔵</p>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>Bluetooth Ready</p>
            <p style={S.muted}>Press "Scan for Devices"</p>
          </div>
        )}
      </div>

      <LogPanel log={log} />
    </div>
  );
}

// ── Small components ──────────────────────────────────────────────────────────
function WaveLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
      <div style={{ width: 46, height: 46, borderRadius: 13, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(99,102,241,.45)' }}>
        <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
          <path d="M4 20 Q9 10 14 20 Q19 30 24 20 Q29 10 29 16" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none"/>
        </svg>
      </div>
      <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(135deg,#818cf8,#c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Wave</span>
    </div>
  );
}

function Bar({ myName, onEdit, children }) {
  return (
    <div style={S.bar}>
      <WaveLogo />
      <span style={S.btBadge}>🔵 BT Test</span>
      {children}
      <button style={S.nameBtn} onClick={onEdit}>{myName} ✏</button>
    </div>
  );
}

function LogPanel({ log }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [log]);
  return (
    <div style={S.logBox}>
      <p style={S.logLabel}>LOG</p>
      <div ref={ref} style={S.logScroll}>
        {log.map((l, i) => <p key={i} style={S.logLine}>{l}</p>)}
      </div>
    </div>
  );
}

function stLabel(p) {
  return { idle:'BLE not initialised', ready:'Bluetooth ready', scanning:'Scanning…',
    connecting:'Connecting…', connected:'Connected', error:'BLE error' }[p] || p;
}
function statusBg(p) {
  return { ready:'rgba(129,140,248,.1)', scanning:'rgba(251,191,36,.1)',
    connecting:'rgba(251,191,36,.1)', error:'rgba(248,113,113,.1)' }[p] || 'rgba(255,255,255,.04)';
}
function dotColor(p) {
  return { ready:'#818cf8', scanning:'#fbbf24', connecting:'#fbbf24',
    error:'#f87171', connected:'#34d399' }[p] || '#6b7280';
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  page:{ display:'flex', flexDirection:'column', height:'100vh', background:'#0b0a14', color:'#fff', fontFamily:"'Inter',-apple-system,sans-serif", overflow:'hidden' },
  center:{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#0b0a14', padding:20 },
  card:{ width:'100%', maxWidth:400, padding:'34px 24px 26px', background:'rgba(22,18,38,.98)', border:'1px solid rgba(255,255,255,.15)', borderRadius:22, boxShadow:'0 20px 60px rgba(0,0,0,.7)', display:'flex', flexDirection:'column', gap:14 },
  h2:{ fontSize:18, fontWeight:700, textAlign:'center' },
  muted:{ fontSize:12, color:'rgba(255,255,255,.42)', textAlign:'center', lineHeight:1.6 },
  inp:{ padding:'13px 14px', background:'rgba(255,255,255,.09)', border:'1px solid rgba(255,255,255,.17)', borderRadius:12, color:'#fff', fontSize:16, width:'100%' },
  btnV:{ width:'100%', padding:'15px', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', borderRadius:14, color:'#fff', fontWeight:700, fontSize:15, cursor:'pointer', boxShadow:'0 4px 18px rgba(99,102,241,.4)' },
  btnStop:{ width:'100%', padding:'15px', background:'rgba(248,113,113,.14)', border:'1px solid rgba(248,113,113,.38)', borderRadius:14, color:'#fca5a5', fontWeight:700, fontSize:15, cursor:'pointer' },
  btnDanger:{ fontSize:12, color:'#fca5a5', background:'rgba(248,113,113,.10)', border:'1px solid rgba(248,113,113,.28)', borderRadius:8, padding:'4px 10px', cursor:'pointer' },
  bar:{ display:'flex', alignItems:'center', gap:8, padding:'11px 14px 9px', background:'rgba(22,18,38,.98)', borderBottom:'1px solid rgba(255,255,255,.09)', flexShrink:0, flexWrap:'wrap' },
  btBadge:{ fontSize:11, fontWeight:700, padding:'2px 8px', background:'rgba(99,102,241,.18)', border:'1px solid rgba(129,140,248,.38)', borderRadius:99, color:'#a5b4fc' },
  nameBtn:{ marginLeft:'auto', fontSize:12, color:'#a5b4fc', background:'rgba(129,140,248,.10)', border:'1px solid rgba(129,140,248,.25)', borderRadius:8, padding:'3px 10px', cursor:'pointer', whiteSpace:'nowrap' },
  statusBar:{ display:'flex', alignItems:'center', gap:10, padding:'9px 14px', flexShrink:0, borderBottom:'1px solid rgba(255,255,255,.07)' },
  dot:{ width:8, height:8, borderRadius:'50%', flexShrink:0 },
  stText:{ fontSize:13, fontWeight:500, color:'rgba(255,255,255,.8)' },
  errBox:{ margin:'10px 14px', padding:'14px 16px', background:'rgba(248,113,113,.10)', border:'1px solid rgba(248,113,113,.3)', borderRadius:14 },
  errTxt:{ fontSize:12, color:'#fca5a5', lineHeight:1.5 },
  body:{ flex:1, overflowY:'auto', padding:'14px', display:'flex', flexDirection:'column', gap:10 },
  secLabel:{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em', color:'rgba(255,255,255,.42)' },
  devRow:{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.10)', borderRadius:14 },
  devName:{ fontSize:14, fontWeight:600, color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  devSub:{ fontSize:11, color:'rgba(255,255,255,.42)', marginTop:2, fontFamily:'monospace' },
  connBtn:{ flexShrink:0, padding:'8px 14px', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', borderRadius:10, color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer' },
  pulseBox:{ display:'flex', flexDirection:'column', alignItems:'center', gap:10, padding:'30px 0' },
  pulseRing:{ width:56, height:56, borderRadius:'50%', border:'3px solid #818cf8', opacity:.7, animation:'pulse-bt 1.4s ease-out infinite' },
  emptyBox:{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, paddingTop:40 },
  msgs:{ flex:1, overflowY:'auto', padding:'10px 14px', display:'flex', flexDirection:'column' },
  noMsg:{ textAlign:'center', color:'rgba(255,255,255,.35)', fontSize:13, paddingTop:30 },
  bubble:{ maxWidth:'78%', padding:'9px 13px', borderRadius:18, wordBreak:'break-word' },
  bMine:{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)', borderBottomRightRadius:4, boxShadow:'0 2px 10px rgba(99,102,241,.35)' },
  bTheir:{ background:'rgba(255,255,255,.10)', border:'1px solid rgba(255,255,255,.11)', borderBottomLeftRadius:4 },
  bFrom:{ fontSize:10, fontWeight:700, color:'#a5b4fc', marginBottom:3 },
  bText:{ fontSize:14, lineHeight:1.45, color:'#fff' },
  bTime:{ fontSize:10, opacity:.45, textAlign:'right', marginTop:3 },
  inputRow:{ display:'flex', gap:8, padding:'10px 14px 14px', background:'rgba(22,18,38,.97)', borderTop:'1px solid rgba(255,255,255,.09)', flexShrink:0 },
  chatInp:{ flex:1, padding:'12px 14px', background:'rgba(255,255,255,.09)', border:'1px solid rgba(255,255,255,.14)', borderRadius:12, color:'#fff', fontSize:15 },
  sendBtn:{ width:46, height:46, flexShrink:0, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', borderRadius:12, color:'#fff', fontWeight:800, fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' },
  logBox:{ flexShrink:0, maxHeight:110, background:'rgba(0,0,0,.55)', borderTop:'1px solid rgba(255,255,255,.07)', padding:'6px 12px 8px' },
  logLabel:{ fontSize:9, fontWeight:800, letterSpacing:'.1em', color:'rgba(255,255,255,.28)', textTransform:'uppercase', marginBottom:3 },
  logScroll:{ overflowY:'auto', maxHeight:88 },
  logLine:{ fontSize:11, color:'rgba(255,255,255,.55)', lineHeight:1.55, fontFamily:'monospace', whiteSpace:'pre-wrap' },
};

export default function BTTestPage() {
  return <Boundary><Inner /></Boundary>;
}
