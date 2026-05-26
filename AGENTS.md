# AGENTS.md — oshi ordering platform

This file tells every AI agent how to work in this codebase. Read it before touching anything.

---

## What this project is

Single-restaurant food ordering platform. Customers browse a menu, add items to a cart, checkout with a Thai phone number, pay via static PromptPay QR, upload payment evidence, and look up orders by phone. Merchants manage orders and menus behind a static-secret login.

No user accounts. No payment gateway. No multi-tenancy.

---

## Monorepo layout

```
oshi/
├── worker/          Cloudflare Worker — Hono API, D1 queries, R2 I/O
│   ├── src/
│   │   ├── index.ts          Entry point — mounts all route groups
│   │   ├── types.ts          Shared worker types (Bindings, DB row shapes)
│   │   ├── middleware/
│   │   │   └── auth.ts       merchantAuth middleware
│   │   ├── routes/
│   │   │   ├── menu.ts       Public menu + merchant menu CRUD
│   │   │   ├── orders.ts     Customer order creation + lookup
│   │   │   ├── merchant.ts   Auth, order list, status transitions
│   │   │   └── files.ts      R2 upload/download for evidence + menu images
│   │   └── db/
│   │       └── schema.sql    D1 schema (source of truth)
│   ├── tests/                Vitest test files (one per route file)
│   └── vitest.config.ts
├── frontend/        React 18 + Vite SPA
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx           React Router route declarations
│   │   ├── types.ts          Frontend types (camelCase)
│   │   ├── context/
│   │   │   └── CartContext.tsx
│   │   ├── components/
│   │   │   ├── MenuItemCard.tsx   also exports formatTHB()
│   │   │   ├── CartDrawer.tsx
│   │   │   ├── OrderStatusBadge.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── pages/            One file per route (8 pages)
│   │   └── lib/
│   │       ├── api.ts        All fetch calls — single `api` object
│   │       └── cart.ts       localStorage cart helpers
│   └── public/
│       └── promptpay-qr.png  PLACEHOLDER — replace with real QR before prod
├── wrangler.toml    Cloudflare deployment config
├── package.json     npm workspaces root
└── DEPLOY.md        Step-by-step deployment instructions
```

---

## Commands

| Task | Command |
|------|---------|
| Run worker dev server | `npm run dev:worker` (wrangler dev on :8787) |
| Run frontend dev server | `npm run dev:frontend` (Vite on :5173, proxies /api → :8787) |
| Run all tests | `npm test --workspaces` |
| Run worker tests only | `cd worker && npm test` |
| Run frontend tests only | `cd frontend && npm test` |
| Production build | `npm run build` |
| Deploy to Cloudflare | `npm run deploy` (build + wrangler deploy) |

Never run `wrangler deploy` directly — always `npm run deploy` so the frontend is built first.

Local dev secrets live in `.dev.vars` (gitignored):
```
MERCHANT_SECRET=dev-secret-change-me
```

---

## Data model

Defined in `worker/src/db/schema.sql`. Apply changes with:
```
wrangler d1 execute oshi-db --file=worker/src/db/schema.sql
```

### Tables

**menu_items** — `id` (UUID), `name`, `description` (nullable), `price` (satang), `image_key` (R2 key, nullable), `is_available` (0/1), `created_at`

**counters** — `key`, `value` — single row `order_number` seeds the ORD-XXXX counter

**orders** — `id` (UUID), `order_number` (ORD-XXXX, unique), `customer_name`, `phone_number`, `status`, `total_amount` (satang), `evidence_key` (R2 key, nullable), `created_at`, `updated_at`

**order_items** — `id`, `order_id` (FK), `menu_item_id`, `name` (snapshot), `price` (snapshot), `quantity`

### Money

All monetary values are stored and transported as **satang (THB × 100)** — integers. Display conversion: `฿${(satang / 100).toFixed(2)}`. The helper `formatTHB(satang)` is exported from `frontend/src/components/MenuItemCard.tsx`.

### Naming convention

