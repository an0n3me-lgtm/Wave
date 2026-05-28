import { create } from 'zustand';
import {
  connectToPeer, sendP2PMessage, destroyPeer, getActivePeers,
  btScan, btSend, btDisconnect, isBtConnected, btSetMessageHandler, isBtSupported,
  initLanP2P,
} from '../lib/p2p';

export const useP2PStore = create((set, get) => ({
  // LAN peers: { id, displayName, username, avatarColor, connected, type:'lan' }
  lanPeers: [],
  // BT device: { name, id } | null
  btDevice: null,
  btConnected: false,
  btScanning: false,
  btError: null,
  // P2P messages: [ { from, content, ts, type:'lan'|'bt' } ]
  p2pMessages: {},        // peerId -> message[]
  activePeerId: null,

  init: (userId) => {
    initLanP2P(userId);
    btSetMessageHandler((msg) => {
      if (msg.type === 'wave-message' && msg.from) {
        get().addP2PMessage('__bluetooth__', {
          from: msg.from,
          content: msg.content,
          ts: Date.now(),
          type: 'bt',
        });
      }
    });
  },

  // ── LAN ──────────────────────────────────────────────────────────────────

  addLanPeer: (peer) => set((state) => ({
    lanPeers: [...state.lanPeers.filter(p => p.id !== peer.id), peer],
  })),

  removeLanPeer: (id) => set((state) => ({
    lanPeers: state.lanPeers.filter(p => p.id !== id),
  })),

  connectLan: (peer, localUserId) => {
    connectToPeer(peer.id, localUserId, {
      onConnect: (id) => {
        set((state) => ({
          lanPeers: state.lanPeers.map(p => p.id === id ? { ...p, connected: true } : p),
        }));
      },
      onMessage: (id, msg) => {
        if (msg.type === 'wave-message') {
          get().addP2PMessage(id, { from: msg.from, content: msg.content, ts: Date.now(), type: 'lan' });
        } else if (msg.type === 'wave-announce') {
          set((state) => ({
            lanPeers: state.lanPeers.map(p =>
              p.id === id ? { ...p, displayName: msg.displayName, username: msg.username, avatarColor: msg.avatarColor } : p
            ),
          }));
        }
      },
      onClose: (id) => {
        set((state) => ({
          lanPeers: state.lanPeers.map(p => p.id === id ? { ...p, connected: false } : p),
        }));
      },
    });
  },

  sendLan: (peerId, content, from) => {
    return sendP2PMessage(peerId, { type: 'wave-message', from, content });
  },

  // ── Bluetooth ─────────────────────────────────────────────────────────────

  btScanStart: async () => {
    set({ btScanning: true, btError: null });
    try {
      const device = await btScan();
      set({ btDevice: device, btConnected: true, btScanning: false });
    } catch (e) {
      set({ btScanning: false, btError: e.message });
    }
  },

  btSendMessage: async (content, from) => {
    try {
      await btSend({ type: 'wave-message', from, content });
      get().addP2PMessage('__bluetooth__', { from, content, ts: Date.now(), type: 'bt', mine: true });
    } catch (e) {
      console.error('[BT] send error', e);
    }
  },

  btDisconnect: () => {
    btDisconnect();
    set({ btDevice: null, btConnected: false });
  },

  isBtSupported: () => isBtSupported(),

  // ── Messages ──────────────────────────────────────────────────────────────

  addP2PMessage: (peerId, msg) => set((state) => ({
    p2pMessages: {
      ...state.p2pMessages,
      [peerId]: [...(state.p2pMessages[peerId] || []), msg],
    },
  })),

  setActivePeer: (id) => set({ activePeerId: id }),
}));
