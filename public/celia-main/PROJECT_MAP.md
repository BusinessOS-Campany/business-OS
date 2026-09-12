# PROJECT_MAP.md — Internet Café Management System (CelíA)

> وثيقة الحالة الحية للمشروع. تُحدَّث بعد كل ميزة (بروتوكول State Sync).
> آخر تحديث: 2026-08-14 (M0–M13 مكتملة)

---

## [MILESTONES]

| المرحلة | الحالة | ملخص |
|---------|--------|------|
| **M0 — Scaffold + DB** | ✅ مكتمل | create-next-app (Next 16.3.0)، Drizzle + PG16، DB `celia`، اتصال في `.env` |
| **M1 — Auth** | ✅ مكتمل | Better Auth 1.6.26 (email + **username plugin**)، Drizzle adapter، جلسات، Proxy، سيدر `admin/admin` |
| **M2 — Login page** | ✅ مكتمل | صفحة `/login` (RTL، Cairo، خلفية `celiaLogin.jfif`)، `/` محمية، Sign-out، تحقق End-to-End |
| **M3 — Dashboard** | ✅ مكتمل | هيكل تطبيق (Sidebar + Topbar)، 4 بطاقات إحصائية، بطاقات الإيرادات، مراقبة 24 ساعة + مقارنات، API `/api/dashboard/stats` |
| **M4 — HobaniAdd page** | ✅ مكتمل | صفحة `/hobaniAdd` + نموذج دخل الحوباني (Zod) + API `POST /api/hobani/income` + جدول `hobani_income` |
| **M5 — NAS Transfers (قديم)** | ⏹️ استُبدل | مراقب `transfer-watcher.ts` + `transfer_log` + `/copyTable` — **حُذف بالكامل** واستُبدل بنظام التحويلات M6 |
| **M6 — نظام تحويلات العملاء** | ✅ مكتمل | نظام كامل: Windows Transfer Agent، أجهزة العملاء (USB/هاتف/SD/HDD/SSD)، نقل NAS→جهاز عبر robocopy، لوحة/إنشاء/نشط/سجل/أجهزة/تقارير/إعدادات، تتبع حقيقي (لا بيانات وهمية)، أمان (API keys للوكيل + تشفير كلمة مرور NAS + تحقق من المسارات) |
| **M7 — `/totalOfSelles`** | ✅ مكتمل | صفحة عرض إجمالي دخل المبيعات: جداول منتجات حسب الفئة (اسم/إحصائيات دخل/نسبة دخل) + دونات نسخ/حوباني/مبيعات/شحن رصيد + قائمة المنتجات المباعة (حقيقية، بلا بيانات وهمية). جداول جديدة `products` + `product_sales` (migration `0010_white_warlock.sql`) |
| **M8 — `/totalOfbalence`** | ✅ مكتمل | صفحة عرض إجمالي شحن التطبيقات: نموذج شحن الرصيد (نفس `/balenceSelles`) + جدول سجل عمليات الشحن (المزود/المبلغ/ملاحظات/الموظف/التاريخ) + إجمالي المبلغ، مع تحديث مباشر بعد كل عملية (GET `/api/balance/charge`) |
| **M9 — `/embedProductPrice` تعديل/حذف** | ✅ مكتمل | إجراءات تعديل + حذف لأسعار المنتجات: `PUT`/`DELETE` على `/api/products/[id]` (محمية + Zod)، نموذج تعديل (مودال) يملأ البيانات المسبقاً ويحفظ التغييرات، حذف بتأكيد من خطوتين، تحديث الجدول بعد كل عملية. حذف المنتج يحذف مبيعاته تلقائياً (FK `onDelete: cascade`) |
| **M10 — `/totalOfHobani` تعديل/حذف** | ✅ مكتمل | توسيع صفوف الإجمالي (يوم+فترة) إلى سجلات فردية: زر عين يعرض سجلات الدخل في مودال (دخل/نوع الكرت/العدد/الوقت/الموظف) مع تعديل/حذف لكل سجل، وحذف المجموعة كاملة بتأكيد من خطوتين. `GET`/`DELETE` على `/api/hobani/income` (سجلات اليوم/الفترة + حذف مجموعة) + `PUT`/`DELETE` على `/api/hobani/income/[id]` (محمية + Zod)، نموذج `HobaniIncomeForm` يدعم وضع التعديل (`initialData`) |
| **M11 — `/totalOfbalence` تعديل/حذف** | ✅ مكتمل | إجراءات تعديل + حذف لعمليات شحن الرصيد: `PUT`/`DELETE` على `/api/balance/charge/[id]` (محمية + Zod + 404)، نموذج `BalanceChargeForm` يدعم وضع التعديل (`initialData` يملأ المزود/المبلغ/الملاحظات)، حذف بتأكيد من خطوتين داخل الجدول، تحديث الإجمالي/العدد مباشرة بعد كل عملية |
| **M12 — حجب الصفحات بالصلاحيات** | ✅ مكتمل | حماية على مستوى الخادم: `requirePagePermission(key)` في كل صفحة (تحويل إلى `/forbidden` عند نقص الصلاحية) + `requireApiPermission` على واجهات API الداعمة + فلترة قائمة الجانب والهيدر حسب `permissions` المستخدم + صفحة `/forbidden` (عربية/إنجليزية) + bypass كامل لدور `admin`. الصلاحيات تُقرأ من عمود `permissions` (jsonb) في جدول `user` |
| **M13 — أداء التنقل (Instant Nav)** | ✅ مكتمل | زمن التنقل بين صفحات اللوحة ~26 صفحة: (1) مجموعة مسارات `(dashboard)` بتخطيط `layout.tsx` خادمي ثابت يستدعي `requireUser`+`getUserPermissions` **مرة واحدة** ويُحمّل `DashboardShell` — الـ Shell (Sidebar+Header) يبقى محمّلاً عبر التنقل بدل إعادة إنشائه في كل صفحة؛ (2) `loading.tsx` (boundary) يجعل المسارات الديناميكية قابلة للـ prefetch (بدونه يُتخطّى الـ prefetch لكل المسارات الديناميكية)؛ (3) `experimental.staleTimes { dynamic: 30, static: 60 }` لزمن حياة كاش العميل؛ (4) `router.prefetch(href)` لكل روابط القائمة في `sidebar.tsx` عند أول تحميل؛ (5) مكوّن `PageHeader` موحّد (title + breadcrumb + today label) يحل محل منطق العنوان داخل الـ Shell |