DB columns use `snake_case`. API JSON responses use `camelCase`. The mapping happens in each route handler (e.g. `image_key` → `imageKey`, `order_number` → `orderNumber`). Never expose raw DB column names in API responses.

---

## Worker conventions

### Framework

Hono v4. All route files export a `new Hono<{ Bindings: Bindings }>()` instance mounted in `worker/src/index.ts` via `app.route('/api', ...)`.

```ts
// index.ts mounts everything under /api
app.route('/api', menuRoutes)
app.route('/api', orderRoutes)
app.route('/api', merchantRoutes)
app.route('/api', fileRoutes)
// Fallback: serve SPA
app.get('*', (c) => c.env.ASSETS.fetch(c.req.raw))
```

Every new route group follows the same pattern: create a file in `worker/src/routes/`, export a Hono instance, import and mount it in `index.ts`.

### Bindings

Defined in `worker/src/types.ts`:

```ts
export type Bindings = {
  DB: D1Database
  R2: R2Bucket
  ASSETS: Fetcher
  MERCHANT_SECRET: string  // set via: wrangler secret put MERCHANT_SECRET
}
```

All route handlers are typed `Hono<{ Bindings: Bindings }>`. Access via `c.env.DB`, `c.env.R2`, etc.

### Merchant authentication

Protected routes use the `merchantAuth` middleware from `worker/src/middleware/auth.ts`. It checks the `merchant_token` cookie against `c.env.MERCHANT_SECRET`.

```ts
import { merchantAuth } from '../middleware/auth'
merchantRoutes.get('/merchant/orders', merchantAuth, async (c) => { ... })
```

**Exception:** `menu.ts` has a local `isMerchantAuthed()` helper that performs the same check inline (a known duplication — do not add a third copy; fix by migrating `menu.ts` to use the shared middleware when touching that file).

### Order status state machine

Valid transitions only — enforced in `worker/src/routes/merchant.ts`:

```
pending → preparing | cancelled
preparing → ready | cancelled
ready → done | cancelled
done → (terminal)
cancelled → (terminal)
```

Return HTTP 422 for invalid transitions. Never skip this check.

### Order number generation

Batch D1 operation: `UPDATE counters` then `SELECT value` in a single `.batch([])` call. Zero-pad to 4 digits: `ORD-${String(val).padStart(4, '0')}`. This relies on D1's batch transaction guarantee — do not split into two separate calls.

### R2 file safety pattern

For any R2 upload that replaces an existing file:
1. `R2.put(newKey, buffer)` — write first
2. Update DB to point to new key
3. `R2.delete(oldKey)` — only if old key differs from new key

Never delete before writing. This prevents data loss if the write fails.

### Error responses

All errors return structured JSON: `{ error: string }` with an appropriate HTTP status. Never let stack traces reach the response.

---

## Frontend conventions

### API calls

All fetch calls go through `frontend/src/lib/api.ts`. The exported `api` object is the only way to talk to the backend:

```ts
import { api } from '../lib/api'

// Examples
const { items } = await api.menu.list()
const { orderId, orderNumber } = await api.orders.create({ ... })
await api.merchant.orders.updateStatus(id, 'ready')
```

File uploads (evidence, menu image) use the dedicated `uploadEvidence` and `uploadImage` helpers — they set `Content-Type` to the file's MIME type and send raw binary. The `req()` helper in `api.ts` sets `Content-Type: application/json` by default, so never use it for file uploads.

### Types

Frontend types live in `frontend/src/types.ts` and are camelCase throughout. Do not import worker types into the frontend.

```ts
MenuItem    // id, name, description, price (satang), imageKey, isAvailable
Order       // id, orderNumber, customerName, phoneNumber, status, totalAmount, items[], hasEvidence, createdAt
OrderItem   // id, menuItemId, name, price, quantity
CartItem    // id, name, price, quantity, imageKey
```

### Cart

`frontend/src/lib/cart.ts` manages cart state in `localStorage` under key `oshi_cart`. Always use these helpers — never write to localStorage directly. `updateQuantity(id, 0)` and negative quantities both call `removeFromCart` internally.

