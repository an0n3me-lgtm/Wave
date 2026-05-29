/**
 * Wave P2P module — offline communication via LAN (WiFi) and Bluetooth
 *
 * LAN mode: WebRTC peer connections signalled via the Wave server's
 *           /api/p2p/* endpoints. Falls back to direct WebSocket relay
 *           when the two peers are on the same LAN.
 *
 * Bluetooth mode: Web Bluetooth API (GATT) — advertises/scans for the
 *                 Wave BLE service UUID and exchanges messages over a
 *                 custom characteristic.
 */

import Peer from 'simple-peer';
import { getSocket } from '../hooks/useSocket';

export const WAVE_BT_SERVICE = '0000fee0-0000-1000-8000-00805f9b34fb';
export const WAVE_BT_CHAR    = '0000fee1-0000-1000-8000-00805f9b34fb';

// ── LAN / WiFi-Direct (WebRTC via signalling server) ─────────────────────────

const peers = new Map();     // peerId -> SimplePeer instance
const handlers = new Map();  // peerId -> { onMessage, onConnect, onClose }

/** Call once after socket is ready. Listens for peer signals. */
export function initLanP2P(userId) {
  const socket = getSocket();
  if (!socket) return;

  socket.on('p2p:signal', ({ from, signal }) => {
    if (peers.has(from)) {
      peers.get(from).signal(signal);
      return;
    }
    const peer = createPeer(false, from, userId);
    peer.signal(signal);
  });
}

function createPeer(initiator, remotePeerId, localUserId) {
  const peer = new Peer({ initiator, trickle: true });

  peer.on('signal', (signal) => {
    const socket = getSocket();
    if (socket) socket.emit('p2p:signal', { to: remotePeerId, from: localUserId, signal });
  });

  peer.on('connect', () => {
    const h = handlers.get(remotePeerId);
    if (h?.onConnect) h.onConnect(remotePeerId);
  });

  peer.on('data', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      const h = handlers.get(remotePeerId);
      if (h?.onMessage) h.onMessage(remotePeerId, msg);
    } catch {}
  });

  peer.on('close', () => {
    peers.delete(remotePeerId);
    const h = handlers.get(remotePeerId);
    if (h?.onClose) h.onClose(remotePeerId);
  });

  peer.on('error', (err) => {
    console.warn('[P2P] peer error', err.message);
    peers.delete(remotePeerId);
  });

  peers.set(remotePeerId, peer);
  return peer;
}

export function connectToPeer(remotePeerId, localUserId, { onMessage, onConnect, onClose } = {}) {
  handlers.set(remotePeerId, { onMessage, onConnect, onClose });
  if (!peers.has(remotePeerId)) createPeer(true, remotePeerId, localUserId);
}

export function sendP2PMessage(remotePeerId, payload) {
  const peer = peers.get(remotePeerId);
  if (!peer || !peer.connected) return false;
  try {
    peer.send(JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function destroyPeer(peerId) {
  const peer = peers.get(peerId);
  if (peer) { try { peer.destroy(); } catch {} }
  peers.delete(peerId);
  handlers.delete(peerId);
}

export function getActivePeers() {
  return [...peers.entries()]
    .filter(([, p]) => p.connected)
    .map(([id]) => id);
}

// ── Bluetooth (Web Bluetooth API / BLE) ──────────────────────────────────────

export const isBtSupported = () =>
  typeof navigator !== 'undefined' && !!navigator.bluetooth;

let btDevice = null;
let btChar = null;
let btMessageHandler = null;

export async function btScan() {
  if (!isBtSupported()) throw new Error('Web Bluetooth not supported in this browser');

  const device = await navigator.bluetooth.requestDevice({
    filters: [{ services: [WAVE_BT_SERVICE] }],
    optionalServices: [WAVE_BT_SERVICE],
  });

  btDevice = device;
  btDevice.addEventListener('gattserverdisconnected', () => {
    btDevice = null;
    btChar = null;
  });

  const server = await device.gatt.connect();
  const service = await server.getPrimaryService(WAVE_BT_SERVICE);
  btChar = await service.getCharacteristic(WAVE_BT_CHAR);

  await btChar.startNotifications();
  btChar.addEventListener('characteristicvaluechanged', (e) => {
    const decoder = new TextDecoder();
    const msg = decoder.decode(e.target.value);
    try {
      const parsed = JSON.parse(msg);
      if (btMessageHandler) btMessageHandler(parsed);
    } catch {}
  });

  return { name: device.name || 'Unknown Device', id: device.id };
}

export async function btSend(payload) {
  if (!btChar) throw new Error('Not connected to any BLE device');
  const encoder = new TextEncoder();
  await btChar.writeValue(encoder.encode(JSON.stringify(payload)));
}

export function btSetMessageHandler(handler) {
  btMessageHandler = handler;
}

export function btDisconnect() {
  if (btDevice?.gatt?.connected) btDevice.gatt.disconnect();
  btDevice = null;
  btChar = null;
}

export function isBtConnected() {
  return btDevice?.gatt?.connected ?? false;
}
