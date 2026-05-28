# Wave

A modern real-time messenger with **offline P2P communication** via Bluetooth and WiFi Direct.

## ✨ Features

- **Real-time messaging** via WebSockets (Socket.io)
- **Liquid Glass UI** — frosted glass design with animated gradients
- **Bluetooth BLE** — chat with nearby users without internet
- **WiFi Direct / LAN P2P** — WebRTC direct connections on same network
- **User authentication** — register, login, JWT sessions
- **Message editing & deletion** — edit or delete your messages
- **Typing indicators** — animated dots when someone is typing
- **Online presence** — live status with glowing indicators
- **Unread badges** — per-conversation unread count
- **User profiles** — display name, bio, avatar colors
- **Responsive design** — mobile & desktop

## 📦 Release Artifacts

| Platform | File | Size |
|----------|------|------|
| 🤖 Android | `releases/Wave-1.0.0-debug.apk` | ~4 MB |
| 🖥️ Windows | `releases/Wave-1.0.0-Windows-x64.zip` | ~138 MB |

See [releases/README.md](releases/README.md) for installation instructions.

## 🔵 Offline P2P Communication

### Bluetooth BLE
Uses the Web Bluetooth API (Chrome/Electron) or the `@capacitor-community/bluetooth-le`
native plugin on Android to discover and exchange messages with nearby Wave users.

### WiFi Direct
- **Browser/Electron**: WebRTC data channels with signalling via the Wave server.
  Works on the same LAN without external internet once peers are connected.
- **Android**: Native `WifiP2pManager` API via a custom Capacitor plugin (`WifiDirectPlugin.java`).
  True WiFi Direct — no router needed.

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Zustand, Socket.io client, simple-peer (WebRTC), date-fns |
| Backend | Node.js, Express 5, Socket.io, SQLite (better-sqlite3), bcryptjs, JWT |
| Mobile | Capacitor, @capacitor-community/bluetooth-le, native WifiDirectPlugin |
| Desktop | Electron 36, electron-builder |
| Design | Liquid Glass — `backdrop-filter`, animated mesh gradients |

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm 9+

### Install & Run

```bash
# Install all dependencies
npm run install:all

# Start both server (port 3001) and client (port 5173)
npm run dev
```

### Build for Production

```bash
# Web
cd client && npm run build

# Android APK  
cd mobile && npm run build

# Windows EXE
cd electron && npx electron-builder --win
```

## 📁 Project Structure

```
wave/
├── server/          Express + Socket.io backend
│   ├── index.js     Routes, WS handlers, P2P signalling
│   └── db.js        SQLite schema
├── client/          React SPA (Vite)
│   └── src/
│       ├── lib/     p2p.js (WebRTC), wifiDirect.js (Capacitor)
│       ├── store/   authStore, chatStore, p2pStore
│       └── components/  ChatView, Sidebar, P2PPanel…
├── mobile/          Capacitor Android project
│   └── android/     Native Java plugins (WifiDirectPlugin)
├── electron/        Electron wrapper
│   ├── main.js      Window + embedded server
│   └── preload.js   Secure IPC bridge
└── releases/        APK + Windows ZIP artifacts
```

## 🔧 Environment Variables

### Server
| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `JWT_SECRET` | `wave-secret-key` | JWT signing secret |
| `CLIENT_URL` | `http://localhost:5173` | CORS allowed origin |

### Client
| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:3001` | Backend URL |
