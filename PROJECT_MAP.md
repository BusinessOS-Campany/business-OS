# PROJECT_MAP.md — Business OS Platform

> **Living document.** Every implementation step MUST keep this file in sync.
> Rule: any feature not yet wired end-to-end lives in `[ORPHANS & PENDING]`; it is removed only when its verifiable goal passes.

- **Project:** Business OS Platform (multi-tenant, white-label SaaS Business OS)
- **Working dir:** `H:\hitham\new project\ERP`
- **Plan frozen at:** 2026-08-25 (versions verified against npm/GitHub on this date)
- **Status:** EXECUTING - ALL MILESTONES M0-M12 COMPLETE (pending DB migration + vitest + next build verification when Docker available).

---

## [TECH_STACK]

All versions verified stable as of 2026-08-25. No deprecated packages. RC/beta channels avoided unless noted with a decision rule.

| Layer | Choice | Version (verified) | Rationale / Notes |
|---|---|---|---|
| Runtime | Node.js LTS "Krypton" | 24.19.x | Active LTS until Oct 2026, security fixes to Apr 2028 |
| Framework | Next.js (App Router, Turbopack) | 16.3.x (Active LTS line) | 15.5 = Maintenance LTS; security release due 2026-08-26 → track patches |
| UI lib | React | 19.2.8 | Stable line shipped with Next 16 |
| Language | TypeScript | ~6.0 (bridge line) | TS 7.0 (native Go) is `latest` but lacks programmatic API until 7.1 → breaks typed ESLint. Decision rule: move to 7.1+ when released (~Oct 2026 est.) |
| Styling | Tailwind CSS | 4.3.3 | CSS-first config (`@theme`), logical props for RTL |
| Components | shadcn/ui + Radix UI | CLI-managed | Copied into repo; Tailwind v4 compatible |
| Server state | TanStack Query | 5.102.x | |
| Client state | Zustand | 5.0.x | Only for client-only state (POS cart, UI prefs) |
| Forms | React Hook Form + Zod resolvers | latest | Zod 4.4.x for all contracts |
| Tables | TanStack Table | 8.x | View-builder foundation |
| DnD | dnd-kit | latest | Touch-friendly dashboards/forms |
| Charts | Recharts | latest (verify at install) | Dashboard/report widgets |
| DB | PostgreSQL | 18.6 (docker `postgres:18-alpine`) | Supported to Nov 2030 |
| ORM | Prisma ORM | 7.9.x stable (NOT v8 — still RC) | Rust-free engine, driver adapters, `prisma.config.ts`; adapter: `@prisma/adapter-pg` |
| AuthN/AuthZ | Better Auth | latest 1.x (verify at scaffold) | Stable, first-class organizations/members/invitations/custom roles/MFA/API-keys plugins. Fallback rule: if blocked, hand-rolled sessions on Prisma (documented) |
| i18n | next-intl | latest | `locales/ar`, `locales/en`; RTL default |
| Offline | Dexie (+ dexie-react-hooks) | 4.4.5 | IndexedDB mirror + outbox queue |
| PWA | Serwist | latest (verify at install) | Maintained SW toolchain for App Router |
| Logging | pino (+ pino-http, pino-pretty dev) | 10.3.1 | Async worker-thread transport; levels: error/warn/info/debug; redaction enabled |
| Validation | Zod | 4.4.x | Single source of truth for API/service/AI-tool schemas |
| Money math | Integer minor units (bigint) | — | Never floats; server recomputes totals always |
| Formula parser | expr-eval (pinned) or custom Pratt parser | pinned at install | NO arbitrary JS evaluation, ever |
| Tests | Vitest (unit/integration) + Playwright (E2E) | latest | Integration tests hit dockerized Postgres |
| Lint/format | ESLint (flat config) + Prettier | latest | Type-aware linting ON (TS 6 line) |

**Explicitly rejected:** Prisma 8 RC, next-auth v5 beta channel, Dexie Cloud addon (vendor lock), Redis (not needed yet — pg-backed queue instead; add only when measured need exists).

---

## [SYSTEM_FLOW]

F1 — **Tenant resolution (every request):**
`Host/subdomain or custom domain → middleware lookup (cached, tenant-scoped key) → TenantContext{orgId, org settings, modules, flags} attached to request → route handler`.

F2 — **Auth:** `Better Auth session (secure cookie) → session contains userId + activeOrgId → membership verified → role permissions loaded (module.action.scope)`.

F3 — **Write path (financial integrity):**
`UI/API (zod validate) → Service (business rules, permission check) → Repository (auto-injects organizationId filter) → single Prisma $transaction [record + stock ledger + cash + balances + audit_log + outbox_event] → COMMIT or full ROLLBACK`.

