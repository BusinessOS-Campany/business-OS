# GM Store — Project Map

## Architecture
- **Framework**: Next.js 16.2.7 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 (Oxide, CSS-first config)
- **Database**: PostgreSQL + Prisma 6.19.3
- **Auth**: Auth.js v5 (next-auth@beta), Credentials provider, JWT sessions
- **UI Components**: Custom primitives in `src/components/ui/`
- **Animation**: Motion 12.40.0 (`motion/react`)
- **File Upload**: Local `/public/uploads/` (admin)
- **Payments**: Stripe SDK (installed, not yet integrated)
- **Font**: Geist (Sans + Mono)

## Directory Structure

```
D:\GMstore\
├── prisma/
│   ├── schema.prisma          # Database schema (User, Category, Product, Order, OrderItem)
│   └── seed.ts                # Creates admin user (admin@gmstore.com / admin123)
├── public/
│   └── uploads/               # Uploaded product images
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout (Arabic RTL, Geist font)
│   │   ├── globals.css        # Tailwind CSS v4 theme directives
│   │   ├── proxy.ts           # Next.js 16 middleware equivalent — admin auth guard
│   │   ├── (shop)/            # Public storefront routes
│   │   │   ├── layout.tsx     # Shop layout (header + footer)
│   │   │   ├── page.tsx       # Homepage — featured + latest products
│   │   │   ├── products/
│   │   │   │   ├── page.tsx   # Product listing with category filter
│   │   │   │   └── [slug]/
│   │   │   │       └── page.tsx # Product detail page
│   │   │   ├── categories/
│   │   │   │   └── page.tsx   # Category listing
│   │   │   ├── cart/
│   │   │   │   └── page.tsx   # Shopping cart (localStorage-based)
│   │   │   └── checkout/
│   │   │       └── page.tsx   # Checkout form
│   │   ├── admin/             # Admin dashboard (protected)
│   │   │   ├── layout.tsx     # Admin layout with sidebar nav
│   │   │   ├── page.tsx       # Dashboard overview (counts)
│   │   │   ├── login/
│   │   │   │   └── page.tsx   # Admin login form
│   │   │   ├── products/
│   │   │   │   ├── page.tsx   # Product list with delete
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx  # Create product form
│   │   │   │   └── [id]/
│   │   │   │       └── edit/
│   │   │   │           └── page.tsx  # Edit product form
│   │   │   ├── categories/
│   │   │   │   ├── page.tsx   # Category list
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx  # Create category form
│   │   │   │   └── [id]/
│   │   │   │       └── edit/
│   │   │   │           └── page.tsx  # Edit category form
│   │   │   └── orders/
│   │   │       └── page.tsx   # Order list with status badges
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts  # Auth.js API handlers
│   │       ├── products/
│   │       │   ├── route.ts      # POST / PATCH products
│   │       │   └── [id]/route.ts # DELETE product
│   │       ├── categories/
│   │       │   ├── route.ts      # POST / PATCH categories
│   │       │   └── [id]/route.ts # DELETE category
│   │       ├── checkout/route.ts # Create order from cart
│   │       ├── upload/route.ts   # Local file upload
│   │       └── uploadthing/route.ts # UploadThing route (for future use)
│   ├── components/
│   │   ├── ui/                # Primitives: Button, Input, Select, Textarea, Card, Badge, Table, Modal
│   │   ├── admin/
│   │   │   ├── product-form.tsx        # Shared product create/edit form
│   │   │   ├── category-form.tsx       # Shared category create/edit form
│   │   │   ├── delete-product-button.tsx  # Delete with confirmation modal
│   │   │   └── delete-category-button.tsx # Delete with confirmation modal
│   │   └── shop/
│   │       └── add-to-cart-button.tsx  # Client-side add to cart button
│   ├── lib/
│   │   ├── prisma.ts          # PrismaClient singleton
│   │   ├── auth.ts            # NextAuth config (Credentials, JWT, role in token)
│   │   ├── utils.ts           # cn() utility
│   │   ├── logger.ts          # Async JSON logger
│   │   └── uploadthing.ts     # UploadThing config (for future image service)
│   └── types/
│       └── index.ts           # CartItem, SafeUser, ProductWithCategory
└── .env                       # Environment variables template
```

## Data Flow
1. **Auth**: Admin logs in via `/admin/login` → Auth.js Credentials provider → JWT token with role → `proxy.ts` guards `/admin/*` routes
2. **Admin CRUD**: Server components fetch data via Prisma, mutations via API routes (POST/PATCH/DELETE) with auth check
3. **Shop**: Server components render product listings, `AddToCartButton` writes to `localStorage`, cart page reads localStorage
4. **Checkout**: Form submits order items → `/api/checkout` → creates Order + OrderItems in DB → clears cart

## Key Decisions
- Prisma 6.19.3 (Node v20.8.0 limitation)
- Next.js 16 proxy.ts for middleware (not middleware.ts)
- Tailwind v4 CSS-first config (no tailwind.config.ts)
- Auth.js v5 beta with JWT sessions
- Guest checkout (no login required for customers)
- Local file upload for product images
- Cart stored in localStorage (no backend cart for guests)
- Arabic RTL interface throughout

## How to Run
```bash
npm run dev          # Start dev server on :3000
npx prisma db push   # Sync schema to database
npx tsx prisma/seed.ts  # Create admin user
```

## Status
- [x] Project scaffold & config
- [x] Database schema (Prisma)
- [x] UI primitives (8 components)
- [x] Auth (Auth.js + Credentials)
- [x] Admin layout & pages (dashboard, products CRUD, categories CRUD, orders list)
- [x] Shop layout & pages (home, products, product detail, categories, cart, checkout)
- [x] API routes (products, categories, checkout, upload)
- [x] proxy.ts (admin auth guard)
- [x] Seed script
- [ ] Stripe payment integration
- [ ] Server-side cart (database-backed)
- [ ] Product search
- [ ] Pagination
- [ ] Unit/integration tests
