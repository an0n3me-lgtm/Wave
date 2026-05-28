# Wave

A modern real-time messenger built with React, Node.js, Socket.io and SQLite.

## Features

- **Real-time messaging** via WebSockets (Socket.io)
- **User authentication** — register, login, JWT sessions
- **Direct conversations** — search users, start 1:1 chats instantly
- **Message editing & deletion** — edit or delete your messages
- **Typing indicators** — see when someone is typing
- **Online status** — live presence indicator
- **Unread badges** — track unread messages per conversation
- **Message history pagination** — scroll up to load older messages
- **User profiles** — customizable display name & bio, unique avatar colors
- **Responsive design** — works on desktop and mobile

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Zustand, Socket.io client, date-fns |
| Backend | Node.js, Express 5, Socket.io, better-sqlite3, bcryptjs, JWT |
| Database | SQLite (via better-sqlite3) |

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Install dependencies

```bash
npm run install:all
```

### Run in development

Start both the server and client simultaneously:

```bash
npm run dev
```

Or individually:

```bash
# Terminal 1 — backend (port 3001)
npm run server

# Terminal 2 — frontend (port 5173)
npm run client
```

### Build for production

```bash
cd client && npm run build
```

Then serve `client/dist` with any static file server and point it to the backend.

## Project Structure

```
wave/
├── server/
│   ├── index.js      — Express + Socket.io server
│   ├── db.js         — SQLite schema & connection
│   └── wave.db       — auto-created SQLite database
├── client/
│   ├── src/
│   │   ├── api/      — Axios instance
│   │   ├── store/    — Zustand state (auth, chat)
│   │   ├── hooks/    — useSocket
│   │   ├── components/ — Avatar, Sidebar, ChatView, Icons…
│   │   └── pages/    — AuthPage, ChatLayout
│   └── vite.config.js
└── package.json      — root scripts
```

## Environment Variables

### Server (`server/.env`)
| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `JWT_SECRET` | `wave-secret-key-…` | JWT signing secret (change in prod!) |
| `CLIENT_URL` | `http://localhost:5173` | Allowed CORS origin |

### Client (`client/.env`)
| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:3001` | Backend URL |