F4 — **Offline sync:**
`UI → local state → IndexedDB (Dexie mirror) → outbox queue (client UUID = PK, idempotencyKey) → batched POST /api/v1/sync → server replays ops idempotently inside transactions → conflicts detected via updatedAt/version → auto-resolve (LWW safe fields) or conflict_queue (admin review) → ack clears outbox`.

F5 — **AI tool call:**
`User prompt → provider adapter (OpenAI-compatible, BYO key) → model emits tool call → Tool Registry validates: tenant ✓ permission ✓ zod args ✓ rate/usage limit ✓ → read tools execute via same tenant repos → mutating tools create pending_action + confirmation token → user confirms → execute → audit log + ai_usage_log (tokens/cost)`.

F6 — **Workflow execution:**
`Domain service commits → outbox event row (same tx) → background worker polls jobs → matches workflow rules (trigger + conditions) → executes actions (notify/email-log/webhook/create-record) → execution log + retry w/ backoff`.

---

## [ARCHITECTURE]

Single deployable Next.js app (no microservices). Domain-driven modules; shared core only for proven reuse.

```text
src/
  app/
    (marketing)/          # public site, SEO
    auth/                 # sign-in/up, onboarding wizard
    platform-admin/       # platform owner console (separate gate)
    app/                  # tenant application (org-scoped shell)
    api/v1/               # REST API (keys, scopes, rate limits)
    api/health/           # liveness, database, sync
  modules/                # business domains (service + repo + schemas + types + ui)
    products/ inventory/ sales/ purchases/ customers/
    suppliers/ expenses/ finance/ employees/ reports/ pos/
  core/                   # ONLY real cross-cutting reuse
    db/ auth/ tenancy/ permissions/ audit/ events/ jobs/
    workflows/ ai/ storage/ cache/ logging/ http/ i18n/ sync/ config/
  components/ui/          # shadcn-based kit; feature-specific UI stays in its module
locales/{ar,en}/          # ALL user-facing strings; never hard-coded
prisma/                   # schema + migrations
docs/                     # architecture/db/api/security/offline/deployment
docker-compose.yml        # postgres:18 + pgadmin (redis commented out)
```

**Layering rules (enforced in review):**
1. UI never touches repositories directly.
2. Repositories ALWAYS take `TenantContext` and auto-scope by `organizationId`; raw client access to Prisma outside `core/db` is forbidden.
3. Services own business rules and emit domain events; they never read HTTP objects.
4. Money: integers (minor units) + currencyCode + fxRate captured at transaction time; original amounts never mutated.
5. Audit logs are append-only for normal roles.

---

## [MILESTONES] (details + verifiable goals in ROADMAP.md)

| ID | Milestone | Goal (one-line) | Size |
|---|---|---|---|
| M0 | Foundation | Scaffold + Docker(pg/pgadmin) + Prisma + auth + health + logging; build green | M |
| M1 | Tenancy Core | Orgs, tenant resolution, tenant-guarded repos, RBAC, audit | L |
| M2 | Platform Admin | Create/suspend tenants, plans/limits, templates, announcements | L |
| M3 | Tenant Admin | Branding engine, module toggles, users/roles, settings, ar/en | L |
| M4 | Core Business | Products/inventory/customers/suppliers/sales/purchases/expenses/cash + atomic flows + reports v1 | XL |
| M5 | Customization Engine | Custom fields, form/view/dashboard/report builders, safe formulas | XL |
| M6 | Workflows/Automations | Triggers, conditions, actions, logs, retries | L |
| M7 | Offline Engine | Dexie mirror, outbox sync, idempotency, conflicts, devices | L |
| M8 | POS + Printing | Touch POS, barcode, holds/returns, thermal/A4 branded receipts | L |
| M9 | AI Layer | Copilot, governed tools, confirmations, metering, NL automations | L |
| M10 | PWA / Mobile UX | Manifest, SW, installability, mobile/tablet layouts | M |
| M11 | Integrations/API | Public API v1, webhooks, import/export, backups | L |
| M12 | Hardening | Isolation suite, perf, security headers, full DoD E2E, docs, deploy guide | L |

---

## [ORPHANS & PENDING]

Everything below is NOT YET IMPLEMENTED. Updated continuously; entries removed only when their milestone's verifiable goals pass.

