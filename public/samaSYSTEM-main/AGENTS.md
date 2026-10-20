# Workflow

- ALWAYS commit and push to `origin/main` after completing any code change (user prefers auto-push, no need to ask).
- Run the relevant lint (`npm run lint`) before committing.
- Backend lives at `H:\hitham\new project\SAMACENTERSYS\backend`, frontend at `H:\hitham\new project\SAMACENTERSYS\frontend`.
- Website project (separate repo): `H:\hitham\new project\SAMACENTERSYS`'s sibling `H:\hitham\new project\SAMACENTERWEB` (remote `samaweb`).
- `prisma db push` fails with `P4002` (Supabase `auth.users` cross-schema). Use direct SQL + `npx prisma generate` instead.

# Commands

## Backend
- Lint: `cd backend; npm run lint` (tsc --noEmit)
- Dev: `cd backend; npm run dev`
- Seed: `cd backend; npm run db:seed`
- Prisma generate: `cd backend; npm run db:generate`
- Migrate (push): `cd backend; npx prisma db push`

## Frontend
- Lint: `cd frontend; npm run lint` (tsc --noEmit)
- Dev: `cd frontend; npm run dev`
- Build: `cd frontend; npm run build`

# Summary — Clean Slate

Everything stripped down to minimum. The user will give step-by-step instructions to rebuild each feature.

## What remains

### Frontend
- `features/dashboard/DashboardPage.tsx` — simple placeholder with `dashboard.empty` translation key
- `features/auth/LoginPage.tsx` — login form
- `features/NotFoundPage.tsx` — 404
- `layouts/MainLayout.tsx` — sidebar only has Dashboard link
- `layouts/AuthLayout.tsx` — auth layout
- `App.tsx` — routes: `/login`, `/dashboard`, `/`, `/404`, catch-all

### Backend
- `modules/auth/` — authentication (login, verify token)
- `middleware/` — authenticate, authorize, errorHandler, rateLimiter, validate
- `config/` — database, env
- `shared/` — logger, etc.

### Database (Prisma)
- Only `User` model (with `Role` enum) remains
- All other models removed from schema
- Database has been `--force-reset` — empty

### Translations
- All keys still in `en.json` / `ar.json` (including unused ones for features to come)

## What was deleted
- All feature modules (patients, appointments, therapists, sessions, assessments, billing, documents, notifications, reports, search, settings, users)
- All Prisma models except User
- audit middleware, checkPatients script
- Dashboard stats cards, appointment list, recent patients, activity feed, categories, reviews
- Commerce features (removed previously)