**التحقق (Production build + خادم حي):**
- `POST /api/auth/sign-in/username` (admin/admin) → 200 + توكن + `celia.session_token` (HttpOnly)
- `GET /` بلا جلسة → 307 إلى `/login?next=/`؛ بجلسة → 200
- `GET /api/dashboard/stats` بجلسة → 200؛ بلا جلسة → 401
- خطأ كلمة المرور → 401 `INVALID_USERNAME_OR_PASSWORD`؛ `POST /api/auth/sign-out` → `{"success":true}`
- **M6 API حي:** `POST /api/agent/register` → 200 (يُصدر `apiKey`)؛ `POST /api/agent/heartbeat` (رؤوس `x-agent-id`+`x-agent-key`) → 200 + قائمة مشاركات NAS بكلماتها المشفّرة؛ `POST /api/agent/devices` → upsert أجهزة + فصل غير المتصلة؛ `GET /api/agent/jobs` → أول `PENDING` للوكيل (مع مسار المصدر UNC كاملاً)؛ `start/progress/complete` → تحديث الحالة والحجم والسرعة والمدة؛ سجل تدقيق `TRANSFER_COMPLETED` يُكتب. ✔ مُختبَر End-to-End (ثم حُذفت بيانات الاختبار)
- **التحقق الخامل:** `npx tsc --noEmit` نظيف، `npm run lint` نظيف، `npm run build` ينجح مع جميع المسارات (أدوات/صفحات).
- **M13 تحقق:** `npm run build` ينجح (كامل المسارات) + lint نظيف + خادم dev حي (`/login` → 200، `/dailyIncome` بلا جلسة → 307). `staleTimes` تحت `experimental` في Next 16 (`next.config.ts`).

