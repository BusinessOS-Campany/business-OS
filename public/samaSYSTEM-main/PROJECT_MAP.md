# PROJECT_MAP — SAMA CENTER (Physical Therapy Management System)

> **Generated:** 2026-07-05 (initial)  
> **Last Updated:** 2026-08-14
> **Node:** v22 | **npm:** 10
> **Platform:** Vercel (serverless monorepo)

---

## [TECH_STACK]

### Frontend (React 19 + Vite 8 + MUI 9)

| Package | Purpose |
|---------|---------|
| `react` / `react-dom` 19 | UI library |
| `react-router-dom` 7 | Client-side routing |
| `@mui/material` 9 | UI components |
| `@emotion/react` / `styled` | MUI styling |
| `@mui/x-date-pickers` | Date pickers |
| `react-hook-form` | Form management |
| `@hookform/resolvers` | Zod integration |
| `@tanstack/react-query` | Server state |
| `axios` | HTTP client |
| `recharts` | Charts |
| `date-fns` | Date utils |
| `zod` | Validation |
| `vite` 8 | Build tool |

### Backend (Express 5 + Prisma 7)

| Package | Purpose |
|---------|---------|
| `express` 5 | HTTP framework |
| `prisma` 7 + `@prisma/client` 7 | ORM (PostgreSQL) |
| `pg` + `@prisma/adapter-pg` | PostgreSQL driver |
| `jsonwebtoken` + `bcryptjs` | Auth (JWT + password hashing) |
| `helmet` + `cors` | Security |
| `express-rate-limit` | Rate limiting |
| `winston` | Async logging |
| `multer` | File uploads |
| `zod` | Request validation |
| `pdf-lib` + `exceljs` | PDF/Excel generation |

### Infrastructure

- **PostgreSQL 16** — Database
- **Vercel** — Hosting (monorepo services model)
- **Docker** (optional, for local dev)

---

## [SYSTEM_FLOW]

### User Roles (5 values)
1. **ADMIN** — Full access, bypasses all permission checks
2. **SUPERVISOR** — Supervisory access (seeded but not actively used in routes)
3. **RECEPTIONIST** — Front desk (limited permissions)
4. **THERAPIST** — Clinical staff
5. **PATIENT** — Portal access (not implemented)

### Permission System
- Each non-ADMIN user has a `permissions: string[]` field
- `PermissionGuard` component wraps frontend routes: admins bypass, others must have the specific permission
- `requirePermission` middleware on backend routes (admins bypass)
- Seed has 5 users; only admin has explicit permissions; others get `[]` (default)

### Key User Journeys

**Journey: Receptionist adds an advance for an employee**
```
Receptionist logs in → navigates to Advances
  → clicks "Add Advance" → employee select loads from GET /api/employees
    → selects employee → fills amount/date → saves
```

**Journey: Daily operations**
```
Staff logs in → Dashboard shows stats
  → Manage patients / sessions / appointments
    → Track expenses, salary advances
      → Generate daily/weekly/monthly reports
```

### API Endpoints (13 route groups)

| Prefix | Module | Auth | Permission |
|--------|--------|------|------------|
| `/api/auth` | Login, refresh, profile | None | None |
| `/api/dashboard` | Dashboard stats | JWT | None |
| `/api/patients` | Patient CRUD | JWT | `patients` |
| `/api/sessions` | Session CRUD | JWT | `sessions` |
| `/api/employees` | Employee CRUD | JWT | GET: none, POST/PUT/DELETE: `employees` |
| `/api/services` | Services list | JWT | None |
| `/api/appointments` | Appointment CRUD | JWT | `appointments` |
| `/api/calendar` | Calendar events CRUD | JWT | `calendar` |
| `/api/advances` | Salary advances CRUD | JWT | `advances` |
| `/api/expenses` | Expenses CRUD | JWT | `expenses` |
| `/api/chat` | Chat/messaging | JWT | `chat` |
| `/api/users` | User CRUD | JWT | `users` |
| `/api/notifications` | Notifications | JWT | None |

### Prisma Models (10 tables + 1 enum)

- **Role** enum: ADMIN, SUPERVISOR, RECEPTIONIST, THERAPIST, PATIENT
- **User** — Auth, role, permissions
- **Patient** — Clinic patients
- **Service** — Clinic services with prices
- **Employee** — Staff employees (salary, department)
- **Appointment** — Patient appointments
- **Session** — Treatment sessions
- **SalaryAdvance** — Employee salary advances
- **Expense** — Clinic expenses
- **CalendarEvent** — Clinic events
- **Notification** — System notifications
- **Conversation / ConversationParticipant / Message** — Chat system

---

## [ARCHITECTURE]

