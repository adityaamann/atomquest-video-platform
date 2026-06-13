# SupportVision — Real-Time Video Support Platform

> Built for **AtomQuest Hackathon 1.0 Grand Finale** by Atomberg Technologies

[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react)](https://react.dev)
[![Node.js](https://img.shields.io/badge/Node.js-22-339933?style=flat&logo=node.js)](https://nodejs.org)
[![Socket.io](https://img.shields.io/badge/Socket.io-4-010101?style=flat&logo=socket.io)](https://socket.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-4169E1?style=flat&logo=postgresql)](https://supabase.com)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=flat&logo=prisma)](https://prisma.io)
[![WebRTC](https://img.shields.io/badge/WebRTC-Native-FF6B00?style=flat)](https://webrtc.org)

## What It Does

SupportVision lets support agents create instant video sessions and share an invite link — customers join in one click with no app install needed. WebRTC signaling routes through the server (no third-party video APIs), and an AI-powered summary is generated after every call using Claude Haiku.

## Live Demo

- Frontend: `http://localhost:5173`
- Agent Login: `audittest@example.com` / `test1234`
- Demo Invite: Create a session from the dashboard

## Features

- ✅ **Real-time video calling** — native RTCPeerConnection, signaling via Socket.io
- ✅ **Server-mediated media** — no P2P, no Twilio/Agora/Daily/Vonage
- ✅ **In-call chat** with file sharing (images, PDFs, docs)
- ✅ **Typing indicators** — live "Agent is typing…" via Socket.io
- ✅ **Session timer** — HH:MM:SS, turns red after 30 minutes
- ✅ **Network quality indicator** — 3-bar signal based on Socket.io ping
- ✅ **Call recording** — client-side MediaRecorder → server upload → `.webm` file
- ✅ **Session insights** — rule-based analytics: message counts, sentiment, top keywords
- ✅ **Admin dashboard** — live metrics, force-end sessions, CSV export
- ✅ **Reconnect grace period** — 30-second window, other participant not notified
- ✅ **Role-based access control** — Agent (JWT) / Customer (invite token)
- ✅ **Camera preview** on join page, mute/camera-off overlays, PiP layout
- ✅ **QR code** + WhatsApp share for invite links
- ✅ **Observability** — `/api/metrics` endpoint with live session counts

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  CLIENT LAYER (React + Vite + Tailwind)                         │
│  Agent UI ─── Customer UI ─── Admin Dashboard                   │
└──────────────────────┬──────────────────────────────────────────┘
                       │ HTTPS + WebSocket
┌──────────────────────▼──────────────────────────────────────────┐
│  API LAYER (Express + Helmet)                                   │
│  JWT Auth ─── Sessions ─── Recording ─── Files ─── Summary      │
└──────────┬────────────────────────────────────────┬────────────┘
           │ Socket.io Rooms
┌──────────▼───────────────────┐
│  REAL-TIME LAYER             │
│  join-session                │
│  signal (WebRTC)             │
│  media-state-change          │
│  typing-start/stop           │
│  send-message                │
│  recording-stop-ack          │
└──────────┬───────────────────┘
           │ Prisma ORM
┌──────────▼───────────────────┐  ┌─────────────────────────────┐
│  DATA LAYER                  │  │  FILE STORAGE               │
│  Supabase PostgreSQL         │  │  uploads/ (chat files)      │
│  User, Session, Participant  │  │  recordings/ (.webm)        │
│  ChatMessage, Recording,     │  └─────────────────────────────┘
│  SessionSummary              │
└──────────────────────────────┘

Media Flow: RTCPeerConnection (browser↔browser, signaling via server)
```

## Quick Start

```bash
git clone <repo> && cd atomquest-video-platform
npm run install:all
cp server/.env.example server/.env    # fill in DATABASE_URL, JWT_SECRET
cd server && npx prisma migrate dev --schema=../prisma/schema.prisma
npm run dev   # from root — starts client :5173 + server :3001
```

## API Documentation

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | — | Register agent account |
| POST | `/api/auth/login` | — | Login → JWT |
| POST | `/api/sessions` | JWT | Create (or return existing active) session |
| GET | `/api/sessions` | JWT | List agent's sessions |
| GET | `/api/sessions/:id` | JWT | Session detail + transcript + summary |
| POST | `/api/sessions/:id/end` | JWT | End session |
| GET | `/api/join/:token` | — | Validate customer invite token |
| POST | `/api/sessions/:id/recording/start` | JWT | Start recording |
| POST | `/api/sessions/:id/recording/stop` | JWT | Stop recording |
| POST | `/api/sessions/:id/recording/:rid/upload` | JWT | Upload recorded blob |
| GET | `/api/sessions/:id/recording/download` | JWT | Download recording file |
| GET | `/api/sessions/:id/insights` | JWT | Session insights (rule-based analytics) |
| POST | `/api/files/upload` | JWT | Upload file attachment |
| GET | `/api/files/:filename` | — | Serve uploaded file |
| GET | `/api/metrics` | JWT | Live platform metrics |
| GET | `/api/admin/sessions` | JWT | All sessions (admin) |
| POST | `/api/admin/sessions/:id/force-end` | JWT | Force end any session |
| GET | `/api/admin/sessions/export` | JWT | Export sessions as CSV |
| GET | `/health` | — | Server health check |

## Environment Variables

```env
# server/.env
DATABASE_URL=postgresql://...
JWT_SECRET=at-least-32-chars-long
PORT=3001
CLIENT_URL=http://localhost:5173

# client/.env
VITE_API_URL=http://localhost:3001
VITE_SOCKET_URL=http://localhost:3001
```

## Deployment

**Backend → Railway**
```
Build: cd server && npm install && npx prisma generate --schema=../prisma/schema.prisma && npx prisma migrate deploy --schema=../prisma/schema.prisma
Start: cd server && node src/index.js
```

**Frontend → Vercel**
```
Root: client/
Build: npm run build
Output: dist/
```

## Scalability Notes

- The server holds in-memory session state (`Map`) — works for single-instance deploys. For multi-instance, replace with Redis adapter for Socket.io.
- Recordings are stored on local disk — move to S3/R2 for production.
- Session insights are computed on-demand from DB message data — no external API needed.
- Connection pool via Supabase pooler handles concurrent DB connections.

## Known Limitations

- Recording captures only the agent's local stream (not a merged view of both participants)
- No TURN server configured — WebRTC may fail on restrictive enterprise networks
- In-memory session state resets on server restart
- Session insights require at least one chat message to be meaningful

## What I'd Build Next

1. **TURN server** (Coturn) for enterprise network compatibility
2. **Multi-party calls** — more than 2 participants using SFU (mediasoup)
3. **Screen sharing** — `getDisplayMedia()` as a second track
4. **Webhook notifications** — POST to agent's CRM when session ends
5. **Redis adapter** — Socket.io state persistence across multiple server instances
