# AtomQuest — Real-Time Video Support Platform

Browser-based live video support calls between agents and customers, with in-call chat, recording, and session analytics — no app install required.

---

## Links

| | |
|---|---|
| **Live App** | https://atomquest-video-platform.vercel.app |
| **GitHub** | https://github.com/adityaamann/atomquest-video-platform |
| **Backend** | Deployed on Render (auto-deploys from GitHub) |

---

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Agent | agent@demo.com | demo123 |

Customers join via invite link — no account needed.

---

## Tech Stack

**Frontend**
- React 18 + Vite
- Tailwind CSS (custom light theme)
- Socket.io Client 4
- react-hot-toast, qrcode.react

**Backend**
- Node.js + Express
- Socket.io 4 (server-relayed media — no P2P)
- Prisma ORM + PostgreSQL (Supabase)
- Multer (file + recording uploads)
- JWT authentication

**Infrastructure**
- Frontend → Vercel
- Backend → Render
- Database → Supabase (PostgreSQL)

---

## Local Setup

**Prerequisites:** Node.js 18+, a PostgreSQL database URL

**1. Clone the repo**
```bash
git clone https://github.com/adityaamann/atomquest-video-platform.git
cd atomquest-video-platform
```

**2. Install dependencies**
```bash
npm run install:all
```

**3. Configure environment variables**

Create `server/.env`:
```
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-here
PORT=3001
CLIENT_URL=http://localhost:5173
```

Create `client/.env`:
```
VITE_API_URL=http://localhost:3001
VITE_SOCKET_URL=http://localhost:3001
```

**4. Push database schema**
```bash
cd server && npx prisma db push && npx prisma generate
```

**5. Start development servers**
```bash
cd .. && npm run dev
```

App runs at `http://localhost:5173` · API at `http://localhost:3001`

---

## Features

1. **Agent authentication** — Secure signup/login with JWT (24h expiry), password strength meter, and auto-logout when token expires
2. **Session creation** — Rich form with title, customer name/email, priority (Low / Medium / High / Urgent), category, description, and scheduled time
3. **Instant invite** — Shareable invite link + QR code + one-click WhatsApp share; customers join with zero friction and no account
4. **Server-relayed video call** — WebRTC signaling through Socket.io (not peer-to-peer), with mute/camera toggle, Picture-in-Picture self-view, and network quality indicator
5. **In-call chat** — Real-time messaging with typing indicators, file attachments (images, PDFs, docs up to 10 MB), and smart auto-scroll that doesn't interrupt reading
6. **Call recording** — Agent-triggered recording using the MediaRecorder API; blob uploaded to server and downloadable from session history
7. **Session insights** — Rule-based analytics generated after every call: overall sentiment, keyword frequency, message counts, and positive/negative signal scoring — no external API required
8. **Admin dashboard** — Live session monitor with elapsed timers, all-time platform stats (sessions, agents, messages, recordings), and paginated session history with date filters

---

## Known Limitations

- **Recording on mobile Safari** — `MediaRecorder` with `video/webm` is unsupported on iOS; recording is unavailable on those browsers
- **Render cold start** — The free-tier backend spins down after inactivity; the first request after idle may take 30–60 seconds
- **No TURN server** — WebRTC may fail on restrictive enterprise or campus networks that block direct connections
- **Ephemeral file storage** — Chat file uploads and recordings are stored on the Render instance disk and will be lost on a server restart or redeploy
- **Single-instance state** — Active session state is held in memory; a server restart clears in-progress sessions

---

## License

MIT © 2025 Aditya Aman