---

## [TECH_STACK]

| الطبقة | التقنية | الإصدار | ملاحظات |
|--------|---------|---------|---------|
| Framework | Next.js (App Router) | **16.3.0** (stable, 2026-08-03) | Turbopack افتراضي، Node ≥ 20.9، Proxy بدل Middleware، Async Request APIs |
| UI | React | **19.2** (مرفق مع Next 16) | React Compiler اختياري |
| Language | TypeScript | **5.x** (آخر 5.x) | **ممنوع TS 7.0** — Next 16 يرفضه حالياً |
| Styling | Tailwind CSS | **4.3.3** | CSS-first config (`@theme`) |
| DB | PostgreSQL (محلي) | **16.3** | `postgres://postgres:123@localhost:5432/celia` — مثبت ومُشغَّل |
| ORM/Migrations | Drizzle ORM + Drizzle Kit | **0.45.2** / **0.31.10** | v1.0 لا يزال RC — نتجنب الـ beta |
| Auth | Better Auth | **1.6.26** (stable) | ✅ **مؤكَّد** — emailAndPassword + `username` plugin + Drizzle adapter |
| Validation | Zod | **4.4.3** | Validation موحد Client/Server |
| Icons | lucide-react | **1.30.0** | |
| Charts | recharts | **3.10.1** | للتقارير/Dashboard (حسب المتطلبات) |
| State/Real-time | React Query أو SSE | pending | يُقرَّر عند ورود متطلبات الـ Real-time |
| Testing | Vitest (+ Playwright لاحقاً) | pending | يُثبَّت عند بدء أول اختبار |

**محظورات:** أي نسخة Deprecated أو Beta لأغراض الإنتاج، `next lint` (انتقل لـ ESLint CLI)، `middleware` (المسماة `proxy` الآن).

**ملاحظات بيئة (Windows):** مكوّنات native (swc/lightningcss) قد تُثبَّت تالفة/ناقصة عبر npm على هذا الجهاز — عند خطأ build، أعد تثبيت `@next/swc-win32-x64-msvc` و`lightningcss-win32-x64-msvc` (وللنسخة المتداخلة داخل `@tailwindcss/node` انسخ `.node` في حزمة `lightningcss`)، واحذف `.next` إن استُخدمت الكاشة القديمة.

---

## [SYSTEM_FLOW]

> مسودة الهيكل العامة — تُملأ صفحة-بصفحة فور ورود المتطلبات. **لا تُنشأ صفحات قبل ورودها.**

```
Login (Auth) → Authorization (RBAC)
   └→ Dashboard (ملخص أعمال)
       ├→ Computers (أجهزة + حالات)
       ├→ Sessions (جلسات + فوترة زمنية)
       ├→ Customers / Accounts
       ├→ Products & Inventory
       ├→ Printing Services
       ├→ Payments / Revenue / Expenses
       ├→ Reservations
       ├→ Reports
       ├→ Employees
       ├→ Notifications
       └→ Settings
```

مبدأ حاكم: **الـ DB هو مصدر الحقيقة للفوترة/الحسابات المالية** (الفوترة بالدقيقة/الساعة تُحسب على الخادم، لا بمؤقت المتصفح). كل معاملة مالية قابلة للتتبع.

---

## [ARCHITECTURE]

هيكل مُنفَّذ فعلياً (يُوسَّع صفحة-بصفحة):