### Project Structure
```
/SAMACENTERSYS/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma     # 10 models
│   │   ├── migrations/
│   │   └── seed.ts           # 5 users, 5 employees, 12 services
│   ├── src/
│   │   ├── config/           # env, database, cors
│   │   ├── middleware/       # authenticate, authorize, errorHandler, rateLimiter, validate
│   │   ├── modules/          # 13 feature modules
│   │   │   ├── auth/
│   │   │   ├── dashboard/
│   │   │   ├── patients/
│   │   │   ├── sessions/
│   │   │   ├── employees/
│   │   │   ├── services/
│   │   │   ├── appointments/
│   │   │   ├── calendar/
│   │   │   ├── advances/
│   │   │   ├── expenses/
│   │   │   ├── chat/
│   │   │   ├── users/
│   │   │   └── notifications/
│   │   ├── shared/           # logger, errors, pagination
│   │   └── app.ts
│   ├── api/index.ts          # Vercel serverless entry
│   └── vert.config.json
│
├── frontend/
│   ├── src/
│   │   ├── features/         # 13 feature directories
│   │   │   ├── auth/         # LoginPage, UnauthorizedPage, LockScreen
│   │   │   ├── dashboard/
│   │   │   ├── patients/
│   │   │   ├── sessions/
│   │   │   ├── appointments/
│   │   │   ├── calendar/
│   │   │   ├── advances/
│   │   │   ├── expenses/
│   │   │   ├── employees/
│   │   │   ├── users/
│   │   │   ├── reports/      # Daily, Weekly, Monthly
│   │   │   ├── profile/
│   │   │   └── chat/         # (orphaned - not routed)
│   │   ├── layouts/          # AuthLayout, MainLayout
│   │   ├── contexts/         # AuthContext, ThemeContext, LanguageContext, LayoutContext
│   │   ├── services/         # api.ts (axios)
│   │   ├── locales/          # en.json, ar.json (434+ keys each)
│   │   └── App.tsx           # Route definitions
│   ├── public/
│   │   ├── 404.html          # SPA fallback redirect
│   │   ├── manifest.json     # PWA
│   │   └── sw.js             # Service worker
│   ├── vercel.json           # SPA rewrite
│   └── vite.config.ts
│
├── vercel.json               # Root: services model (frontend + backend)
├── AGENTS.md
└── PROJECT_MAP.md
```

### Key Decisions
| Decision | Rationale |
|----------|-----------|
| **Feature-based modules** | Self-contained routes/controller/service/schema per module |
| **No repository pattern** | Prisma IS the repository. Services call Prisma directly |
| **Permission on each route** | `requirePermission` middleware + `PermissionGuard` component |
| **Admin bypass** | Admin role skips all permission checks (both frontend + backend) |
| **JWT + refresh tokens** | Access: 15min, Refresh: 7d, auto-rotation on 401 |
| **Soft deletes** | All entities use `deletedAt` |
| **Translation system** | Context-based, EN/AR with RTL support |
| **No Redux** | TanStack Query + Context is sufficient |
| **Vercel monorepo** | Services model with rewrites: /api/* → backend, /* → frontend |

---

## [VERCEL DEPLOYMENT]

### Architecture
- **Root** `vercel.json`: Services model
  - `frontend` service → Vite build → serves static SPA
  - `backend` service → Express via `api/index.ts`
- **Rewrites**: `/api/*` → backend, `/(.*)` → frontend
- **Frontend** `vercel.json`: SPA rewrite `/(.*)` → `/index.html` (may not work effectively in services model)

### Known Issues
- SPA rewrite in services model: direct navigation to `/dashboard`, `/login`, etc. may still 404
- **Fix**: `404.html` in `/public` auto-redirects to `/` on any 404
- Logout and API 401 now redirect to `/` (not `/login`) to avoid 404
- Service worker uses `clients.claim()` for immediate control

### Key Changes Made
| Change | Date | Files |
|--------|------|-------|
| SPA 404 redirect | recent | `frontend/public/404.html` |
| Logout redirect: /login → / | recent | `AuthContext.tsx` |
| API 401 redirect: /login → / | recent | `api.ts` |
| Manifest start_url: /dashboard → / | recent | `manifest.json` |
| Service worker clients.claim() | recent | `sw.js` |

---

## [ORPHANS & PENDING]

### Items
| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | **Orphan pages**: `ReportsPage.tsx`, `ChatPage.tsx` | 🔲 Not routed | Files exist but no route in App.tsx |
| 2 | **Translation overhang**: `therapists`, `rooms`, `messages`, `analytics`, `settings` keys exist but have no pages | 🔲 Unused | Leftover from earlier feature set |
| 3 | **Reports routes** lack `PermissionGuard` | 🔲 Missing guard | `/reports/daily`, `/reports/weekly`, `/reports/monthly` open to all authenticated users |
| 4 | **Profile route** lacks `PermissionGuard` | 🔲 Missing guard | `/profile` open to all authenticated users |
| 5 | **Receptionist permissions** | 🔲 Not seeded | Receptionist has no permissions in seed; must be added manually or via UI |
| 6 | **AGENTS.md outdated** | 🔲 Needs update | Says "only User model + auth" but project has 13 modules |
| 7 | **Frontend employee fetch** has no error handling | 🔲 Silent failure | `api.get('/employees')` has no `.catch()` — errors silently swallowed |
| 8 | **Receivables report** | 🔲 Placeholder | `ReceivablesReportPage` mirrors monthly report (`/reports/receivables`); real content (patient/session/subscription dues) pending user spec |

### Next Steps
1. Deploy backend change (employees GET permission removed) so receptionist can see employee list
2. Update AGENTS.md to reflect actual state
3. Add error handling to frontend API calls for better debugging
