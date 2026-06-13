# AtomQuest Video Platform — Hackathon Project

## Project Overview
Real-time video support platform for customer support calls. Agent creates session → shares invite link → customer joins → browser-based WebRTC call routed through server via Socket.io.

## Architecture
- **Frontend**: React + Vite + Tailwind CSS → deployed on Vercel
- **Backend**: Node.js + Express + Socket.io → deployed on Railway
- **Database**: PostgreSQL + Prisma ORM
- **Media**: WebRTC signaling + Socket.io media relay (NO P2P — media routes through server)
- **Recording**: FFmpeg server-side via @ffmpeg-installer/ffmpeg + fluent-ffmpeg

## Key Constraint
Media MUST route through the server via Socket.io relay — NOT direct peer-to-peer WebRTC.
Implementation: MediaRecorder API → ArrayBuffer chunks → Socket.io emit → server relays → receiver MediaSource API.

## Project Structure
```
atomquest-video-platform/
├── client/           # React + Vite frontend
│   ├── src/
│   │   ├── pages/    # Login, Dashboard, CreateSession, AgentCall, JoinCall, CustomerCall, SessionHistory
│   │   ├── components/ # VideoPlayer, ChatPanel, CallControls
│   │   ├── hooks/    # useSocket, useMediaStream
│   │   ├── context/  # AuthContext
│   │   └── lib/      # api.js (axios instance)
│   ├── vite.config.js
│   └── tailwind.config.js
├── server/           # Node.js backend
│   └── src/
│       ├── index.js  # Entry point (Express + Socket.io)
│       ├── routes/   # auth.js, sessions.js, join.js, recording.js
│       ├── middleware/ # auth.js (JWT verification)
│       ├── socket/   # handlers.js (Socket.io event handlers)
│       └── lib/      # prisma.js (singleton client)
├── prisma/
│   └── schema.prisma
├── recordings/       # Server-side recording storage (gitignored)
└── CLAUDE.md
```

## Roles
- **AGENT**: Login with email/password (JWT). Can create/end sessions, start/stop recording.
- **CUSTOMER**: Joins via invite token only. No account needed. Cannot end sessions or record.

## Socket.io Event Map
| Event | Direction | Purpose |
|-------|-----------|---------|
| `join-session` | client→server | Join session room |
| `user-joined` | server→client | Notify room of new participant |
| `user-left` | server→client | Notify room of departure |
| `media-chunk` | client→server→client | Relay video/audio chunks |
| `send-message` | client→server | Send chat message |
| `receive-message` | server→client | Broadcast chat message |
| `recording-started` | server→client | Notify recording began |
| `recording-stopped` | server→client | Notify recording ended |
| `end-session` | client→server | Agent ends session |
| `session-ended` | server→client | Notify all to disconnect |

## Database Models
- User (id, email, password, role: AGENT|CUSTOMER, createdAt)
- Session (id, agentId, inviteToken, status: ACTIVE|ENDED, startedAt, endedAt, duration)
- Participant (id, sessionId, userId?, name, role, joinedAt, leftAt)
- ChatMessage (id, sessionId, senderId?, senderName, content, sentAt)
- Recording (id, sessionId, status: IN_PROGRESS|PROCESSING|READY, filePath, createdAt)

## Environment Variables
### Server (.env)
```
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret
PORT=3001
CLIENT_URL=http://localhost:5173
```

### Client (.env)
```
VITE_API_URL=http://localhost:3001
VITE_SOCKET_URL=http://localhost:3001
```

## Development
```bash
# Install all deps
npm run install:all

# Run migrations
cd server && npx prisma migrate dev

# Start dev servers (from root)
npm run dev
```

## Priority Build Order
1. ✅ Project scaffold + deps
2. ✅ Prisma schema + migration
3. Agent auth (login/register)
4. Session creation + invite token
5. WebRTC video call with Socket.io relay
6. In-call chat
7. Role enforcement
8. Recording with FFmpeg
9. Session history + chat transcript
10. UI polish + error handling

## Deployment
- Frontend: `cd client && vercel --prod`
- Backend: Push to Railway (auto-deploys from GitHub)
- Set environment variables in Railway dashboard
- Run `npx prisma migrate deploy` in Railway build command