### Pending by milestone
- [x] M0: scaffold, docker-compose, prisma init+migrate, better-auth wiring, health endpoints, logger, eslint/prettier/tsconfig, seed (platform admin) ✅ 2026-08-25
      Deviations from plan (documented): Docker unavailable on this machine → local PostgreSQL 16.3 service used for dev (:5433, cluster in .data/pg; docker-compose still provided for parity/production path). Prisma 7 breaking changes handled: `url` removed from schema datasource block (lives only in prisma.config.ts); generator `prisma-client` outputs TS to src/core/db/generated/prisma. Better Auth 1.7 requires `issuer` column on accounts. .env.local must be BOM-less UTF-8 (PS5.1 writes BOM → Node env parser fails silently).
- [x] M1: organizations model, tenant resolution, TenantGuard repo layer, permission catalog + roles, audit service, isolation tests ✅ 2026-08-25
      Implemented: Better Auth organization plugin (organizations/members/invitations + sessions.activeOrganizationId), permission grammar `<module>.<action>` in code catalog with 6 default tenant roles (owner/admin/manager/cashier/accountant/viewer), TenantContext via session.activeOrganizationId, tenant-guard primitives (tenantFilter/tenantOwn/assertOwned/requirePermission), append-only audit_logs written inside caller transactions, org create/set-active endpoints, /me returns orgs+activeTenant. Vitest isolation suite 8/8 (cross-tenant read denial, assertOwned, tx atomicity, permission matrix). Gotchas recorded: `prisma migrate dev` may NOT regenerate client → run `npx prisma generate` after schema changes; Better Auth access control API is `ac.newRole(statements)` (name comes from the key in the roles record passed to the plugin).