```text
  app/
    layout.tsx               # lang=ar dir=rtl، Cairo (next/font)، metadata "… | سيليا"
    loading.tsx              # loading عام (جذر)
  (dashboard)/               # مجموعة مسارات اللوحة — تخطيط ثابت يحافظ على الـ Shell عبر التنقل
    layout.tsx               # خادم — requireUser + getUserPermissions مرة واحدة ثم <DashboardShell>{children}
    loading.tsx              # <PageLoading/> — boundary يجعل المسارات الديناميكية قابلة للـ prefetch
    page.tsx                 # `/` — لوحة التحكم (requirePagePermission + getDashboardStats)
    dailyIncome/page.tsx     # `/dailyIncome` — الدخل اليومي
    weeklyIncome/page.tsx    # `/weeklyIncome` — الدخل الأسبوعي
    monthlyIncome/page.tsx   # `/monthlyIncome` — الدخل الشهري (دونات + جداول)
    totalOfSelles/page.tsx   # `/totalOfSelles` — عرض اجمالي دخل المبيعات (جداول فئات + دونات + مبيعات)
    totalOfbalence/page.tsx  # `/totalOfbalence` — عرض اجمالي شحن التطبيقات (نموذج شحن + سجل العمليات)
    totalOfHobani/page.tsx   # `/totalOfHobani` — عرض اجمالي دخل الحوباني
    allProduct / showExpenses / showAdvance / employees / users / salaryPage /
    shifts / embedcopyPrice / embedProductPrice / transfers(+devices/history/settings)
    # كلها: requirePagePermission ثم <PageHeader titleKey/> + المحتوى (بلا DashboardShell)
  login/page.tsx             # صفحة الدخول (خلفية celiaLogin.jfif + بطاقة تسجيل الدخول)
  forbidden/page.tsx         # صفحة نقص الصلاحية
  copyTable/page.tsx         # قائمة نسخ مستقل (خارج اللوحة)
  transfers/page.tsx       # `/transfers` — لوحة التحويلات (تحديث دوري 5 ثوانٍ)
  transfers/new/page.tsx   # `/transfers/new` — إنشاء تحويل (اختيار جهاز + مشاركة NAS + تصفح SMB)
  transfers/active/page.tsx# `/transfers/active` — التحويلات النشطة + إلغاء
  transfers/history/page.tsx  # `/transfers/history` — سجل بفلاتر/بحث + تفاصيل + تصدير CSV
  transfers/devices/page.tsx  # `/transfers/devices` — أجهزة العملاء + الوكلاء
  transfers/reports/page.tsx  # `/transfers/reports` — تقارير (اليوم/الأسبوع/الشهر) + CSV
  transfers/settings/page.tsx # `/transfers/settings` — إعدادات (مسؤول فقط): مشاركات NAS CRUD
  api/auth/[...all]/route.ts  # toNextJsHandler(auth) GET/POST
  api/dashboard/stats/route.ts # GET إحصائيات اللوحة (محمي — 401 بلا جلسة)
  api/dashboard/transfers/route.ts # GET إحصائيات التحويلات (محمي)
  api/hobani/income/route.ts   # POST حفظ دخل الحوباني (محمي + Zod)
  api/balance/charge/route.ts  # POST إضافة شحن رصيد (محمي + Zod) / GET سجل العمليات
  api/balance/charge/[id]/route.ts # PUT تعديل / DELETE حذف عملية شحن (محمي + Zod + 404)
  api/products/route.ts        # GET قائمة المنتجات / POST إنشاء (محمي + Zod)
  api/products/[id]/route.ts   # PUT تعديل / DELETE حذف منتج (محمي + Zod)
  api/agent/register/route.ts  # POST تسجيل وكيل (يُصدر apiKey لمرة واحدة)
  api/agent/heartbeat/route.ts # POST نبض الوكيل (رؤوس x-agent-id/x-agent-key) + قائمة المشاركات بالأسرار
  api/agent/devices/route.ts   # POST upsert أجهزة الوكيل (فصل غير المتصلة)
  api/agent/jobs/route.ts      # GET أول مهمة PENDING للوكيل (مسار مصدر UNC)
  api/agent/jobs/[id]/start|progress|complete|fail|cancel/route.ts # دورة حياة المهمة
  api/transfers/route.ts       # GET قائمة+فلاتر / POST إنشاء تحويل (محمي + Zod + تحقق أمان)
  api/transfers/[id]/route.ts  # GET تفاصيل مهمة
  api/transfers/[id]/cancel/route.ts # POST إلغاء (فوري لـ PENDING / طلب للـ RUNNING)
  api/transfer-devices/route.ts # GET أجهزة العملاء
  api/agents/route.ts + api/agents/[id]/route.ts # GET الوكلاء
  api/nas/route.ts + api/nas/[id]/route.ts       # GET/POST/PATCH/DELETE مشاركات NAS (كتابة: مسؤول)
  api/nas/explore/route.ts     # GET تصفح مشاركة NAS (SMB عبر PowerShell على الخادم)
  api/reports/route.ts         # GET تقرير (today/week/month)
  api/audit-log/route.ts       # GET سجل التدقيق (مسؤول)
proxy.ts                   # Next 16 Proxy — حماية/توجيه الجلسات (يستثني /api وملفات static)
  components/
    ui/button.tsx            # Button (variants، sizes، loading)
    ui/input.tsx             # Input (startIcon, hasError)
    ui/form-field.tsx        # FormField (label/error)
    brand/logo.tsx           # Logo سيليا (صورة celiaLogo.jpg + نص اختياري، dark prop)
    login/login-form.tsx     # عميل — signIn.username، rememberMe، أخطاء، إظهار/إخفاء كلمة المرور
    home/sign-out-button.tsx # عميل — authClient.signOut() + redirect
    layout/sidebar.tsx       # عميل — تنقل (لوحة التحكم + نظام التحويلات + …) + بطاقة مستخدم + خروج
    dashboard/stat-card.tsx  # بطاقة إحصائية ملونة (primary/success/warning/danger)
    dashboard/sales-chart.tsx# عميل — AreaChart (Recharts) أو حالة "لا بيانات"
    dashboard/report-card.tsx# عميل — ملخص شهري (رسم + مراقبة 24 ساعة + مقارنات الأمس)
    dashboard/dashboard-content.tsx # عميل — جلب/تحديث دوري (30 ثانية) وتجميع البطاقات
    dashboard/dashboard-shell.tsx   # عميل — Shell عام ثابت (Sidebar + Header) يبقى محمّلاً عبر التنقل داخل (dashboard)
    dashboard/page-header.tsx       # عميل — العنوان + breadcrumb + تاريخ اليوم (من الـ dictionary)
  hobani/hobani-income-form.tsx   # عميل — نموذج دخل الحوباني (Zod + رسائل نجاح/خطأ)
  hobani/hobani-totals-table.tsx  # عميل — جدول اجمالي الحوباني
  balance/balance-charge-form.tsx # عميل — نموذج شحن الرصيد (مزود/مبلغ/ملاحظات + وضع تعديل initialData)
  balance/balance-totals-view.tsx # عميل — نموذج الشحن + سجل عمليات الشحن (جدول + تعديل/حذف + تحديث مباشر)
  products/product-price-form.tsx # عميل — نموذج إضافة/تعديل سعر منتج (initialData → PUT)
  products/product-prices-view.tsx # عميل — جدول الأسعار + إجراءات تعديل/حذف (مودال + تأكيد)
    income/income-summary-view.tsx  # عميل — ملخص الدخل (يومي/أسبوعي)
    income/daily-income-view.tsx    # عميل — الدخل اليومي
    income/monthly-income-view.tsx  # عميل — الدخل الشهري (دونات + جداول)
    sales/total-sales-view.tsx      # عميل — عرض اجمالي المبيعات (فئات + دونات + مبيعات)
    transfers/transfer-dashboard.tsx # عميل — لوحة التحويلات (تحديث دوري)
  transfers/new-transfer-form.tsx  # عميل — نموذج إنشاء التحويل (تصفح SMB + تحقق)
  transfers/active-transfers.tsx   # عميل — النشط + إلغاء
  transfers/transfer-history.tsx   # عميل — سجل (فلاتر/بحث/تفاصيل/CSV)
  transfers/devices-view.tsx       # عميل — أجهزة + وكلاء
  transfers/reports-view.tsx       # عميل — تقارير (فترات + CSV)
  transfers/settings-view.tsx      # عميل — إدارة مشاركات NAS (مسؤول)
lib/
  db/index.ts              # Pool + drizzle(schema) + export schema
  auth/index.ts            # betterAuth config (plugins: [username(...)]، role additionalField)
  auth-client.ts           # createAuthClient + usernameClient (NEXT_PUBLIC_APP_URL)
  session.ts               # getSession (cached) + requireUser (redirect /login) + requirePagePermission (redirect /forbidden)
  logger.ts                # Logging غير حظري (Async) — debug/info/warn/error + LOG_LEVEL
  roles.ts                 # ROLE_LABELS + roleLabel
  nav.ts                   # getSidebarSections — قائمة الجانب (نظام التحويلات جديد) + flattenPages للـ prefetch
  format.ts                # formatCurrency (YER) / formatNumber / formatPercent / formatPercentSigned
  cn.ts                    # clsx + tailwind-merge
  dashboard/compare.ts     # مقارنة اليوم/الأمس (diff, percent, status)
  dashboard/stats.ts       # getDashboardStats — يحسب اليوم من transfer_jobs (مع fallback صفر/فارغ)
  transfers/constants.ts   # الحالات/أنواع الأجهزة/نافذة ONLINE/تسميات الأنواع
  transfers/types.ts       # TransferJobView / TransferDeviceView / TransferAgentView / TransferFilters
  transfers/crypto.ts      # AES-256-GCM تشفير كلمات مرور NAS (NAS_ENC_KEY → BETTER_AUTH_SECRET)
  transfers/audit.ts       # logAudit (سجل التدقيق غير الحظري)
  transfers/agent-auth.ts  # hashAgentKey (SHA-256) + requireAgent (timingSafeEqual)
  transfers/nas.ts         # CRUD مشاركات NAS + shareRoot/fullSourcePath/normalizeRemotePath
  transfers/smb.ts         # listNasDirectory — SMB عبر PowerShell (mount بشهادات + Get-ChildItem)
  transfers/queries.ts     # getTransferJobs/getJobById/active/devices/agents/dashboard/report/audit/listing
  transfers/validation.ts  # Zod schema للتحويل + sanitizeSubPath + extractDriveLetter + isWithinBasePath
  transfers/api-auth.ts    # requireApiUser — جلسة API (بلا redirect، يرجع null → 401)
  transfers/format.ts      # formatBytes/formatSpeed/formatDuration/formatDateTime
  hobani/income.ts         # Zod schema دخل الحوباني (income/period/cardType/quantity)
  hobani/totals.ts         # getHobaniTotals — اجمالي الحوباني (يوم + فترة)
  balance/charge.ts        # BALANCE_PROVIDERS + createBalanceChargeSchema (Zod)
  balance/queries.ts       # getBalanceCharges — سجل عمليات الشحن + اجمالي/عدد
  income/monthly.ts        # getMonthlyIncomeStats — دخل شهري (نسخ/حوباني/شحن رصيد)
  income/daily.ts          # getDailyIncomeStats — دخل يومي
  income/weekly.ts         # getWeeklyIncomeStats — دخل أسبوعي
  sales/totals.ts          # getTotalSalesStats — اجمالي المبيعات (فئات + دونات + مبيعات)
  products/queries.ts      # getProducts/getAllProductSales
  products/product.ts      # createProductSchema (Zod) لإنشاء/تعديل المنتج
drizzle/
  schema.ts                # user/session/account/verification + hobani_income + balance_charge + copy_records + products + product_sales + نظام التحويلات (transferAgents/Devices/Jobs/Items + nasShares + nasListing + auditLog)
  config.ts                # drizzle-kit pg
  migrations/0000..0010_*.sql # مُطبَّقة ✅ (0006: جداول التحويلات؛ 0007: nas_share_id + current_speed؛ 0008/0009: source_path؛ 0010: products + product_sales)
scripts/
  seed.ts                  # سيدر idempotent: admin/admin (role=admin)
.env                       # DATABASE_URL + BETTER_AUTH_* + NAS_ENC_KEY (مُهمَل في git)
```

