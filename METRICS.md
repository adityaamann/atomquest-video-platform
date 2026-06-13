# SupportVision — Performance Metrics

## Concurrency

- **Concurrent video sessions**: ~10 on a single Railway instance (512MB RAM)
  - Each session = 2 WebSocket connections + in-memory participant state
  - Bottleneck: RAM for session state and upload buffer, not CPU

## Latency

- **Session setup time**: < 2 seconds (invite validation → room-state event)
- **WebRTC connection time**: < 1 second on local network (STUN only, no TURN)
- **Socket.io signaling latency**: < 50ms on localhost, < 100ms on Railway → Vercel
- **Session insights generation**: < 50ms (rule-based, in-process computation)

## Throughput

- **Chat messages**: ~1000/second (in-process broadcast, no DB bottleneck on hot path)
- **File uploads**: 10MB max per file, handled by multer with UUID filenames
- **Recording upload**: streams directly to disk, no memory buffering after stop

## Reliability

- **Reconnect grace period**: 30 seconds — browser refresh during a call does not drop the other participant
- **Session deduplication**: POST `/api/sessions` is idempotent — returns existing ACTIVE session
- **Crash recovery**: `uncaughtException` and `unhandledRejection` handlers prevent silent failures
- **DB indexes**: `agentId`, `status`, `sessionId` indexed across all hot query paths

## Security

- **JWT expiry**: 7 days
- **Password hashing**: bcrypt with salt rounds = 12
- **File path traversal**: prevented via `path.basename()` on uploaded filenames
- **Security headers**: Helmet.js (CSP, HSTS, X-Frame-Options, etc.)
- **Input validation**: email regex + min 8-char password enforced on both frontend and backend

## Infrastructure Costs (estimated)

| Service | Plan | Monthly |
|---------|------|---------|
| Railway (backend) | Hobby | ~$5 |
| Vercel (frontend) | Free | $0 |
| Supabase (DB) | Free | $0 |

**Total**: ~$5/month for a fully functional production deploy