### ProtectedRoute

Merchant pages are wrapped in `<ProtectedRoute>`. It reads `document.cookie` and checks for the exact string `merchant_logged_in=1` (not a substring match). Redirect target is `/merchant`. No API call is made — the check is purely client-side cookie presence.

### Routing

Defined in `frontend/src/App.tsx`. All 8 routes:

| Path | Page |
|------|------|
| `/` | LandingPage |
| `/checkout` | CheckoutPage |
| `/payment/:id` | PaymentPage |
| `/orders` | OrderLookupPage |
| `/merchant` | MerchantLoginPage |
| `/merchant/orders` | MerchantOrdersPage (protected) |
| `/merchant/orders/:id` | MerchantOrderDetailPage (protected) |
| `/merchant/menu` | MerchantMenuPage (protected) |

### Styling

Tailwind CSS v3. Mobile-first. Customer-facing pages use Thai language text. Merchant panel may be English or bilingual. Primary action color: `orange-500`. Use `rounded-xl`, `shadow-sm`, `border` for cards.

### Dev server proxy

Vite proxies `/api/*` to `http://localhost:8787` (wrangler dev). No CORS headers are needed — the app is same-origin in production and proxied in dev.

---

## Testing

### Worker tests

Location: `worker/tests/`. One file per route file. Run with `cd worker && npm test`.

Pattern: mock D1 and R2 as plain objects, mount the route on a throwaway Hono app, call `app.request(path, init, env)` from Hono. No `@cloudflare/vitest-pool-workers` — plain Vitest with `environment: 'node'`.

```ts
const mockEnv = { DB: makeDb(), R2: {} as R2Bucket, ASSETS: {} as Fetcher, MERCHANT_SECRET: 'test-secret' }
const res = await app.request('/api/menu', {}, mockEnv)
```

Merchant auth in tests: pass `Cookie: merchant_token=test-secret` header.

Every route file must have a corresponding test file. Minimum coverage: happy path + auth rejection (for protected routes) + one validation error path.

### Frontend tests

Location: `frontend/src/lib/cart.test.ts`. Vitest with `jsdom` environment (configured in `vite.config.ts`). Tests for cart logic only — no component tests currently.

---

## Security rules

These are hard rules — never violate them:

1. **`MERCHANT_SECRET` never in source code.** It is a Cloudflare Worker Secret set via `wrangler secret put MERCHANT_SECRET`. For local dev only, it goes in `.dev.vars` (gitignored). It must never appear in `wrangler.toml` or any committed file.

2. **Payment evidence is not public.** `GET /api/merchant/orders/:id/evidence` requires `merchantAuth`. There is no public evidence route.

3. **Phone validation on both sides.** Regex `/^0\d{9}$/` (10 digits, starts with 0) must be checked in the server route and in the client form before submission.

4. **File type and size validated on both sides.** Evidence: JPEG/PNG/PDF, max 5 MB. Menu images: JPEG/PNG only, max 5 MB. Server rejects non-conforming uploads — client checks prevent unnecessary round-trips.

5. **Parameterized queries only.** All D1 queries use `.bind()` — never string-interpolate user input into SQL.

---

## Known limitations (do not "fix" without discussion)

- **Soft delete conflates "out of stock" and "deleted"** — `DELETE /merchant/menu/:id` sets `is_available = 0`. Deleted items still appear in the customer menu (greyed out). This is intentional to preserve order history references.
- **Order total is client-supplied** — `POST /api/orders` accepts `price` from the client without a DB lookup. Acceptable for this MVP but is a financial integrity gap for a real payment system.
- **`menu.ts` duplicates `merchantAuth` logic** — the `isMerchantAuthed()` helper mirrors `middleware/auth.ts`. When modifying either, keep them in sync.
- **PromptPay QR is a placeholder** — `frontend/public/promptpay-qr.png` is a 1×1 transparent PNG. Replace with the real QR from the bank before going live.
- **`database_id` in `wrangler.toml` is a placeholder** — replace with the real ID after running `wrangler d1 create oshi-db`.
