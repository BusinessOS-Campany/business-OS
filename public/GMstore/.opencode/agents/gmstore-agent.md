---
description: GMStore full-stack agent — knows every detail of the e-commerce platform including cart, orders, products, merchants, admin, i18n, auth, deployment.
mode: primary
---

# GMStore Agent — Complete Knowledge Base

أنت وكيل GMStore المتكامل. تعلم كل صغيرة وكبيرة في المتجر. تستطيع الإجابة عن أي سؤال وإجراء أي تعديل.

---

## 1. PROJECT OVERVIEW

GMStore is a full-stack e-commerce platform (WANO STORE) built with Next.js 16.2.7 + Prisma + PostgreSQL + NextAuth v5.

### Tech Stack
- **Framework**: Next.js 16.2.7 (Turbopack in dev)
- **Language**: TypeScript (strict)
- **Database**: PostgreSQL + Prisma ORM v6.19.3
- **Auth**: NextAuth v5 (beta.31) — Credentials + optional Google OAuth, JWT sessions, PrismaAdapter
- **Styling**: Tailwind CSS v4 (CSS-based config, no tailwind.config.js), class-variance-authority, tailwind-merge
- **Animation**: Motion (framer-motion v12)
- **UI Icons**: lucide-react
- **Validation**: zod v4
- **File Upload**: UploadThing + local filesystem for merchant images
- **Payment**: Stripe (client-side with @stripe/stripe-js)
- **AI Chat**: Google Gemini API
- **Image Processing**: @imgly/background-removal
- **Image CDN**: Cloudinary

### Database
- **Production**: Supabase PostgreSQL (`aws-1-eu-central-1.pooler.supabase.com:5432/postgres`) — Vercel env vars
- **Development**: Localhost (`localhost:5432/gmstore`) — from `.env`
- **Seed**: `npx tsx scripts/seed-categories.ts` then `npx tsx scripts/seed-category-images-real.ts`
- **Migrations**: 11 migrations found, schema up to date

---

## 2. ENVIRONMENT & DEPLOYMENT

### Files
- `.env` → Localhost DB + AUTH_SECRET (local dev)
- `.env.local` → Local dev overrides
- Vercel env vars → Supabase DB, AUTH_SECRET, UPLOADTHING_TOKEN, GEMINI_API_KEY, AUTH_TRUST_HOST=true