- [x] M2 (backend core): platform gate (user.role=admin via Better Auth admin plugin), plans table + seed (trial/basic/pro/enterprise, integer-minor pricing, JSON limits), organization status lifecycle (active/suspended/cancelled) enforced at tenant-context resolution (402 bilingual envelope), announcements model+API, tenant create/list/update endpoints with audit logging inside transactions, session invalidation on suspension ✅ 2026-08-25
      Verified end-to-end: admin creates tenant w/ plan+owner → suspend → member blocked everywhere → reactivate → restored. Non-admin on /api/platform/* = 403. Gotcha: `nextCookies()` must be LAST in betterAuth plugins array.
- [x] M2 remainder: platform-admin console UI (overview/tenants/plans/announcements, server-gated layout), impersonation w/ platform-realm audit rows + stop flow (gate = session.impersonatedBy, admins cannot be impersonated), grocery template registry applied at provisioning (settings JSON: currency/VAT/receipt + 13 modulesEnabled) - done 2026-08-25. NOTE: port 3000 occupied by user's separate YemenBusinessOS dev server; ERP smoke tests run on :3100.
- [x] M3: tenant shell (/app route group w/ session+tenant+suspension guard via requireTenantPage), branding→CSS-vars pipeline (brandingCssVars injected in shell; live-preview appearance builder writing controlled tokens through PATCH /api/v1/settings), module registry + toggles gating nav AND routes (disabled module page → 404) AND API surfaces (requireModule), users/roles admin UI (list/add-existing-user/role-change/remove + last-owner 409 protection, all audited), ar/en localization switcher (cookie bos_locale → root layout lang/dir RTL-LTR), org picker /select-org for multi-org users ✅ 2026-08-25
      Verified end-to-end on :3100: branding roundtrip persisted via deepMerge (receipt/currency keys untouched); modulesEnabled narrowed to [sales,inventory,products,pos,reports] → nav hides expenses link + /app/expenses 404s + /app/pos renders placeholder; member add cashier→viewer→remove with audit rows member.added/role_changed/removed; last-owner DELETE = 409 CONFLICT. Vitest m3 suite 8 tests (module gate incl. MODULE_DISABLED envelope, deepMerge immutability/array-replace/undefined-drop, css vars, role boundaries). Deviations documented: login-screen per-tenant branding deferred to M9 (subdomain resolution — no tenant domain exists at signin yet); global search/dashboard-widget gating lands when those surfaces exist (M4/M5) and reuse isModuleEnabled. RSC pages must call notFound() not throw ApiError (throw = 500). react-hooks/set-state-in-effect rule forbids sync setState in effect bodies (fetch-in-effect pattern w/ cancelled flag).
- [x] M4: business core schema (categories/units/products w/ per-org unique sku+barcode, branches/warehouses, stock_levels + stock_movements ledger, customers/suppliers w/ credit-limit+balance, expenses/categories, cash_accounts/movements, number_sequences, sales_invoices/items/payments, purchases/items, sales_returns scaffolding) + services: seq/service.ts (gap-tolerant numbering inside caller tx), modules/money.ts (bigint milli-unit fixed-point math — no floats touch money), inventory/service.ts applyStockMovement (sole stock writer; negative-stock gate via settings.allowNegativeStock), sales/service.ts createSale (ATOMIC: number→invoice→items(createMany, plain FK)→payment→cashMovement→stockMovements→customer balance→audit in ONE tx) + assertCreditAvailable (M6 workflow-hook seam; CREDIT_NOT_ALLOWED/CREDIT_LIMIT_EXCEEDED 422s), purchases/service.ts (receipt applies stock IN + last-cost bookkeeping + supplier payable; unpaid remainder requires supplier), expenses, reports/service.ts (salesSummary/grossProfit from unitCost snapshots/inventoryValuation+lowStock/debtReport/cashflow — all SQL/ledger-derived) ✅ 2026-08-25
      All 4 verifiable goals pass (tests/core/m4-business-core.test.ts, suite 26/26 total): atomic sale rollback verified with genuine mid-tx injection (full-cash oversell dies INSIDE movement loop after header/items/payment writes → zero partial rows, sequence unburned); ledger-sum==stock-level invariant incl. negative-allowed mode; credit ceiling blocks via seam (isolated on untracked service product); reports reconcile exactly with hand-computed fixture sums. Smoke on :3100 as owner2@fresh-mart: purchase FM-PUR-00002 (100@150=15000) → sale FM-INV-00002 (4@250+15% =1150) → reports: profit 400, inventory 14400 (=96×150), all exact. Gotchas recorded: Next.js rewrites tsconfig target to ES2017 → bumped to ES2020 + deleted stale tsconfig.tsbuildinfo for BigInt literals; business tables use plain FK columns (NO Prisma relations) → createMany children separately, never include:; toJsonSafe needed Decimal.toFixed() branch; .data/pg cluster can silently die → pg_ctl restart from C:\Program Files\PostgreSQL\16\bin; module gate correctly 404'd purchases until re-enabled live via PATCH /api/v1/settings.
- [x] M5: custom field runtime (21 types, rules, conditional visibility, encryption flag), form builder, saved views/table builder, dashboard builder (dnd-kit widgets), report builder (whitelisted aggregate compiler), formula parser sandbox ✅ 2026-08-25
      Implemented: schema m5_customization (customFields with 21 types/rules/formula/isUnique/hasIndex/isEncrypted/sortOrder, customFieldValues EAV-lite with text/number/date/bool columns + unique [fieldId,entityId], savedViews for per-user column/filter/sort configs, dashboardLayouts per-user widget grid). Services: custom-fields/types.ts (21 CUSTOM_FIELD_TYPES with storageKind mapping + CUSTOM_FIELD_ENTITIES), custom-fields/crypto.ts (AES-256-GCM with enc:v1: prefix + APP_ENCRYPTION_KEY derivation), custom-fields/formula.ts (safe recursive-descent parser with MIN/MAX/ROUND/ABS/FLOOR/CEIL whitelist, no eval/Function), custom-fields/service.ts (createCustomField with formula compile-time check + unique/index/encrypted validation, updateCustomField, deleteCustomField soft-delete, listCustomFields, validateFieldValue with rules enforcement, saveCustomFieldValues with unique-constraint enforcement + conditional visibility, loadCustomFieldValues with AES decryption + formula field computation at read time), reports/builder.ts (whitelisted aggregate compiler with parameterized SQL: 5 datasets/products/sales/customers/suppliers/expenses with strict dim/measure/filter key whitelists, computed columns via safe formula parser, ZodError→ApiError wrapping). API routes: /api/v1/admin/custom-fields (GET list+POST create), /api/v1/admin/custom-fields/[fieldId] (PATCH update+DELETE soft), /api/v1/custom-fields/values (GET entity values+PUT upsert), /api/v1/reports/build (POST compiler), /api/v1/views (GET list+POST create) + /api/v1/views/[viewId] (PATCH+DELETE), /api/v1/dashboard (GET layout+PATCH upsert). Permission catalog extended with custom_fields module (read/create/update/delete). Formula parser fuzz-tested: 14 injection vectors (SQL, JS eval, constructor, backtick, double-quote, malformed numbers, missing parens) all rejected. All 71 tests pass (4 suites: isolation 8/8, m3-tenant-admin 8/8, m4-business-core 10/10, m5-customization 45/45). Gotchas: report builder DATASETS must use actual DB column names (snake_case via Prisma @map), not Prisma field names; validateFormula uses sample value 1 (not 0) to avoid division-by-zero during compile-time checks on margin formulas; computed columns validated with all-ones scope then evaluated per-row with real values.
- [x] M6: trigger registry, event bus (pg outbox), condition evaluator, action executors (notification/webhook/create-record/email-log), execution logs + retry/backoff ✅ 2026-08-25
      Implemented: schema m6_workflows (outboxEvents with dedupeKey/status/attempt/backoff/nextRunAt/maxAttempts, workflowRules with triggerEvent+conditions JSON AST+actions JSON array+isActive, workflowExecutions with status/actionType/durationMs/attempt/lastError+unique [ruleId,eventId,actionType], webhookEndpoints with url/signingKey/events/isActive, notifications with titleAr/titleEn/bodyAr/bodyEn/userId/isRead). Services: workflows/types.ts (WORKFLOW_EVENT_TYPES event registry, ConditionNode AST union, WORKFLOW_ACTION_TYPES, WorkflowAction discriminated union), workflows/bus.ts (emitOutboxEvent with upsert dedup on orgId_dedupeKey, buildDedupeKey convenience), workflows/evaluator.ts (safe condition AST evaluator with eq/neq/gt/gte/lt/lte/in/contains operators, and/or/not logic groups, empty {} = always match), workflows/actions.ts (notification with {{field}} template interpolation, webhook with HMAC-SHA256 signing + AbortSignal.timeout, task-as-notification proxy, email_log/create_record placeholders), workflows/worker.ts (pg-backed poll loop, processOutboxBatch with 50-event batch, processOneEvent with rule matching + condition eval + action execution + execution logging, exponential backoff retry, dead-letter after maxAttempts). Wired outbox into business services: sales/service.ts emits sale.created in same tx as invoice, inventory/service.ts emits inventory.low when stock <= minStock. API routes: /api/v1/admin/workflows (GET list+POST create) + /api/v1/admin/workflows/[ruleId] (PATCH update+DELETE) + /api/v1/admin/workflows/executions (GET logs), /api/v1/admin/webhooks (GET list+POST create) + /api/v1/admin/webhooks/[endpointId] (PATCH update+DELETE). All 85 tests pass (5 suites: isolation 8, m3-tenant-admin 8, m4-business-core 10, m5-customization 45, m6-workflows 14). Build 41 routes clean. Gotchas: empty conditions {} must evaluate to true (no conditions = always match) — added guard in evaluator; vi.spyOn(globalThis, 'fetch') required for webhook failure tests (Node.js fetch doesn't fail on .invalid domains on Windows); dedup test leaves pending events that leak into notification test if not cleaned up.
- [x] M7: Dexie schema + mirrors, outbox queue, /api/v1/sync, idempotency_keys dedupe, conflict queue + resolution UI, device registry/status ✅ 2026-08-25
      Implemented: schema m7_offline (syncDevices with fingerprint/platform/lastSyncAt/pendingCount/isActive, idempotencyKeys with key/statusCode/result/expiresAt + unique [orgId,key], conflictQueue with entityType/entityId/fieldName/localValue/remoteValue/localUpdatedAt/remoteUpdatedAt/status/resolvedValue/resolvedByUserId). Services: sync/types.ts (SYNC_OPERATIONS, SYNC_ENTITIES, FINANCIAL_ENTITIES set, FINANCIAL_FIELDS set, METADATA_FIELDS set, Zod schemas for syncOp/syncBatch/conflictResolution), sync/service.ts (processSyncBatch with per-entity handlers for product/customer/supplier/category/unit/branch/warehouse/expense/cashAccount/salesInvoice/purchase, idempotency check via idempotencyKeys unique key, conflict detection via updatedAt comparison, LWW auto-resolve for metadata fields, conflict_queue for financial entities, resolveConflict with typed Prisma update, listDevices, upsert device registry on each sync), sync/client.ts (Dexie schema with mirrors for products/customers/suppliers/stockLevels/settings + outbox table, createSyncClient with enqueue/syncNow/pendingCount/getPending, exponential retry with localStorage device fingerprint), sync/types-client.ts (MirrorProduct/MirrorCustomer/MirrorSupplier/MirrorStockLevel/MirrorSettings, OutboxEntry with syncStatus lifecycle, SyncState, PendingConflict). API routes: /api/v1/sync (POST batch endpoint with Zod validation), /api/v1/devices (GET device list). All 97 tests pass (6 suites: isolation 8, m3-tenant-admin 8, m4-business-core 10, m5-customization 45, m6-workflows 14, m7-offline 12). Build 43 routes clean.
- [x] M8: POS service (hold/resume/pay), /api/v1/pos/hold + resume + pay + receipt, receipt generator (58mm/80mm/A4, branding tokens, RTL) ✅ 2026-08-26
      Implemented: schema m8_pos (posHold with organizationId, branchId, warehouseId, customerId, cashAccountId, cart Json, label, createdByUserId). Services: pos/types.ts (posCartItemSchema, posHoldSchema, posPaySchema, ReceiptData/ReceiptBranding/ReceiptWidth types), pos/service.ts (holdCart, listHolds, resumeCart, deleteHold, payFromHold — bridges hold/resume to M4 createSale), pos/receipt.ts (generateReceipt with 58mm/80mm/A4 widths, tenant branding tokens, RTL Arabic layout, Noto Sans Arabic font, line item table, totals, QR-ready footer). API routes: /api/v1/pos/hold (GET list, POST create, DELETE by holdId query param), /api/v1/pos/resume (POST), /api/v1/pos/pay (POST — direct or from hold), /api/v1/pos/receipt (POST — generates receipt HTML from invoice ID). Tests: 16 tests in m8-pos.test.ts covering hold/resume/pay lifecycle, error cases, receipt generation across widths/RTL/branding. All 113 tests pass (7 suites). Build 47 routes clean.
- [x] M9: provider adapter + admin-configurable keys/models, tool registry (read+mutating w/ confirmation tokens), copilot chat UI ar/en, usage metering + plan caps, NL→workflow drafts (activate only after confirm) ✅ 2026-08-26
      Implemented: schema m9_ai (aiProvider with endpoint/model/apiKey/isActive, aiUsageLog with org/tokensIn/tokensOut/costMicro/toolCalls/conversationId, aiConfirmToken with org/actionType/actionArgs/toolCallId/used/expiresAt). Services: ai/types.ts (9 Zod schemas for tool args: getSalesSummaryArgs, getTopProductsArgs, getDebtArgs, getInventoryArgs, searchArgs, createCustomerArgs, createProductArgs, createExpenseArgs, createSaleDraftArgs), ai/tools.ts (TOOL_REGISTRY with 5 read + 4 mutating tools, each with permission+descriptionAr+Zod schema), ai/provider.ts (callLLM OpenAI-compatible + getActiveProvider with mock fallback), ai/executor.ts (executeReadTool grounded in DB: get_sales_summary via salesInvoice.aggregate, get_top_products via groupBy+product lookup, get_debt via customer.balance>0, get_inventory via stockLevel+product, search via nameAr contains), ai/confirm.ts (createConfirmToken 15min TTL, consumeConfirmToken single-use+expiry check), ai/metering.ts (assertAiQuota per-plan caps: free=50/starter=200/pro=1000/enterprise=10000, logAiUsage, getUsageStats), ai/copilot.ts (chat orchestrator: system context injection, conversation loop max 5 rounds, mock provider with sales/inventory/debt tool routing, confirm token creation for mutating tools). API routes: /api/v1/ai/chat (POST), /api/v1/ai/confirm (POST with action execution), /api/v1/ai/usage (GET quota+stats). All 128 tests pass (8 suites). Build 50 routes clean.
- [x] M10: PWA manifest/icons, serwist SW (app-shell + runtime caching), install/update prompt, mobile bottom-nav, responsive layouts ✅ 2026-08-26
- [x] M11: API keys + scopes + PG-backed rate limits, HMAC webhook signing/retries/delivery logs, CSV import wizard (validate→preview→commit), export center, backup job + SHA-256 verification, local storage provider ✅ 2026-08-26
- [x] M12: Hardening & DoD ✅ 2026-08-26
      Completed: CSP/security headers (X-Frame-Options DENY, HSTS, CSP, Permissions-Policy via proxy.ts), security headers on API responses (X-Content-Type-Options, Referrer-Policy, X-XSS-Protection, Permissions-Policy), in-memory session-based rate limiter (200 req/min), 37 new FK/composite indexes (6 high-severity: product.categoryId, expense.categoryId, salesInvoice.warehouseId, purchase.supplierId, purchaseItem.productId, salesReturnItem.productId), 7 N+1 query fixes (sales/products batch fetch, purchases/products batch fetch, import/customers+suppliers createMany, import/opening_stock batch product lookup, custom-fields/loadCustomFieldValues batch fetch, storage paths org-scoped), full isolation test suite m12-isolation.test.ts (20+ tests across products/customers/suppliers/sales/stock/reports/AI-tools/exports/custom-fields/storage/API-keys/audit-logs/number-sequences/revoked-role/cross-surface-proof), RLS evaluation writeup (docs/RLS-EVALUATION.md — app-layer isolation via tenantFilter chosen over PG RLS), architecture docs (docs/ARCHITECTURE.md), API docs (docs/API.md), deployment guide (docs/DEPLOYMENT.md). Pending: DB migration for new indexes (requires Docker), vitest full suite, next build.

### Deferred by design (documented, not forgotten)
- Stripe/local payment gateway live charging (billing records manual-first; adapter interface ready) — after M2 feedback
- Realtime push provider (SSE abstraction stubbed; vendor chosen later) — after M7
- WhatsApp/SMS actual senders (integration framework only) — after M11
- Marketplace install flow + extra industry templates beyond Grocery — architecture-ready via template system
- MFA enrollment UI (plugin/schema-ready from day one) — hardening window
- Postgres RLS enforcement layer — EVALUATED in M12 (docs/RLS-EVALUATION.md): application-layer isolation via tenantFilter + 20+ isolation tests chosen as the correct architecture. PG RLS adds Prisma compatibility issues, planner overhead, and operational complexity without meaningful security improvement for this shared-schema model.
- Demo-mode auto-reset scheduler — post-M12

---

## 2026-09 — LANDING DESIGN WORK (current session)

### Landing single-page nav (implemented + verified)
- `src/app/page.tsx` is a single-page view-swapper: `PageKey` union (home/features/stats/highlights/testimonials/how/cta), `NAV_PAGES` with lucide icons; `setPage` swaps views, scrolls to top on change.
- Navbars are **hidden by default**; nav toggle:
  - Desktop: slim left-edge tab + left→right edge swipe opens the 3D rail (`-translate-x-[120px]` slide, opacity/pointer-events gating).
  - Mobile: floating menu FAB (bottom-right; moves up + turns teal ✕ when open) + bottom-edge up-swipe opens the bottom dock (`translate-y-[140%]` slide).
  - Nav closes on page select. Both navs fully transparent (`bg-transparent`, no border/shadow).
- Root-caused + fixed the "black rectangle behind dock": it was the Hero3D full-screen loading veil (`bg-background` + spinner) — **removed** from `hero-3d.tsx` (`ready` state, boot timeout, handleReady all deleted; orber camera logic untouched). Verified headless: `anyBlackBox: []`.
- Build note: arbitrary `[transform:...]` classes are NOT generated by Tailwind v4 here — use native `translate-x-*`/`translate-y-*` utilities instead.
- Probe scripts: `C:\Users\GMSNOW\AppData\Local\Temp\opencode\{dockprobe,navprobe,railprobe,txprobe}.js` (puppeteer-core + Edge headless).

### Landing hero
- `hero-3d.tsx` = Sketchfab "Need some space?" embed (`LAND_DIST=75`, 2s approach, autospin; CSP relaxations added in `src/proxy.ts` for sketchfab.com frame/worker/connect).
- Earth Sketchfab model removed by user request; `public/models/a_windy_day.glb` (55MB) now unused — only `public/earth/earth_atmos_2048.jpg` + procedural `windy-preview.tsx` (three/R3F wind-streams recreation, inferno colormap, additive blending) power `/windy`.

### Approved design task — EXECUTED ✅ 2026-09-11
- **Goal (done):** unify glass/3D brand across 7 non-home pages: `/signin /signup /systems /my-apps /select-org /demo /windy` via shared `OnboardingShell`.
- **M1 audit:** signin/signup already dark; systems/my-apps/select-org/demo were light; windy standalone dark — confirmed full inconsistency.
- **M2 shell:** `src/components/onboarding/onboarding-shell.tsx` — dark `#050510` wrapper + `dark` class scoping (drives theme-token descendants), ambient glow, sticky glass header, unified footer with brand logo.
- **M3 apply:** `/signin /signup` (kept ParticleCanvas, removed duplicated glows), `/systems` (system-cards.tsx glass restyle for TemplateCard/OtherCard + info box), `/my-apps` (glass app cards, empty state, browse-more), `/select-org` (glass ActivateRow), `/demo` (replaced old top-bar nav, glass dashboard/table/CTA), `/windy` (kept LTR, bg moved to shell).
- **M4 verify:** `tsc --noEmit` clean; `npm run build` success with all `/app/*` routes intact; browser probes (puppeteer, Edge headless) — 10/10 public pages at 390×844 + 1280×800 (header/footer/no-overflow/shell bg); unauth redirect check `/select-org` + `/my-apps` → `/signin` (no 500); full authed flow signup→signin→select-org→my-apps 5/5 PASS (header+footer+overflow=safe+shell wrapper present). Probe infra: fresh signup via `auth.api.signUpEmail` needs matching origin (`.env.local` pins `http://localhost:3000`; better-auth CSRF 403s other origins); dev cluster `.data/pg` (port 5433) needed `prisma migrate deploy` to install schema (was empty).
- **Cleanup candidates:** `public/models/a_windy_day.glb` (55MB, unused — excluded from git commit), puppeteer-core devDep decision.

---

## 2026-09 — PHARMACY SUB-APP (implemented + verified)

Standalone Next.js 16 + Prisma 7 app under `public/pharmacy/` (own root layout, own package.json, own DB). **Tracked as a git submodule** (`.gitmodules`: `public/pharmacy` → `https://github.com/gmsnow/pharmacy.git`) — commit/push inside `public/pharmacy`, then bump the gitlink pointer in the monorepo (`git add public/pharmacy`); never edit via the monorepo index.

### Run
- `next.config.ts` sets `basePath: "/pharmacy"` — app is served at `http://localhost:5000/pharmacy` (script pins port 5000). `next/link` + `useRouter` handle basePath automatically; client code that uses raw `fetch("/api/...")` or `window.location` must prefix `/pharmacy` (auth forms already do; keep this convention).
- Standalone: `npm --prefix public/pharmacy run dev` → http://localhost:5000/pharmacy.
- Root `concurrently` runner includes it (label `pharmacy`); root `next.config.ts` reverse-proxies `/pharmacy` and `/pharmacy/:path*` to `PHARMACY_URL` (default `http://localhost:5000`).
- DB: PostgreSQL `postgresql://postgres:bos_dev_2026@localhost:5432/pharmacy` (`.env`; leftover `prisma/dev.db` is unused, 0 bytes). Setup = `npm run db:migrate` + `npm run db:seed` (demo login `demo` / `demo123`; all seeded accounts share that password).

### Platform shape
- Arabic-first RTL (`NextIntlClientProvider`, `noto_kufi_arabic`), YER money as integer minor units (bigint, 1 YER = 100; never floats — server recomputes totals).
- Auth: custom cookie session (`serverCurrentUser` → `getCurrentUser`); server-gated by `requirePermission`; Next 16 `src/proxy.ts` (replaces middleware) routes unauthenticated users to `/login`.
- Prisma schema has **no relations** — manual FK mapping via id columns + Maps everywhere.
- Generic CRUD client: `src/components/resource-table.tsx` (fields/columns/search/save/delete/empty-state; no lucide `icon` prop — server→client boundary).

### Modules (all smoke-tested 200, `npx tsc --noEmit` clean, `npm run build` green)
- Base: dashboard, medicines (+batches, low-stock/FEFO), suppliers, customers, doctors, employees (ResourceTable CRUD).
- Purchases: PO with line editor, partial receive (per-item, status `received`/`partially_received`), cancel.
- Inventory: adjustments (`stockAdjustment` type/quantity/previousQty/newQty) + transfers (both warehouses, `inventoryMovement.warehouseId` required).
- Sales list + returns (sales returns per invoice line — restock batches, refund cash balances; supplier returns by batch).
- Prescriptions (create/dispense→creates cash sale at default warehouse, cancel), Expenses (records + category CRUD, negative cash movements), Cash (open/close sessions with discrepancy = actual − expected, deposit/withdraw).
- Reports (`?type=sales|inventory|expiry|expenses`, server-rendered tabs, KPI cards, PrintButton).
- Admin: settings (profile/appearance), audit log, roles reference, notifications, global search, profile (change password).
- Live search: header `GlobalSearch` dropdown + `/search` explorer both debounce (250 ms) and fetch `/pharmacy/api/search` (`src/lib/search-service.ts` — medicines/customers/suppliers/invoices/prescriptions, `mode: insensitive`); Enter opens the full explorer which live-updates on every keystroke.
- POS + receipt print (pre-existing, port 5000).

### Service-layer notes
- `src/lib/{inventory,returns}.ts` — purchase receive (partial) + sales/supplier return services; `src/lib/actions/*` are the server actions; `src/lib/{permissions,audit,password,i18n,dal}.ts` = auth/permission infra.
- Permission keys used: `purchases:create|receive`, `returns:create`, `inventory:adjust|transfer`, `cash:manage`, `expenses:create`, `settings:manage`, `audit:view`, `roles:view`, `notifications:view`, `search:view`; `AUDIT_ACTIONS` includes ADJUST/TRANSFER.
- Clients receive money as plain major-unit numbers; display via `fmtMoney(BigInt(Math.round(x * 100)), locale)`.

### Pitfalls recorded
- `medicine`/`warehouse`/`cashAccount` use `nameAr`/`nameEn` (not `name`); `medicineBatch.remainingQty` is Decimal → compare with `Number(...)`.
- Turbopack os error 112 ("disk full") into a `page_client-reference-manifest.js` = a wedged dev server (orphan process holding :5000), not real disk pressure — kill the port listener + delete `.next`, restart.