**ملاحظات تنفيذ M6 (مهمة للأعوام القادمة):**
- توليد drizzle-kit في بيئة non-TTY يتطلب تأكيد المخططات الحذفية: استخدم `node C:\Users\GMSNOW\AppData\Local\Temp\opencode\fake-tt.cjs generate` (يرسل Enter كل 400ms).
- مسارات الوكيل تُصادق برأسَي `x-agent-id` + `x-agent-key` (متوسط زمن ثابت — `timingSafeEqual`).
- كلمة مرور NAS تُخزَّن `password_enc` مشفّرة AES-256-GCM؛ تُفكّ فقط للوكيل (نبض) أو لتصفح الخادم.
- تحقّق المسارات: `sanitizeSubPath` يرفض `..`/المسارات المطلقة/الأحرف المحظورة؛ الوجهة يجب أن تكون على قرص الجهاز (`extractDriveLetter` + `isWithinBasePath`).
- الويب لا ينفّذ أوامر على أجهزة العملاء أبداً؛ تصفح NAS يتم على الخادم نفسه عبر PowerShell (نفس شبكة NAS).
- لا بيانات وهمية: عند غياب قياس (مثل totalSize) تُخزَّن `NULL` وتُعرض "—".
- `data/` (سجلات JSONL القديمة) مُهمَل في git؛ `transfer:watch` و`/copyTable` و`transfer_log` أُزيلت.