### Vercel Deployment
- Auto-deploy from GitHub `main` branch (Git-linked)
- After pushing to `main`, wait ~2 minutes for deploy
- EPERM errors fix: `Get-Process -Name "node" | Stop-Process -Force` then restart
- **Must set `AUTH_TRUST_HOST=true`** (required when behind Vercel's proxy or any reverse proxy)
- **Supabase pooler**: Use transaction pooler (port 6543) to avoid connection exhaustion

### Credentials
- Admin login: `admin@gmstore.com` / `admin123`
- Production: Supabase PostgreSQL (connection pooler, port 5432 session / 6543 transaction)

---

## 3. DATABASE SCHEMA (Prisma)

### Enums
- `Role`: ADMIN | MERCHANT | CUSTOMER
- `OrderStatus`: PENDING | PROCESSING | SHIPPED | DELIVERED | CANCELLED
- `ItemStatus`: PENDING | PROCESSING | SHIPPED | DELIVERED | CANCELLED

### Models

**User** — id (cuid), name?, email (unique), password?, role (default CUSTOMER), image?, emailVerified?, accounts[], sessions[], orders[], products[], reviews[], favorites[], points (int, default 0), referralCode? (unique), referredById?, referredBy?, referrals[], store?, withdrawals[], createdAt

**Store** — id, userId (unique, FK→User), name?, nameEn?, slug? (unique), description?, descriptionEn?, logo?, cover?, phone?, email?, address?, whatsapp?, telegram?, instagram?, facebook?, twitter?, tiktok?, shippingAddress?, createdAt, updatedAt

**Withdrawal** — id, userId (FK→User), amount (Decimal), fee (Decimal, default 0), status (default "PENDING"), method?, accountInfo?, notes?, createdAt

**Category** — id, name, nameEn?, slug (unique), description?, image?, parentId? (self-ref FK), parent?, children[], products[], createdAt

**Product** — id, name, nameEn?, slug (unique), description?, descriptionEn?, price (Decimal), images (String[]), colors (String[]), sizes (String[]), colorImages (Json?), colorStock (Json?), specs (Json?), videoUrl?, brand?, brandLogo?, categoryId (FK→Category), userId? (FK→User), stock (int, default 0), discount (int, default 0), dealEnd? (DateTime), featured (bool, default false), orderItems[], reviews[], favorites[], createdAt, updatedAt
- Indexes: [price], [brand], [createdAt], [featured], [discount]

**Order** — id, userId? (FK→User), customerName, customerEmail, customerPhone, items[] (OrderItem), subtotal (Decimal), shippingCost (Decimal, default 0), discount (Decimal, default 0), total (Decimal), status (OrderStatus, default PENDING), shippingAddress?, paymentIntentId?, couponId? (FK→Coupon), coupon?, pointsEarned (int), createdAt

**OrderItem** — id, orderId (FK→Order), productId (FK→Product), quantity (int), price (Decimal), color?, size?, status (ItemStatus, default PENDING)

**Review** — id, productId (FK→Product), userId (FK→User), rating (int, default 5), comment?, reply?, reported (bool, default false), createdAt
- Unique: [productId, userId]

**Favorite** — id, userId (FK→User), productId (FK→Product), createdAt
- Unique: [userId, productId]

**Banner** — id, image, title?, titleEn?, desc?, descEn?, link (default "/products"), order (int, default 0), active (bool, default true), createdAt

**Coupon** — id, code (unique), discount (int, %), maxUses (int, default 0), usedCount (int, default 0), minAmount? (Decimal), expiresAt? (DateTime), active (bool, default true), orders[], createdAt

**Account**, **Session**, **VerificationToken** — Standard NextAuth models

---

## 4. AUTH SYSTEM (`src/lib/auth.ts`)

- NextAuth v5 with `PrismaAdapter`
- Strategy: JWT (not database sessions)
- Providers: Credentials (email+password, bcrypt compare), Google OAuth (conditional — only if `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` set)
- Role injection: JWT callback adds `token.role` and `token.id`; Session callback adds them to `session.user`
- Pages: signIn → `/login`
- `authorized` callback: `/admin/login` always allowed, `/admin/*` requires auth
- `proxy.ts` (acts as middleware): Protects `/admin/:path*` and `/api/:path*`, adds CORS headers, allows OPTIONS
- `isGoogleEnabled()` helper checks env vars
- **No `SessionProvider` in client** — session is checked server-side only via `auth()`

### Auth API Routes
- `POST /api/auth/register` — Register user (name, email, password, role)
- `POST /api/auth/token` — Generate JWT with jose (email+password → token)
- `GET /api/auth/config` — Returns `{ googleEnabled: boolean }`
- `GET,POST /api/auth/[...nextauth]` — NextAuth catch-all

### ⚠️ Auth Wrapper Pattern (Important)
Do NOT use `auth()` as a route wrapper (`export const POST = auth(handler)`) for POST/PUT/DELETE routes — NextAuth v5 requires CSRF token for non-GET requests when used as a wrapper, causing 401 errors.
Instead, call `auth()` as a function inside the handler:
```
const session = await auth();
if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
```

---

## 5. I18N SYSTEM

- **Dual language**: Arabic (primary, RTL) + English (LTR)
- **Location**: `src/lib/i18n/`
- **Files**:
  - `translations.ts` — ~430 keys per language, all grouped (nav, home, product, products, detail, cart, checkout, track, categories, merchant, admin, auth, favorites, comparison, general, footer, lang)
  - `dictionary.ts` — `Locale = "ar" | "en"`, `getDictionary(locale)`, `getDirection(locale)`
  - `provider.tsx` — Client-side context: `useI18n()` → `{ t, locale, direction, toggleLocale, setLocale }`
  - `server.ts` — Server-side: `getServerLocale()`, `getServerTranslations()`
  - `localized.ts` — `localizedName(item, locale)`, `localizedDescription(item, locale)`
- **Components**: `<T k="key" />`, `<LocalizedName>`, `<LocalizedDesc>`, `<LangToggle>`
- **Locale storage**: localStorage + cookie (`locale`) + `document.documentElement` lang/dir
- **Server**: `getServerLocale()` reads `locale` cookie, defaults to "ar"

---

## 6. CART SYSTEM

### Cart Store (`src/lib/cart/store.ts`)
- localStorage-based with `STORAGE_KEY = "cart"`
- Functions: `getCart()`, `setCart(items)`, `addToCart(item)`, `removeFromCart(productId, color?)`, `updateQuantity(productId, color?, delta)`, `cartCount()`, `cartSubtotal()`
- Color-aware: items with same productId + color merge quantities
- Free shipping threshold: 5000 YER, Shipping cost: 500 YER
- Custom event `"cartUpdated"` on every write → components listen via `window.addEventListener`

### Cart Drawer (`src/components/shop/cart-drawer.tsx`)
- Slide-out panel with cart items, quantity controls, remove
- Free shipping progress bar
- Coupon code input + validation via `/api/coupons/validate/[code]`
- **Last order tracking**: Polls `/api/orders/[id]` every 5s for `lastOrderId` from localStorage
  - Shows only non-DELIVERED, non-CANCELLED items
  - When ALL items are DELIVERED or CANCELLED → removes `lastOrderId` from localStorage, hides tracking
- **Track search**: Search orders by ID directly in drawer
- Order status step indicator: PENDING → PROCESSING → SHIPPED → DELIVERED

### Cart Page (`/cart`)
- Full `/cart` page with quantity +/- , color swatch picker with merge logic
- Last-order banner at top if `lastOrderId` exists (links to `/track/[id]`)

---

## 7. ORDER SYSTEM

### Order Flow
1. **Checkout** (`POST /api/checkout`): Validates products/coupon → calculates subtotal/shipping/discount → creates Order + OrderItems (status=PENDING) → decrements stock/colorStock → clears cart → sets `lastOrderId` in localStorage → dispatches `"orderPlaced"`
2. **Post-order**: `lastOrderId` shown in cart drawer tracking (polls every 5s)
3. **Tracking**: `/track/[id]` page polls `GET /api/orders/[id]` every 5s, shows per-item status
4. **Completion**: Order auto-removed from tracking when all items DELIVERED or CANCELLED

### Order Status Calculation (per-item)
When an individual item's status is updated, the order-level status is recalculated:
- ALL items CANCELLED → order CANCELLED
- ALL items DELIVERED → order DELIVERED
- Every item DELIVERED or CANCELLED → order DELIVERED
- ANY item SHIPPED → order SHIPPED
- ANY item PROCESSING → order PROCESSING
- Otherwise PENDING

### Order API Routes
- `GET /api/orders/[id]` — Full order with items + product details
- `POST /api/orders/[id]` — Cancel entire order (sets all items + order to CANCELLED)
- `PATCH /api/orders/[id]/items/[itemId]` — Per-item status update (admin/merchant), recalculates order status
- `PATCH /api/orders/[id]/status` — Bulk status update (admin only)
- `GET /api/orders/by-email?email=` — Lookup orders by email (public)
- `GET /api/orders/all?page=&take=` — Paginated order list (admin)
- `GET /api/merchant/orders?status=&cancelled=` — Merchant's orders (only their products)
- `GET /api/merchant/orders/[id]` — Single merchant order detail
- `PATCH /api/merchant/orders/[id]` — Update item status (merchant)

### Order Pages
- `/track/[id]` — Per-order dynamic tracking with per-item status, auto-poll every 5s, cancel button
- `/track` — Search-driven tracking page (enter order ID)
- `/orders` — "My Orders" — enter email → all orders via `/api/orders/by-email`
- `/admin/(protected)/orders/[id]` — Admin order detail with per-item dropdown status changer

---

## 8. PRODUCT SYSTEM

### Product API
- `GET /api/products` — List with search (name/nameEn), ids filter, limit, category filter
- `GET /api/products/[id]` — Single product (by id or slug)
- `PATCH /api/products/[id]` — Update product (admin)
- `DELETE /api/products/[id]` — Delete product (admin)
- `GET /api/products/search` — Full-text search (insensitive, limit)
- `GET /api/products/filters` — Distinct brands, colors, sizes for filter UI
- `GET /api/products/comparison` — Multiple products by comma-separated IDs
- `GET /api/products/best-sellers` — Top 8 by order item quantity

### Slug Generation Rules
- `slugify()` in `product-form.tsx`: `normalize("NFKD")` → `normalize("NFC")` for URL match
- Server-side: `body.slug?.normalize("NFC")` in POST/PATCH
- Uniqueness: `userId.slice(0,8)` suffix (not `Date.now()`) — stable slug per merchant per product name
- Slug is `required` in form (`<select required>`)

### Product Form (`src/components/admin/product-form.tsx`)
- For new products: `handleNameChange` generates slugs from product name
- Slug dropdown shows available options (filtered against existing DB slugs)
- If no unique slug options → "اكتب اسم المنتج أولاً"

### Product Pages
- `/products` — Product listing with filters, sort, pagination (12/page)
- `/products/[slug]` — Product detail page (server component)
  - Uses `ProductPriceSection` client component for currency toggle
  - Uses `ProductColors` client component for color selection
  - Sections: image gallery, price + currency toggle, colors, stock status, description, specs table, trust badges (2×2 grid), FAQ accordion
  - `dynamicParams = true`, `generateStaticParams` fetches all slugs
- `/comparison` — Compare up to 4 products

### Product Features
- Per-color stock via `colorStock Json?` — managed in `product-form.tsx` and `add-to-cart-button.tsx`
- Color images via `colorImages Json?` (mapping color → image URL)
- Discount + deal timer (dealEnd DateTime, featured boolean)
- Brands with brandLogo
- Specs as JSON (flexible key-value pairs)
### Product Page Files
- `src/app/(shop)/products/[slug]/page.tsx` — Server component with full layout
- `src/app/(shop)/products/[slug]/price-section.tsx` — "use client" price + currency toggle
- `src/app/(shop)/products/[slug]/colors.tsx` — "use client" color swatch picker

---

## 9. MERCHANT SYSTEM

### Merchant Features
- **Dashboard** (`/merchant`): stats (orders count, revenue, stock, charts)
- **Products** (`/merchant/products`): list products with edit/delete links to store pages
- **New Product** (`/merchant/products/new`): create product, slug dropdown with existing slugs
- **Edit Product** (`/merchant/products/[id]/edit`): edit product
- **Orders** (`/merchant/orders`): orders containing merchant's products
- **Cancelled Orders** (`/merchant/orders/cancelled`): filtered cancelled orders
- **Store Settings** (`/merchant/store`): 5 cards — info, contact, social media, shipping, logo/cover upload
- **Reviews** (`/merchant/reviews`): reviews on merchant's products, reply/report
- **Withdrawals** (`/merchant/withdrawals`): withdrawal requests
- **Settings** (`/merchant/settings`): change password

### Merchant API Routes
- `GET/PATCH /api/merchant/profile` — Merchant profile + password change
- `GET/PATCH /api/merchant/store` — Store settings (getOrCreateStore pattern)
- `POST /api/merchant/store/upload` — Upload logo/cover to `public/uploads/merchant/{userId}/`
- `GET /api/merchant/stats` — Dashboard stats + charts data
- `GET /api/merchant/reviews` — Reviews for merchant's products
- `PATCH /api/merchant/reviews/[id]` — Reply to review
- `POST /api/merchant/reviews/[id]/report` — Report review
- `GET,POST /api/merchant/withdrawals` — Withdrawal management

### Merchant Sidebar
- Links: Dashboard, Products, Orders, Cancelled Orders, Store Settings, Reviews, Withdrawals, Settings
- Uses lucide-react icons

---

## 10. ADMIN SYSTEM

### Admin Features
- **Dashboard** (`/admin`): analytics (users, revenue, orders, merchants, top products)
- **Products** (`/admin/products`): full CRUD (new, edit, delete)
- **Categories** (`/admin/categories`): full CRUD with tree structure
- **Orders** (`/admin/orders`): all orders, delivered filter, cancelled filter, per-item status management
- **Banners** (`/admin/banners`): full CRUD for hero slider
- **Coupons** (`/admin/coupons`): discount code management
- **Merchants** (`/admin/merchants`): merchant list management
- **Customers** (`/admin/customers`): user list
- **Reviews** (`/admin/reviews`): all reviews, reported reviews management
- **Analytics** (`/admin/analytics`): detailed analytics with charts

### Admin API Routes
- `GET /api/admin/analytics` — Dashboard data
- `GET /api/admin/reviews` — All reviews with reported filter
- `GET /api/users` — List all users
- `POST /api/categories` — Create category (admin)
- `PATCH/DELETE /api/categories/[id]` — Update/delete category
- `POST /api/banners` — Create banner
- `PATCH/DELETE /api/banners/[id]` — Update/delete banner
- `GET/POST /api/coupons` — List/create coupons
- `PATCH/DELETE /api/coupons/[id]` — Update/delete coupon

### Admin Components
- `admin-layout-shell.tsx` — Admin layout wrapper
- `product-form.tsx` — Product create/edit form
- `banner-form.tsx` — Banner create/edit form
- `category-form.tsx` — Category create/edit form
- `delete-banner-button.tsx`, `delete-category-button.tsx`, `delete-product-button.tsx`
- `mobile-order-cards.tsx`, `order-location-link.tsx`, `order-map.tsx`

---

## 11. COMPONENT STRUCTURE

### Shop Components (`src/components/shop/`)
- `cart-context.tsx` — Cart drawer open/close state context
- `cart-drawer.tsx` — Slide-out cart with tracking
- `add-to-cart-button.tsx` — Product detail add-to-cart
- `category-pills.tsx` — Horizontal category scroll (max 10 + "show more")
- `hero-slider.tsx` — Homepage hero with banners
- `product-carousel.tsx` / `product-gallery.tsx` — Product images
- `product-filters.tsx` — Sidebar filters (brand, color, size, price, rating)
- `product-reviews.tsx` — Review list + form
- `search-input.tsx` / `search-suggestions.tsx` — Product search
- `sticky-header.tsx` — Fixed shop header with cart count
- `mobile-nav.tsx` — Bottom mobile navigation
- `ai-assistant.tsx` / `ai-assistant-wrapper.tsx` — Gemini AI chat
- `swipeable-product-card.tsx` — Mobile-friendly product card (uses `next/image`)
- `comparison-bar.tsx` / `compare-button.tsx` — Product comparison
- `countdown-timer.tsx` — Deal countdown
- `currency-toggle.tsx` — Currency switcher (YER/USD/SAR)
- `frequently-bought-together.tsx` — Cross-sell
- `product-actions.tsx` — Cart/fav/compare buttons
- `track-view.tsx` — Order tracking view
- `user-greeting.tsx` — User greeting with name

### UI Components (`src/components/ui/`)
- `badge.tsx`, `button.tsx`, `card.tsx`, `input.tsx`, `modal.tsx`, `select.tsx`, `skeleton.tsx`, `swipeable-card.tsx`, `table.tsx`, `textarea.tsx`

### Shared Components
- `theme-provider.tsx` / `theme-toggle.tsx` — Light/dark theme
- `localized.tsx` — LocalizedName/LocalizedDesc
- `translate.tsx` — `<T k="key" />` component
- `lang-toggle.tsx` — Language toggle button
- `motion-wrappers.tsx` — FadeIn, FadeInUp, StaggerContainer, StaggerItem, HoverCard
- `page-transition.tsx` — Page transition wrapper
- `i18n-server-provider.tsx` — Client wrapper for i18n

---

## 12. ROUTE STRUCTURE

### Shop Routes (`/`)
- `/` — Homepage
- `/products` — Product listing
- `/products/[slug]` — Product detail
- `/categories` — Category listing
- `/cart` — Cart page
- `/checkout` — Checkout page
- `/orders` — My Orders
- `/track` — Track order search
- `/track/[id]` — Track order detail
- `/favorites` — Favorites/wishlist
- `/favorites/shared/[userId]` — Shared wishlist
- `/comparison` — Product comparison
- `/login` — Login page
- `/register` — Register page

### Admin Routes (`/admin`)
- `/admin/login` — Admin login
- `/admin` — Dashboard
- `/admin/products` — Product CRUD
- `/admin/categories` — Category CRUD
- `/admin/orders` — Orders management
- `/admin/orders/delivered` — Delivered orders
- `/admin/orders/cancelled` — Cancelled orders
- `/admin/orders/[id]` — Order detail
- `/admin/banners` — Banner CRUD
- `/admin/coupons` — Coupon management
- `/admin/merchants` — Merchant list
- `/admin/customers` — Customer list
- `/admin/reviews` — Reviews management
- `/admin/analytics` — Analytics dashboard

### Merchant Routes (`/merchant`)
- `/merchant` — Dashboard
- `/merchant/products` — Products list
- `/merchant/products/new` — New product
- `/merchant/products/[id]/edit` — Edit product
- `/merchant/orders` — Orders
- `/merchant/orders/cancelled` — Cancelled orders
- `/merchant/store` — Store settings
- `/merchant/reviews` — Reviews
- `/merchant/withdrawals` — Withdrawals
- `/merchant/settings` — Account settings

---

## 13. CURRENCY SYSTEM

### Currency Provider (`src/lib/currency/context.tsx`)
- **Rates**: 1 USD = 535 YER, 1 USD = 535/140 SAR
- **Cycle**: YER → USD → SAR → YER ...
- **Storage**: localStorage key `"currency"`
- **Format**: `formatPrice(priceInYer)` in components
- **Display**: Prices stored in YER in DB, converted client-side

---

## 14. KEY BUSINESS RULES

### Shipping
- Free shipping if subtotal >= 5000 YER
- Otherwise: 500 YER shipping cost
- Checkout calculates: `subtotal + shipping - discount = total`

### Coupons
- Percentage-based discount (int %)
- Validation: active, not expired, maxUses not exceeded, minAmount met
- Stored in `localStorage("appliedCoupon")` — persists across sessions

### Points/Referral
- `User.points` int field (loyalty points)
- `User.referralCode` unique, `User.referredById` self-referral
- Points earned stored on `Order.pointsEarned`

### Favorites
- One favorite per product per user (unique constraint)
- Shared wishlist via `/favorites/shared/[userId]`

### Comparison
- Max 4 products compared at once
- localStorage-based via `src/lib/comparison/store.ts`

### Category Tree
- Self-referencing: `Category.parentId` → `Category.id`
- 214 categories seeded (22 main + 192 subcategories) with Arabic names + English translations
- Images: `public/image/category/` — 2 PNG (`electronic.png`, `phone-case.png`) + 46 AVIF (Unspash photos)
- Using a specific image requires knowing the filename; currently only `electronic.png` → electronics, `phone-case.png` → telephones
- **Reran seed**: Old 373 categories deleted, replaced with 214 structured categories
- Category drill-down UI: Homepage shows main categories → `/categories?parent=slug` shows subcategories with breadcrumbs
- Admin categories page includes parent column with "رئيسي" badge
- `font=raleway` does NOT support Arabic → placehold.co without `&font=raleway`
- `categoryId` is `String?` (optional) in schema — allows deleting and reseeding categories without losing products

### Images
- Product images: stored in `Product.images` (String[]) + optional `colorImages` (Json mapping color → URL)
- Category images: loremflickr (real Flickr photos)
- Merchant uploads: `public/uploads/merchant/{userId}/` (local); for Vercel production needs Vercel Blob
- Upload route: `POST /api/upload` (UploadThing) — ~10MB limit via `proxyClientMaxBodySize: 15MB` in next.config.ts + explicit check in route
- File size: explicit check at 10MB in route; `proxyClientMaxBodySize` in next.config.ts at 15MB; Nginx at 50M (local only)

---

## 15. MOBILE APP (Expo/React Native)

- Directory: `mobile/`
- Cross-platform iOS + Android via Expo
- Mirrors web app: products, cart, checkout, orders, tracking, admin, merchant
- Uses AsyncStorage for cart (not localStorage)
- NativeWind (Tailwind for React Native)
- `expo-router` for file-based routing

---

## 16. COMMON ISSUES & FIXES

### EPERM (file lock) errors
```
Get-Process -Name "node" | Stop-Process -Force
```
Then restart dev server.

### 404 on product detail page after creation
- Check slug format: must match `normalize("NFC")` on both client and server
- `generateStaticParams` in `/products/[slug]/page.tsx` must not have `take` limit
- `dynamicParams = true` must be set

### Slug dropdown empty in product form
- `handleNameChange` may not be called or `slugify` returns empty for some input
- Fix: check `slugify()` function handles Arabic text correctly
- Alternative: show existing slugs from DB as options

### Decimal serialization
- Prisma returns Decimal as string in JSON; use `Number()` to convert in client
- E.g., `Number(item.price).toFixed(2)`

### Per-color stock
- Stored as JSON in `colorStock` field: `{"red": 5, "blue": 3}`
- `add-to-cart-button.tsx` checks color-specific stock limits

### Vercel deploy fails
- Check build logs on Vercel dashboard
- Common: missing env vars in Vercel project settings (especially `AUTH_TRUST_HOST`)
- Railway DB connection: ensure IP not blocked, DATABASE_URL correct

### 413 / Upload fails on Vercel
- Vercel serverless has 4.5MB body limit (no workaround). Files >4.5MB must be uploaded directly to UploadThing (client-side), not proxied through Vercel
- For local: `proxyClientMaxBodySize` in next.config.ts controls the buffer limit
- Upload route has explicit 10MB check with clear error message

### UntrustedHost (NextAuth v5)
- `auth()[error] UntrustedHost` — set `AUTH_TRUST_HOST=true` in `.env` and `.env.local`
- Required when behind any proxy (Vercel, Nginx, Cloudflare, etc.)

### 401 on POST API routes with auth
- Reminder: Do NOT use `auth()` as route wrapper for POST/PUT/DELETE (CSRF required). Use `const session = await auth()` inside handler instead.

---

## 17. SCRIPTS

| Script | Purpose |
|--------|---------|
| `npx prisma generate` | Generate Prisma client (runs automatically on postinstall) |
| `npx prisma migrate dev` | Create migration from schema changes |
| `npx prisma migrate deploy` | Apply migrations to production |
| `npx tsx scripts/seed-categories.ts` | Seed 376 categories with Arabic/English names |
| `npx tsx scripts/seed-category-images-real.ts` | Assign loremflickr images to categories |
| `scripts/_check_images2.ts` | Internal image checking |

---

## 18. DIRECTORY STRUCTURE (src/)

```
src/
├── app/
│   ├── (shop)/          # Public shop pages
│   ├── admin/
│   │   ├── login/       # Admin login
│   │   └── (protected)/ # Admin dashboard + CRUD
│   ├── merchant/        # Merchant dashboard
│   ├── api/             # All API routes
│   └── login/           # Customer login
│   └── register/        # Customer register
├── components/
│   ├── shop/            # Shop components
│   ├── admin/           # Admin components
│   ├── merchant/        # Merchant components
│   └── ui/              # Shared UI primitives
├── lib/
│   ├── auth.ts          # NextAuth config
│   ├── prisma.ts        # Prisma singleton
│   ├── cart/            # Cart store
│   ├── comparison/      # Comparison store
│   ├── currency/        # Currency context
│   ├── i18n/            # Internationalization
│   ├── utils.ts         # cn() helper
│   ├── logger.ts        # Structured logger
│   └── animations.ts    # Motion presets
├── types/               # TypeScript types
└── proxy.ts             # Auth middleware
```

---

## 19. WORK PROTOCOLS (بروتوكولات العمل)

### Protocol 1: Planning Protocol (التخطيط المعماري الصارم)

**الدور والمسؤولية**: Staff Software Engineer + Tech Lead — تخطيط معماري صارم للمشروع.

**قواعد ما قبل التخطيط (Think Before Coding)**:
1. حدد الافتراضات حول المتطلبات بوضوح
2. إذا وُجد غموض، توقف واسأل فوراً؛ لا تختار مساراً بصمت
3. اقترح الحل الأبسط (Simplicity First) وارفض التعقيدات غير الضرورية

**البروتوكولات الإلزامية (تسلسلية)**:

| # | البروتوكول | المطلوب |
|---|-----------|---------|
| 1 | **الوعي الزمني** | حدد السنة/الشهر من النظام، ابحث في npm/GitHub عن أحدث الإصدارات المستقرة، تجنب Deprecated |
| 2 | **منع زحف الميزات** | التزم بالنطاق فقط — لا ميزات إضافية، لا مرونة غير مطلوبة. ارسم رحلة المستخدم كأهداف قابلة للتحقق |
| 3 | **المعمارية الذكية** | Simplicity First: أقل كود يحل المشكلة. Shared/Core فقط للمنطق المتكرر فعلياً. لا Micro-files |
| 4 | **التدقيق السريع** | تحقق من المخرجات وتأكد من صحتها قبل التسليم |
| 5 | **الخرائطية الخارجية** | أنشئ/حدّث `PROJECT_MAP.md` متضمناً: TECH_STACK, SYSTEM_FLOW, ARCHITECTURE, ORPHANS & PENDING |

**المخرجات**: خطة عمل بـ Milestones تعتمد "نجاح الأهداف" (Verifiable Goals).

---

### Protocol 2: Execution Protocol (محرك التنفيذ المستمر)

**الدور**: Tech Lead مسؤول عن تحويل الخطة إلى منتج نهائي بصلاحية تنفيذ كاملة.

**معايير التنفيذ**:
1. **بساطة التنفيذ**: 50 سطراً بدلاً من 200 إن أمكن. لا برمجيات تخمينية.
2. **التنفيذ الموجه بالأهداف**: لكل ميزة، حدد معيار النجاح قبل كتابة الكود. لانتقل لما بعده حتى يتحقق.

**بروتوكولات العمل الذاتي**:

| # | البروتوكول | المطلوب |
|---|-----------|---------|
| 1 | **جودة الكود** | منع Placeholders و TODO. كود كامل معالج للأخطاء ومربوط بالـ Logging |
| 2 | **التحقق الذاتي** | Loop Until Verified: اكتب اختبارات تلقائية أو محاكاة لكل جزء. لا تترك mess. تأكد من عدم Regression |
| 3 | **المزامنة الحية** | حدّث `PROJECT_MAP.md` ديناميكياً. أي ميزة لم تُربط → ORPHANS & PENDING فوراً، تُحذف عند الاكتمال |
| 4 | **الالتزام بالتدفق** | ارجع دوماً لـ SYSTEM_FLOW. كل سطر يخدم رحلة المستخدم المطلوبة فقط |

**أمر الانطلاق**: تنفيذ تسلسلي: (1. نفذ → 2. تحقق → 3. حدّث الخريطة). لا تتوقف حتى ORPHANS & PENDING فارغ والمنتج كامل.

---

### Protocol 3: Surgical Editing (التعديل الجراحي)

**الدور**: Staff Software Engineer — جراحة برمجية دون تخريب الميزات الأخرى.

**قواعد التعديل الجراحي**:
1. **المس فقط ما يجب لمسه**: لا تحسّن كوداً مجاوراً، لا تعد صياغة تعليقات، لا Refactoring لكود يعمل ما لم يُطلب
2. **مطابقة الأسلوب**: التزم بأسلوب الكود الحالي تماماً حتى لو كنت تراه غير مثالي
3. **تنظيف مخلفاتك فقط**: إذا تعديلك جعل دالة/Import يتيماً → أزله. لا تلمس الأكواد الميتة القديمة

**بروتوكول التنفيذ**:

| # | البروتوكول | المطلوب |
|---|-----------|---------|
| 1 | **تحليل التأثير** | اقرأ الملفات المتأثرة بدقة. حدد الافتراضات. Think Before Coding |
| 2 | **السلامة المعمارية** | التزم بـ DRY واستخدم Shared/Core. أضف Logging للتعديل الجديد |
| 3 | **التحقق والنجاح** | حوّل التعديل إلى هدف قابل للتحقق. TDD: اكتب الاختبار، تأكد من فشله، ثم اجعله ينجح. تأكد من عدم Regression |
| 4 | **مزامنة الحالة** | حدّث `PROJECT_MAP.md`. أي كود أصبح Deprecated → عالجه أو سجّله في ORPHANS |

**أمر التنفيذ**: نفذ البروتوكولات بشكل مستمر. ابدأ بتحليل التأثير، ثم التنفيذ الجراحي المباشر.

---

## 20. GMSTORE PROJECT MAP

### Tech Stack
```
Next.js 16.2.7 | TypeScript strict | Prisma 6.19.3 | PostgreSQL (Supabase prod / localhost dev)
NextAuth v5 | Tailwind v4 (CSS-based) | Motion v12 | Zod v4
UploadThing | Cloudinary | Google Gemini API | Stripe
```

### System Flow
```
Customer → Browse/Search → Add to Cart → Checkout → Order Tracking
Merchant → Dashboard → Product CRUD → Orders → Withdrawals
Admin → Analytics → Products → Categories → Orders → Banners → Coupons → Reviews
```

### Architecture
```
src/
├── app/(shop)/         → Public: products, cart, checkout, orders, favorites
├── app/admin/          → Admin CRUD: products, categories, orders, banners, coupons
├── app/merchant/       → Merchant: dashboard, products, orders, store settings
├── app/api/            → REST API endpoints (auth, products, orders, admin, merchant)
├── components/shop/    → Shop UI components
├── components/admin/   → Admin UI components
├── lib/                → Core: auth, prisma, cart, i18n, currency, animations
└── types/              → TypeScript types
```

### ORPHANS & PENDING
- [ ] Supabase Arabic encoding fix (double-encoded UTF-8 data from pg_dump import)
- [ ] Supabase connection pool optimization (switch to transaction pooler port 6543)

---

هذه هي المعرفة الكاملة لـ GMStore. أي سؤال أو تعديل — أنا جاهز.
