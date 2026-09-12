# Architecture Overview

## Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js | 16.3.x |
| Language | TypeScript | ~6.0 (strict) |
| Styling | Tailwind CSS | 4.3.x |
| UI Components | shadcn/ui | latest |
| ORM | Prisma | 7.9.x |
| Database | PostgreSQL | 18.6 |
| Auth | Better Auth | 1.x |
| PWA | Serwist | 9.x |
| Testing | Vitest | 4.x |
| Logging | Pino | 9.x |

## Deployment Model

Single Next.js monolith deployed via Docker. All modules (platform admin, tenant admin, business logic, API, AI, offline sync) are routes within one application.

## Directory Structure

```
src/
├── app/                    # Next.js App Router routes
│   ├── api/                # API routes (v1 + health + auth + platform)
│   ├── app/[module]/       # Tenant app shell (dynamic module routing)
│   ├── platform-admin/     # Platform admin console
│   └── layout.tsx          # Root layout
├── core/                   # Domain logic (zero UI dependencies)
│   ├── ai/                 # AI layer: provider, tools, executor, confirm, metering
│   ├── audit/              # Append-only audit service
│   ├── auth/               # Better Auth config + server helpers
│   ├── config/             # Environment validation, load-env
│   ├── custom-fields/      # EAV-lite engine (21 types, formulas, crypto)
│   ├── db/                 # Prisma client, tenant-guard, generated types
│   ├── expenses/           # Expense CRUD service
│   ├── http/               # ApiError, withRoute, security headers
│   ├── integrations/       # API keys, rate limits, webhooks, import, export, backup, storage
│   ├── inventory/          # Stock movements, ledger, low-stock detection
│   ├── logging/            # Pino logger with requestId
│   ├── modules/            # Module constants, money utils
│   ├── permissions/        # Role-based catalog (owner/admin/manager/cashier/accountant/viewer)
│   ├── pos/                # POS hold/resume, receipt generation
│   ├── purchases/          # Atomic purchase receipt service
│   ├── reports/            # Reports v1 service + builder
│   ├── sales/              # Atomic sale service
│   ├── seq/                # Number sequence allocator
│   ├── tenancy/            # Tenant context, settings, org resolution
│   └── workflows/          # Workflow engine: rules, bus, worker, actions
├── proxy.ts                # Edge middleware (security headers, request-id)
└── components/             # Shared React components
```

## Tenancy Model

- **Shared database, shared schema**: All tenant data lives in one PostgreSQL database
- **`organizationId`**: Every tenant-owned row carries this FK column with an index
- **Tenant resolution**: Session carries `activeOrganizationId`; all queries scoped via `tenantFilter()`
- **Isolation enforcement**: Application-layer (`tenantFilter` + `assertOwned` + permission checks + 20+ isolation tests)

## Data Integrity

- Money stored as `BigInt` minor units (no floating point)
- Quantities as `Decimal(18,3)`
- Stock ledger: every quantity change has a `stockMovement` row; `SUM(qtyDelta) == stockLevel.qty` invariant
- Sales/Purchases are atomic transactions: invoice + items + payments + stock + cash + audit — all roll back on failure
- Number sequences: gap-tolerant, allocated inside the caller's transaction
- Audit logs: append-only, written in the same transaction as business changes

## Layering Rules

1. `src/core/` has ZERO React/Next.js imports — pure domain logic
2. Services accept `PrismaClient` as parameter (dependency injection)
3. Every read passes through `tenantFilter()`, every write through `tenantOwn()`
4. API routes are thin wrappers: parse input → call service → return `ok()` / throw `ApiError`
5. Security headers applied at both proxy.ts (all responses) and withRoute (API responses)