قواعد معمارية ملزمة:
1. **Simplicity First** — أقل كود يحل المشكلة؛ Shared/Core فقط للمنطق المتكرر فعلياً.
2. **Domain-Driven** — تقسيم حسب الميزة، بلا تفتيت ملفات.
3. **Server is source of truth** — الأمان والفوترة على الخادم دائماً.
4. **لا CRUD زخرفي** — كل زر يعمل End-to-End (UI → Validation → Action → DB → استجابة → UI).
5. مبالغ مالية بنوع `numeric` في PG (لا float)، ومعاملات `transaction` لكل عملية مركّبة.
6. إجبار `dir="rtl"` لكل صفحة عربية، لا عكس UI بالحيل.

---

## [ORPHANS & PENDING]

| # | البند | الحالة | التبعية |
|---|-------|--------|---------|
| 1 | سكربت Windows Transfer Agent (`scripts/transfer-agent.ts`): تسجيل/نبض، مسح الأجهزة (PowerShell)، محرك robocopy مع تقدم، إلغاء، تصفح NAS | **بانتظار خطوة التنفيذ** | M6 خادمي مكتمل؛ هذا هو العميل المحلي |
| 2 | فحص طلب إلغاء الوكيل: `cancel_requested_at` يعرضه `GET /api/agent/jobs`؟ (متضمَّن في صف المهمة — الوكيل يفحصه) | قيد التأكيد أثناء بناء الوكيل | الوكيل |
| 3 | دمج لوحة التحويلات مع إحصائيات اللوحة الرئيسية (بطاقة اليوم تُقرأ الآن من `transfer_jobs` في `lib/dashboard/stats.ts`) | متابعة عند ورود متطلبات | — |
| 4 | صيغة التصدير (PDF/Excel/CSV) — CSV يعمل للتحويلات/التقارير؛ PDF لاحقاً | بانتظار المتطلبات | — |
| 5 | Dark/Light mode | بانتظار تأكيد المتطلبات | — |
| 6 | `/totalOfSelles` يقرأ `products` + `product_sales` (فارغة حتى تُسجَّل مبيعات عبر `/addProduct`)؛ قائمة المنتجات تُعرض فقط للمنتجات المباعة فعلاً | جاهزة — تنتظر بيانات حقيقية | مبيعات عبر `/addProduct` |

> **قاعدة:** أي ميزة تُبدأ دون ربط تُسجَّل هنا فوراً وتُحذف عند اكتمالها.
