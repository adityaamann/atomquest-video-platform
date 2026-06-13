# SupportVision — AtomQuest Hackathon 2026 Submission

## Project Description

SupportVision is a browser-based real-time video support platform where agents create instant sessions, share a one-click invite link, and customers join with zero installation. All WebRTC signaling routes through the server (no third-party video APIs), and a rule-based insights engine analyses every session's chat for sentiment, message breakdown, and top keywords.

## Live Demo

- **App URL**: http://localhost:5173
- **Agent Login**: `audittest@example.com` / `test1234`
- **Demo Flow**: Login → New Session → Copy Link → Open in incognito → Enter name → Join Call

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS |
| Backend | Node.js, Express, Socket.io 4 |
| Database | PostgreSQL (Supabase) + Prisma ORM |
| Real-time | Socket.io rooms + WebRTC RTCPeerConnection |
| Security | JWT, Helmet.js, bcryptjs |
| Deployment | Vercel (frontend) + Railway (backend) |

## Architecture Diagram

```
Agent Browser ←──WebRTC (signaled via server)──→ Customer Browser
      │                                                   │
      └──────────── Socket.io ─── Express Server ─────────┘
                                        │
                              Supabase PostgreSQL
                              Anthropic Claude API
                              Local File Storage
```

## Features Implemented

### Must-Have (Core)
- ✅ Real-time browser video call (WebRTC + Socket.io signaling)
- ✅ In-call text chat with file attachments
- ✅ Server-side call recording (MediaRecorder → .webm upload)
- ✅ Role-based access: Agent (JWT) + Customer (invite token)
- ✅ Session history with chat transcript

### Bonus Features
- ✅ Session insights engine (rule-based: message counts, sentiment, top keywords)
- ✅ Admin dashboard with live metrics + force-end + CSV export
- ✅ Reconnect grace period (30s, transparent to other participant)
- ✅ Observability metrics endpoint (`/api/metrics`)
- ✅ Typing indicators (Socket.io)
- ✅ Session timer with long-call warning
- ✅ Network quality indicator (ping-based, 3-bar signal)
- ✅ Camera preview before joining (like Google Meet)
- ✅ Mute/camera-off visual overlays for remote participant
- ✅ QR code + WhatsApp share for invite links
- ✅ Session deduplication (no double sessions)
- ✅ Global error boundary + react-hot-toast notifications

## Demo Credentials

```
Agent:    audittest@example.com / test1234
```

## Setup (5 Steps)

```bash
git clone <repo> && cd atomquest-video-platform
npm run install:all
cp server/.env.example server/.env        # fill DATABASE_URL, JWT_SECRET (no API keys needed)
cd server && npx prisma migrate dev --schema=../prisma/schema.prisma
npm run dev                                # client :5173 + server :3001
```
