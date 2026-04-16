# Logical Components — Unit 1: Backend Authentication

## Component Map

```
┌─────────────────────────────────────────────────────┐
│                   Express App (app.js)               │
│                                                     │
│  ┌──────────────┐    ┌──────────────────────────┐   │
│  │  AuthRouter  │    │     AuthMiddleware        │   │
│  │  /auth/*     │    │  (all protected routes)   │   │
│  └──────┬───────┘    └────────────┬─────────────┘   │
│         │                         │                  │
└─────────┼─────────────────────────┼──────────────────┘
          │                         │
          v                         v
┌─────────────────┐       ┌─────────────────────┐
│ GoogleAuthSvc   │       │  DB (pg pool)        │
│ - verifyToken   │       │  sessions table      │
│ - upsertTenant  │       │  (token lookup)      │
│ - upsertUser    │       └─────────────────────┘
│ - createSession │
└────────┬────────┘
         │
    ┌────┴────────────┐
    │                 │
    v                 v
┌────────┐     ┌──────────┐
│Google  │     │DB (pg)   │
│OAuth   │     │tenants   │
│API     │     │users     │
│(verify)│     │sessions  │
└────────┘     └──────────┘

┌──────────────────────────────┐
│  POST /reports handler       │
│  (app.js — modified)         │
│                              │
│  multer → S3Service          │
└──────────────┬───────────────┘
               │
               v
       ┌───────────────┐
       │   S3Service   │
       │ - getS3Key()  │
       │ - uploadToS3()│
       └───────┬───────┘
               │
               v
       ┌───────────────┐
       │   AWS S3      │
       │ (images bucket)│
       └───────────────┘
```

## Component: DB Connection Pool

**Existing component** (`src/db/client.js`) — no changes.
- All new modules (`googleAuthService.js`, `auth.middleware.js`) import `{ query }` from `./db/client.js`
- `googleAuthService.js` additionally uses raw `pool.connect()` for transaction support (`BEGIN`/`COMMIT`/`ROLLBACK`)

## Component: Google OAuth2 Client

**Logical component** within `googleAuthService.js`:
- Single `OAuth2Client` instance, initialized with `GOOGLE_CLIENT_ID`
- Stateless — safe to share across requests
- Instantiated at module load (not per-request) for efficiency

## Component: S3 Client

**Logical component** within `s3Service.js`:
- Single `S3Client` instance, initialized with `{ region: process.env.AWS_REGION }`
- Credentials resolved by AWS SDK default chain (env vars → EC2 instance metadata → etc.)
- Stateless — safe to share across requests

## Component: Session Store (PostgreSQL)

**Logical component** — the `sessions` table acts as the session store.
- No Redis, no in-memory store — DB is the single source of truth
- Adequate for 1-user scale; no connection overhead vs dedicated session server
- Natural expiry enforcement via `expires_at > NOW()` in query

## Infrastructure Boundaries

| Component | Runs In | Accessed Via |
|-----------|---------|-------------|
| Express API | Docker container (local) / EC2 Docker (prod) | HTTP port 3300 |
| PostgreSQL | Docker container (local) / EC2 Docker (prod) | pg pool, port 5432 |
| Google OAuth API | External (Google infrastructure) | HTTPS from BE |
| AWS S3 | AWS (remote) | AWS SDK from BE |
