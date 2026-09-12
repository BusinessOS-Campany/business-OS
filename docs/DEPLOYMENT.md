# Deployment Guide

## Prerequisites

- Node.js 24.19.x
- PostgreSQL 18.x
- Docker & Docker Compose (recommended)

## Quick Start (Docker)

```bash
# 1. Clone and install
git clone <repo-url> && cd erp
npm install

# 2. Copy environment config
cp .env.example .env.local
# Edit .env.local with your DATABASE_URL, AUTH_SECRET, etc.

# 3. Start PostgreSQL
docker compose up -d

# 4. Run migrations
npx prisma migrate dev

# 5. Seed platform admin
npx prisma db seed

# 6. Start dev server
npm run dev
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `DIRECT_URL` | No | Direct connection (bypasses pgbouncer) |
| `AUTH_SECRET` | Yes | Better Auth secret (min 16 chars) |
| `AUTH_URL` | No | Auth base URL (defaults to NEXT_PUBLIC_APP_URL) |
| `NEXT_PUBLIC_APP_URL` | Yes | App base URL |
| `LOG_LEVEL` | No | fatal/error/warn/info/debug/trace (default: info) |
| `SEED_PLATFORM_ADMIN_EMAIL` | Yes | Platform admin email for seeding |
| `SEED_PLATFORM_ADMIN_PASSWORD` | Yes | Platform admin password (min 8 chars) |
| `STORAGE_PATH` | No | Local storage path (default: ./.data/storage) |

## Production Build

```bash
npm run build  # Uses --webpack (required for serwist PWA plugin)
npm start
```

## Database

- PostgreSQL 18 with `pgcrypto` extension
- All migrations in `prisma/migrations/`
- `DATABASE_URL` format: `postgresql://user:pass@host:port/dbname`

## PWA

- Service worker via Serwist v9
- Webpack mode required (turbopack not supported)
- Dev mode: SW disabled (`disable: process.env.NODE_ENV === "development"`)
- Icons in `public/` (192x192, 512x512)

## Health Checks

```
GET /api/health          → 200 { status: "ok" }
GET /api/health/database → 200 { status: "ok", latencyMs: N }
```

## Monitoring

- Structured JSON logging via Pino
- Every request gets a `x-request-id` (UUID)
- Request duration logged in ms
- 5xx errors logged with full error context
