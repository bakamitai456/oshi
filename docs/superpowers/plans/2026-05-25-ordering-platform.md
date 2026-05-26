# Ordering Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-restaurant food ordering platform with QR PromptPay payment, deployed on Cloudflare Workers + D1 + R2 + Pages.

**Architecture:** Monorepo — Hono Worker serves `GET|POST|PATCH /api/*` and static assets from `frontend/dist` via `[assets]` binding. D1 stores relational data; R2 stores menu images and payment evidence. No auth for customers; merchant uses a static secret stored as a Worker Secret.

**Tech Stack:** TypeScript, Hono v4, React 18 + Vite + React Router v6, Tailwind CSS v3, Cloudflare D1 + R2, Wrangler CLI v3, Vitest

---

## File Map

### Worker
| File | Responsibility |
|------|----------------|
| `worker/src/index.ts` | Hono app, mount all routes |
| `worker/src/types.ts` | `Bindings`, `MenuItem`, `Order`, `OrderItem` TS types |
| `worker/src/middleware/auth.ts` | Check `merchant_token` cookie → 401 |
| `worker/src/routes/menu.ts` | `GET /api/menu`; merchant CRUD under `/api/merchant/menu` |
| `worker/src/routes/orders.ts` | `POST /api/orders`, `GET /api/orders?phone=`, `GET /api/orders/:id` |
| `worker/src/routes/merchant.ts` | `POST /api/merchant/login`, `POST /api/merchant/logout`, `PATCH /api/merchant/orders/:id/status` |
| `worker/src/routes/files.ts` | `PUT /api/orders/:id/evidence`, `GET /api/merchant/orders/:id/evidence` |
| `worker/src/db/schema.sql` | DDL: menu_items, orders, order_items, counters |
| `worker/tests/menu.test.ts` | Vitest unit tests for menu routes |
| `worker/tests/orders.test.ts` | Vitest unit tests for order routes |
| `worker/tests/merchant.test.ts` | Vitest unit tests for merchant auth + status |

### Frontend
| File | Responsibility |
|------|----------------|
| `frontend/src/main.tsx` | React root mount |
| `frontend/src/App.tsx` | React Router `<Routes>` |
| `frontend/src/types.ts` | `MenuItem`, `Order`, `OrderItem`, `CartItem` |
| `frontend/src/lib/api.ts` | Typed `fetch` wrappers for all endpoints |
| `frontend/src/lib/cart.ts` | localStorage cart helpers |
| `frontend/src/context/CartContext.tsx` | Cart provider + `useCart` hook |
| `frontend/src/components/MenuItemCard.tsx` | Card with add-to-cart |
| `frontend/src/components/CartDrawer.tsx` | Slide-out cart panel |
| `frontend/src/components/OrderStatusBadge.tsx` | Color-coded status pill |
| `frontend/src/components/ProtectedRoute.tsx` | Redirects to `/merchant` when not logged in |
| `frontend/src/pages/LandingPage.tsx` | `/` — menu grid + cart trigger |
| `frontend/src/pages/CheckoutPage.tsx` | `/checkout` — name + phone form |
| `frontend/src/pages/PaymentPage.tsx` | `/payment/:id` — QR + evidence upload |
| `frontend/src/pages/OrderLookupPage.tsx` | `/orders` — lookup by phone |
| `frontend/src/pages/MerchantLoginPage.tsx` | `/merchant` — secret code form |
| `frontend/src/pages/MerchantOrdersPage.tsx` | `/merchant/orders` — order list + status filter |
| `frontend/src/pages/MerchantOrderDetailPage.tsx` | `/merchant/orders/:id` — detail + actions |
| `frontend/src/pages/MerchantMenuPage.tsx` | `/merchant/menu` — CRUD |

---

## Parallel Execution Map

```
Task 1 (Bootstrap)
└── Task 2 (DB Schema + Types)
      ├── Task 3a (Menu API)       ─┐
      ├── Task 3b (Order API)      ─┼─ all parallel after Task 2
      ├── Task 3c (Merchant API)   ─┤
      └── Task 4  (Files API)      ─┘

Task 1 (Bootstrap) ──► Task 5a (Frontend Base)
                              ├── Task 5b (Customer Pages)  ─┐ parallel after 5a
                              └── Task 5c (Merchant Pages)  ─┘

Task 6 (Integration & Deploy) — after all above
```

---

## Task 1: Project Bootstrap

**Files:**
- Create: `package.json` (root)
- Create: `wrangler.toml`
- Create: `worker/package.json`
- Create: `worker/tsconfig.json`
- Create: `frontend/package.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tailwind.config.ts`
- Create: `frontend/postcss.config.ts`
- Create: `frontend/index.html`

- [ ] **Step 1: Init root workspace**

```bash
npm init -y
```

Edit `package.json`:
```json
{
  "name": "oshi",
  "private": true,
  "workspaces": ["worker", "frontend"],
  "scripts": {
    "dev:worker": "cd worker && wrangler dev",
    "dev:frontend": "cd frontend && npm run dev",
    "build": "cd frontend && npm run build",
    "deploy": "npm run build && wrangler deploy"
  }
}
```

- [ ] **Step 2: Init worker package**

```bash
mkdir -p worker/src/routes worker/src/middleware worker/src/db worker/tests
```

`worker/package.json`:
```json
{
  "name": "oshi-worker",
  "version": "1.0.0",
  "private": true,
  "main": "src/index.ts",
  "scripts": {
    "test": "vitest run"
  },
  "dependencies": {
    "hono": "^4.4.0"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20240524.0",
    "typescript": "^5.4.0",
    "vitest": "^1.6.0",
    "wrangler": "^3.60.0"
  }
}
```

`worker/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "strict": true,
    "types": ["@cloudflare/workers-types"],
    "lib": ["ES2022"]
  },
  "include": ["src/**/*", "tests/**/*"]
}
```

- [ ] **Step 3: Init frontend package**

```bash
mkdir -p frontend/src/pages frontend/src/components frontend/src/lib frontend/src/context frontend/public
```

`frontend/package.json`:
```json
{
  "name": "oshi-frontend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest run"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.24.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.4",
    "typescript": "^5.4.0",
    "vite": "^5.3.0",
    "vitest": "^1.6.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.4.0",
    "jsdom": "^24.1.0"
  }
}
```

`frontend/vite.config.ts`:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
})
```

`frontend/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  },
  "include": ["src"]
}
```

`frontend/tailwind.config.ts`:
```typescript
import type { Config } from 'tailwindcss'
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
} satisfies Config
```

`frontend/postcss.config.ts`:
```typescript
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
}
```

`frontend/index.html`:
```html
<!doctype html>
<html lang="th">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>สั่งอาหาร</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Create `frontend/src/test-setup.ts`:
```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 4: Create wrangler.toml**

```toml
name = "oshi"
main = "worker/src/index.ts"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]

[assets]
directory = "./frontend/dist"
binding = "ASSETS"

[[d1_databases]]
binding = "DB"
database_name = "oshi-db"
database_id = "PLACEHOLDER_REPLACE_AFTER_D1_CREATE"

[[r2_buckets]]
binding = "R2"
bucket_name = "oshi-files"
```

- [ ] **Step 5: Install dependencies**

```bash
npm install
```

Expected: `node_modules` populated in root and both workspaces.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "chore: scaffold monorepo with worker and frontend packages"
```

---

## Task 2: Database Schema + Shared Types

**Files:**
- Create: `worker/src/db/schema.sql`
- Create: `worker/src/types.ts`

**Depends on:** Task 1

- [ ] **Step 1: Write schema.sql**

`worker/src/db/schema.sql`:
```sql
CREATE TABLE IF NOT EXISTS menu_items (
  id          TEXT    PRIMARY KEY,
  name        TEXT    NOT NULL,
  description TEXT,
  price       INTEGER NOT NULL,
  image_key   TEXT,
  is_available INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS counters (
  key   TEXT    PRIMARY KEY,
  value INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO counters (key, value) VALUES ('order_number', 0);

CREATE TABLE IF NOT EXISTS orders (
  id            TEXT    PRIMARY KEY,
  order_number  TEXT    UNIQUE NOT NULL,
  customer_name TEXT    NOT NULL,
  phone_number  TEXT    NOT NULL,
  status        TEXT    NOT NULL DEFAULT 'pending',
  total_amount  INTEGER NOT NULL,
  evidence_key  TEXT,
  created_at    TEXT    NOT NULL,
  updated_at    TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS order_items (
  id           TEXT    PRIMARY KEY,
  order_id     TEXT    NOT NULL REFERENCES orders(id),
  menu_item_id TEXT    NOT NULL,
  name         TEXT    NOT NULL,
  price        INTEGER NOT NULL,
  quantity     INTEGER NOT NULL
);
```

- [ ] **Step 2: Write types.ts**

`worker/src/types.ts`:
```typescript
export type Bindings = {
  DB: D1Database
  R2: R2Bucket
  ASSETS: Fetcher
  MERCHANT_SECRET: string
}

export type MenuItem = {
  id: string
  name: string
  description: string | null
  price: number
  image_key: string | null
  is_available: number
  created_at: string
}

export type Order = {
  id: string
  order_number: string
  customer_name: string
  phone_number: string
  status: 'pending' | 'preparing' | 'ready' | 'done' | 'cancelled'
  total_amount: number
  evidence_key: string | null
  created_at: string
  updated_at: string
}

export type OrderItem = {
  id: string
  order_id: string
  menu_item_id: string
  name: string
  price: number
  quantity: number
}
```

- [ ] **Step 3: Write frontend types.ts**

`frontend/src/types.ts`:
```typescript
export type MenuItem = {
  id: string
  name: string
  description: string | null
  price: number
  imageKey: string | null
  isAvailable: boolean
}

export type OrderItem = {
  id: string
  menuItemId: string
  name: string
  price: number
  quantity: number
}

export type Order = {
  id: string
  orderNumber: string
  customerName: string
  phoneNumber: string
  status: 'pending' | 'preparing' | 'ready' | 'done' | 'cancelled'
  totalAmount: number
  items: OrderItem[]
  hasEvidence: boolean
  createdAt: string
}

export type CartItem = {
  id: string
  name: string
  price: number
  quantity: number
  imageKey: string | null
}
```

- [ ] **Step 4: Create D1 database and apply schema**

```bash
# Create the D1 database (requires Cloudflare login)
wrangler d1 create oshi-db
# Copy the database_id from output and update wrangler.toml

# Apply schema locally for dev
wrangler d1 execute oshi-db --local --file=worker/src/db/schema.sql

# Apply to production
wrangler d1 execute oshi-db --file=worker/src/db/schema.sql
```

- [ ] **Step 5: Commit**

```bash
git add worker/src/db/schema.sql worker/src/types.ts frontend/src/types.ts wrangler.toml
git commit -m "feat: add D1 schema and shared TypeScript types"
```

---

## Task 3a: Menu API Routes

**Files:**
- Create: `worker/src/routes/menu.ts`
- Create: `worker/tests/menu.test.ts`
- Modify: `worker/src/index.ts` (mount route)

**Depends on:** Task 2 | **Parallel with:** Tasks 3b, 3c, 4, 5a

- [ ] **Step 1: Write failing tests**

`worker/tests/menu.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { menuRoutes } from '../src/routes/menu'
import type { Bindings } from '../src/types'

function makeApp(db: D1Database) {
  const app = new Hono<{ Bindings: Bindings }>()
  app.route('/api', menuRoutes)
  return app
}

const mockItems = [
  { id: 'item-1', name: 'ข้าวมันไก่', description: null, price: 5000, image_key: null, is_available: 1, created_at: '2026-01-01T00:00:00Z' },
]

function makeDb(items = mockItems) {
  return {
    prepare: (sql: string) => ({
      all: async () => ({ results: items }),
      run: async () => ({ success: true }),
      first: async <T>() => items[0] as T,
      bind: (..._args: unknown[]) => ({
        all: async () => ({ results: items }),
        run: async () => ({ success: true }),
        first: async <T>() => items[0] as T,
      }),
    }),
  } as unknown as D1Database
}

describe('GET /api/menu', () => {
  it('returns available menu items', async () => {
    const app = makeApp(makeDb())
    const res = await app.request('/api/menu')
    expect(res.status).toBe(200)
    const data = await res.json() as { items: unknown[] }
    expect(data.items).toHaveLength(1)
  })
})

describe('POST /api/merchant/menu', () => {
  it('rejects unauthenticated requests', async () => {
    const app = makeApp(makeDb())
    const res = await app.request('/api/merchant/menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', price: 5000 }),
    })
    expect(res.status).toBe(401)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd worker && npx vitest run tests/menu.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Implement menu routes**

`worker/src/routes/menu.ts`:
```typescript
import { Hono } from 'hono'
import { getCookie } from 'hono/cookie'
import type { Bindings, MenuItem } from '../types'

export const menuRoutes = new Hono<{ Bindings: Bindings }>()

menuRoutes.get('/menu', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM menu_items ORDER BY created_at ASC'
  ).all<MenuItem>()

  const items = results.map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    price: item.price,
    imageKey: item.image_key,
    isAvailable: item.is_available === 1,
  }))

  return c.json({ items })
})

function requireMerchant(c: Parameters<Parameters<typeof menuRoutes.use>[0]>[0]) {
  const token = getCookie(c, 'merchant_token')
  if (!token || token !== c.env.MERCHANT_SECRET) {
    return false
  }
  return true
}

menuRoutes.post('/merchant/menu', async (c) => {
  if (!requireMerchant(c)) return c.json({ error: 'Unauthorized' }, 401)

  const body = await c.req.json<{
    name: string
    description?: string
    price: number
    imageKey?: string
  }>()

  if (!body.name || typeof body.price !== 'number') {
    return c.json({ error: 'name and price are required' }, 400)
  }

  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  await c.env.DB.prepare(
    'INSERT INTO menu_items (id, name, description, price, image_key, is_available, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)'
  ).bind(id, body.name, body.description ?? null, body.price, body.imageKey ?? null, now).run()

  return c.json({ id }, 201)
})

menuRoutes.patch('/merchant/menu/:id', async (c) => {
  if (!requireMerchant(c)) return c.json({ error: 'Unauthorized' }, 401)

  const itemId = c.req.param('id')
  const body = await c.req.json<Partial<{
    name: string
    description: string
    price: number
    imageKey: string
    isAvailable: boolean
  }>>()

  const existing = await c.env.DB.prepare('SELECT id FROM menu_items WHERE id = ?')
    .bind(itemId).first<{ id: string }>()
  if (!existing) return c.json({ error: 'Not found' }, 404)

  const fields: string[] = []
  const values: unknown[] = []

  if (body.name !== undefined) { fields.push('name = ?'); values.push(body.name) }
  if (body.description !== undefined) { fields.push('description = ?'); values.push(body.description) }
  if (body.price !== undefined) { fields.push('price = ?'); values.push(body.price) }
  if (body.imageKey !== undefined) { fields.push('image_key = ?'); values.push(body.imageKey) }
  if (body.isAvailable !== undefined) { fields.push('is_available = ?'); values.push(body.isAvailable ? 1 : 0) }

  if (fields.length === 0) return c.json({ error: 'No fields to update' }, 400)

  values.push(itemId)
  await c.env.DB.prepare(`UPDATE menu_items SET ${fields.join(', ')} WHERE id = ?`)
    .bind(...values).run()

  return c.json({ ok: true })
})

menuRoutes.delete('/merchant/menu/:id', async (c) => {
  if (!requireMerchant(c)) return c.json({ error: 'Unauthorized' }, 401)

  const itemId = c.req.param('id')
  await c.env.DB.prepare('UPDATE menu_items SET is_available = 0 WHERE id = ?')
    .bind(itemId).run()

  return c.json({ ok: true })
})
```

- [ ] **Step 4: Create worker entry point**

`worker/src/index.ts`:
```typescript
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Bindings } from './types'
import { menuRoutes } from './routes/menu'

const app = new Hono<{ Bindings: Bindings }>()

app.use('/api/*', cors({ origin: '*', credentials: true }))
app.route('/api', menuRoutes)

app.get('*', (c) => c.env.ASSETS.fetch(c.req.raw))

export default app
```

- [ ] **Step 5: Run tests — expect pass**

```bash
cd worker && npx vitest run tests/menu.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add worker/src/routes/menu.ts worker/src/index.ts worker/tests/menu.test.ts
git commit -m "feat: add menu API routes with merchant CRUD"
```

---

## Task 3b: Order API Routes

**Files:**
- Create: `worker/src/routes/orders.ts`
- Create: `worker/tests/orders.test.ts`
- Modify: `worker/src/index.ts`

**Depends on:** Task 2 | **Parallel with:** Tasks 3a, 3c, 4, 5a

- [ ] **Step 1: Write failing tests**

`worker/tests/orders.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { orderRoutes } from '../src/routes/orders'
import type { Bindings } from '../src/types'

function makeDb(overrides: Partial<ReturnType<typeof buildDb>> = {}) {
  return buildDb(overrides) as unknown as D1Database
}

function buildDb(overrides: Record<string, unknown> = {}) {
  const counter = { value: 5 }
  const order = {
    id: 'ord-1', order_number: 'ORD-0001', customer_name: 'สมชาย', phone_number: '0812345678',
    status: 'pending', total_amount: 5000, evidence_key: null,
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
  }
  const items = [{ id: 'oi-1', order_id: 'ord-1', menu_item_id: 'mi-1', name: 'ข้าวมันไก่', price: 5000, quantity: 1 }]

  return {
    prepare: (sql: string) => {
      const s = sql.trim().toUpperCase()
      return {
        bind: (..._: unknown[]) => ({
          run: async () => ({ success: true }),
          first: async <T>() => {
            if (s.startsWith('SELECT') && s.includes('COUNTERS')) return counter as T
            if (s.startsWith('SELECT') && s.includes('ORDER_ITEMS')) return null as T
            if (s.startsWith('SELECT') && s.includes('ORDERS')) return order as T
            return null as T
          },
          all: async <T>() => ({ results: (s.includes('ORDER_ITEMS') ? items : [order]) as T[] }),
        }),
        run: async () => ({ success: true }),
        all: async <T>() => ({ results: [] as T[] }),
        first: async <T>() => counter as T,
      }
    },
    batch: async (stmts: D1PreparedStatement[]) => stmts.map(() => ({ results: [counter] })),
    ...overrides,
  }
}

function makeApp(db: D1Database) {
  const app = new Hono<{ Bindings: Bindings }>()
  app.route('/api', orderRoutes)
  return app
}

describe('POST /api/orders', () => {
  it('creates an order with valid payload', async () => {
    const app = makeApp(makeDb())
    const res = await app.request('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'สมชาย',
        phoneNumber: '0812345678',
        items: [{ menuItemId: 'mi-1', name: 'ข้าวมันไก่', price: 5000, quantity: 1 }],
      }),
    })
    expect(res.status).toBe(201)
    const data = await res.json() as { orderId: string; orderNumber: string }
    expect(data.orderId).toBeDefined()
    expect(data.orderNumber).toMatch(/^ORD-/)
  })

  it('rejects invalid Thai phone number', async () => {
    const app = makeApp(makeDb())
    const res = await app.request('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Test',
        phoneNumber: '123',
        items: [{ menuItemId: 'mi-1', name: 'X', price: 5000, quantity: 1 }],
      }),
    })
    expect(res.status).toBe(400)
  })
})

describe('GET /api/orders', () => {
  it('returns orders for a phone number', async () => {
    const app = makeApp(makeDb())
    const res = await app.request('/api/orders?phone=0812345678')
    expect(res.status).toBe(200)
    const data = await res.json() as { orders: unknown[] }
    expect(Array.isArray(data.orders)).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd worker && npx vitest run tests/orders.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement order routes**

`worker/src/routes/orders.ts`:
```typescript
import { Hono } from 'hono'
import type { Bindings, Order, OrderItem } from '../types'

export const orderRoutes = new Hono<{ Bindings: Bindings }>()

const PHONE_RE = /^0\d{9}$/

orderRoutes.post('/orders', async (c) => {
  const body = await c.req.json<{
    customerName: string
    phoneNumber: string
    items: { menuItemId: string; name: string; price: number; quantity: number }[]
  }>()

  if (!body.customerName?.trim()) return c.json({ error: 'customerName required' }, 400)
  if (!PHONE_RE.test(body.phoneNumber ?? '')) return c.json({ error: 'Invalid Thai phone number' }, 400)
  if (!Array.isArray(body.items) || body.items.length === 0) return c.json({ error: 'items required' }, 400)

  const totalAmount = body.items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const now = new Date().toISOString()
  const orderId = crypto.randomUUID()

  const [counterResult] = await c.env.DB.batch([
    c.env.DB.prepare('UPDATE counters SET value = value + 1 WHERE key = ?').bind('order_number'),
    c.env.DB.prepare('SELECT value FROM counters WHERE key = ?').bind('order_number'),
  ])
  const counter = (counterResult as unknown as { results: { value: number }[] }).results?.[0] ?? { value: 1 }
  const orderNumber = `ORD-${String(counter.value).padStart(4, '0')}`

  await c.env.DB.prepare(
    'INSERT INTO orders (id, order_number, customer_name, phone_number, status, total_amount, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(orderId, orderNumber, body.customerName.trim(), body.phoneNumber, 'pending', totalAmount, now, now).run()

  const itemInserts = body.items.map((item) =>
    c.env.DB.prepare(
      'INSERT INTO order_items (id, order_id, menu_item_id, name, price, quantity) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(crypto.randomUUID(), orderId, item.menuItemId, item.name, item.price, item.quantity)
  )
  await c.env.DB.batch(itemInserts)

  return c.json({ orderId, orderNumber }, 201)
})

orderRoutes.get('/orders', async (c) => {
  const phone = c.req.query('phone')
  if (!phone || !PHONE_RE.test(phone)) return c.json({ error: 'Valid phone required' }, 400)

  const { results } = await c.env.DB.prepare(
    'SELECT * FROM orders WHERE phone_number = ? ORDER BY created_at DESC'
  ).bind(phone).all<Order>()

  const orders = await Promise.all(results.map(async (order) => {
    const { results: items } = await c.env.DB.prepare(
      'SELECT * FROM order_items WHERE order_id = ?'
    ).bind(order.id).all<OrderItem>()

    return {
      id: order.id,
      orderNumber: order.order_number,
      customerName: order.customer_name,
      status: order.status,
      totalAmount: order.total_amount,
      items: items.map((i) => ({ id: i.id, menuItemId: i.menu_item_id, name: i.name, price: i.price, quantity: i.quantity })),
      hasEvidence: !!order.evidence_key,
      createdAt: order.created_at,
    }
  }))

  return c.json({ orders })
})

orderRoutes.get('/orders/:id', async (c) => {
  const orderId = c.req.param('id')
  const order = await c.env.DB.prepare('SELECT * FROM orders WHERE id = ?')
    .bind(orderId).first<Order>()
  if (!order) return c.json({ error: 'Not found' }, 404)

  const { results: items } = await c.env.DB.prepare(
    'SELECT * FROM order_items WHERE order_id = ?'
  ).bind(orderId).all<OrderItem>()

  return c.json({
    id: order.id,
    orderNumber: order.order_number,
    customerName: order.customer_name,
    phoneNumber: order.phone_number,
    status: order.status,
    totalAmount: order.total_amount,
    items: items.map((i) => ({ id: i.id, menuItemId: i.menu_item_id, name: i.name, price: i.price, quantity: i.quantity })),
    hasEvidence: !!order.evidence_key,
    createdAt: order.created_at,
  })
})
```

- [ ] **Step 4: Mount order routes in index.ts**

Edit `worker/src/index.ts` — add after menuRoutes mount:
```typescript
import { orderRoutes } from './routes/orders'
// ...
app.route('/api', orderRoutes)
```

- [ ] **Step 5: Run tests — expect pass**

```bash
cd worker && npx vitest run tests/orders.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add worker/src/routes/orders.ts worker/src/index.ts worker/tests/orders.test.ts
git commit -m "feat: add order creation and lookup API routes"
```

---

## Task 3c: Merchant Auth + Order Status API

**Files:**
- Create: `worker/src/middleware/auth.ts`
- Create: `worker/src/routes/merchant.ts`
- Create: `worker/tests/merchant.test.ts`
- Modify: `worker/src/index.ts`

**Depends on:** Task 2 | **Parallel with:** Tasks 3a, 3b, 4, 5a

- [ ] **Step 1: Write failing tests**

`worker/tests/merchant.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { merchantRoutes } from '../src/routes/merchant'
import type { Bindings } from '../src/types'

const SECRET = 'test-secret-123'

function makeApp() {
  const app = new Hono<{ Bindings: Bindings }>()
  app.route('/api', merchantRoutes)
  return app
}

function makeEnv(db: D1Database) {
  return { DB: db, MERCHANT_SECRET: SECRET, R2: {} as R2Bucket, ASSETS: {} as Fetcher }
}

const mockOrder = {
  id: 'ord-1', order_number: 'ORD-0001', customer_name: 'สมชาย', phone_number: '0812345678',
  status: 'pending', total_amount: 5000, evidence_key: null,
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
}

function makeDb() {
  return {
    prepare: (_sql: string) => ({
      bind: (..._: unknown[]) => ({
        run: async () => ({ success: true }),
        first: async <T>() => mockOrder as T,
        all: async <T>() => ({ results: [mockOrder] as T[] }),
      }),
      first: async <T>() => mockOrder as T,
      all: async <T>() => ({ results: [mockOrder] as T[] }),
    }),
  } as unknown as D1Database
}

describe('POST /api/merchant/login', () => {
  it('sets cookie on correct secret', async () => {
    const app = makeApp()
    const res = await app.request('/api/merchant/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-merchant-secret': SECRET,
      },
      body: JSON.stringify({ secret: SECRET }),
    }, makeEnv(makeDb()) as unknown as Record<string, string>)
    expect(res.status).toBe(200)
  })

  it('rejects wrong secret', async () => {
    const app = makeApp()
    const res = await app.request('/api/merchant/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: 'wrong' }),
    }, makeEnv(makeDb()) as unknown as Record<string, string>)
    expect(res.status).toBe(401)
  })
})

describe('PATCH /api/merchant/orders/:id/status', () => {
  it('rejects unauthenticated', async () => {
    const app = makeApp()
    const res = await app.request('/api/merchant/orders/ord-1/status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'preparing' }),
    }, makeEnv(makeDb()) as unknown as Record<string, string>)
    expect(res.status).toBe(401)
  })
})
```

- [ ] **Step 2: Run tests — confirm fail**

```bash
cd worker && npx vitest run tests/merchant.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement auth middleware**

`worker/src/middleware/auth.ts`:
```typescript
import { getCookie } from 'hono/cookie'
import type { Context, Next } from 'hono'
import type { Bindings } from '../types'

export async function merchantAuth(c: Context<{ Bindings: Bindings }>, next: Next) {
  const token = getCookie(c, 'merchant_token')
  if (!token || token !== c.env.MERCHANT_SECRET) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  return next()
}
```

- [ ] **Step 4: Implement merchant routes**

`worker/src/routes/merchant.ts`:
```typescript
import { Hono } from 'hono'
import { setCookie, deleteCookie } from 'hono/cookie'
import { merchantAuth } from '../middleware/auth'
import type { Bindings, Order, OrderItem } from '../types'

export const merchantRoutes = new Hono<{ Bindings: Bindings }>()

merchantRoutes.post('/merchant/login', async (c) => {
  const body = await c.req.json<{ secret: string }>()
  if (body.secret !== c.env.MERCHANT_SECRET) {
    return c.json({ error: 'Invalid secret' }, 401)
  }

  setCookie(c, 'merchant_token', c.env.MERCHANT_SECRET, {
    httpOnly: true,
    secure: true,
    sameSite: 'Strict',
    path: '/',
  })
  setCookie(c, 'merchant_logged_in', '1', {
    httpOnly: false,
    secure: true,
    sameSite: 'Strict',
    path: '/',
  })

  return c.json({ ok: true })
})

merchantRoutes.post('/merchant/logout', (c) => {
  deleteCookie(c, 'merchant_token', { path: '/' })
  deleteCookie(c, 'merchant_logged_in', { path: '/' })
  return c.json({ ok: true })
})

merchantRoutes.get('/merchant/orders', merchantAuth, async (c) => {
  const status = c.req.query('status')
  const sql = status
    ? 'SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC'
    : 'SELECT * FROM orders ORDER BY created_at DESC'
  const stmt = status
    ? c.env.DB.prepare(sql).bind(status)
    : c.env.DB.prepare(sql)

  const { results } = await stmt.all<Order>()

  const orders = await Promise.all(results.map(async (order) => {
    const { results: items } = await c.env.DB.prepare(
      'SELECT * FROM order_items WHERE order_id = ?'
    ).bind(order.id).all<OrderItem>()

    return {
      id: order.id,
      orderNumber: order.order_number,
      customerName: order.customer_name,
      phoneNumber: order.phone_number,
      status: order.status,
      totalAmount: order.total_amount,
      hasEvidence: !!order.evidence_key,
      items: items.map((i) => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity })),
      createdAt: order.created_at,
      updatedAt: order.updated_at,
    }
  }))

  return c.json({ orders })
})

merchantRoutes.get('/merchant/orders/:id', merchantAuth, async (c) => {
  const orderId = c.req.param('id')
  const order = await c.env.DB.prepare('SELECT * FROM orders WHERE id = ?')
    .bind(orderId).first<Order>()
  if (!order) return c.json({ error: 'Not found' }, 404)

  const { results: items } = await c.env.DB.prepare(
    'SELECT * FROM order_items WHERE order_id = ?'
  ).bind(orderId).all<OrderItem>()

  return c.json({
    id: order.id,
    orderNumber: order.order_number,
    customerName: order.customer_name,
    phoneNumber: order.phone_number,
    status: order.status,
    totalAmount: order.total_amount,
    evidenceKey: order.evidence_key,
    hasEvidence: !!order.evidence_key,
    items: items.map((i) => ({ id: i.id, menuItemId: i.menu_item_id, name: i.name, price: i.price, quantity: i.quantity })),
    createdAt: order.created_at,
    updatedAt: order.updated_at,
  })
})

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['done', 'cancelled'],
  done: [],
  cancelled: [],
}

merchantRoutes.patch('/merchant/orders/:id/status', merchantAuth, async (c) => {
  const orderId = c.req.param('id')
  const body = await c.req.json<{ status: string; cancelReason?: string }>()

  const order = await c.env.DB.prepare('SELECT status FROM orders WHERE id = ?')
    .bind(orderId).first<{ status: string }>()
  if (!order) return c.json({ error: 'Not found' }, 404)

  const allowed = VALID_TRANSITIONS[order.status] ?? []
  if (!allowed.includes(body.status)) {
    return c.json({ error: `Cannot transition from ${order.status} to ${body.status}` }, 422)
  }

  const now = new Date().toISOString()
  await c.env.DB.prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?')
    .bind(body.status, now, orderId).run()

  return c.json({ ok: true, status: body.status })
})
```

- [ ] **Step 5: Mount merchant routes in index.ts**

Edit `worker/src/index.ts`:
```typescript
import { merchantRoutes } from './routes/merchant'
// ...
app.route('/api', merchantRoutes)
```

- [ ] **Step 6: Run tests — expect pass**

```bash
cd worker && npx vitest run tests/merchant.test.ts
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add worker/src/middleware/auth.ts worker/src/routes/merchant.ts worker/src/index.ts worker/tests/merchant.test.ts
git commit -m "feat: add merchant auth, login/logout, and order status transitions"
```

---

## Task 4: R2 File Storage Routes

**Files:**
- Create: `worker/src/routes/files.ts`
- Modify: `worker/src/index.ts`

**Depends on:** Task 2 | **Parallel with:** Tasks 3a, 3b, 3c, 5a

- [ ] **Step 1: Implement file routes**

`worker/src/routes/files.ts`:
```typescript
import { Hono } from 'hono'
import { merchantAuth } from '../middleware/auth'
import type { Bindings } from '../types'

export const fileRoutes = new Hono<{ Bindings: Bindings }>()

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf']
const MAX_SIZE = 5 * 1024 * 1024

fileRoutes.put('/orders/:id/evidence', async (c) => {
  const orderId = c.req.param('id')

  const order = await c.env.DB.prepare('SELECT id, evidence_key FROM orders WHERE id = ?')
    .bind(orderId).first<{ id: string; evidence_key: string | null }>()
  if (!order) return c.json({ error: 'Order not found' }, 404)

  const contentType = c.req.header('content-type') ?? ''
  const baseType = contentType.split(';')[0].trim()
  if (!ALLOWED_TYPES.includes(baseType)) {
    return c.json({ error: 'File type not allowed. Use JPEG, PNG, or PDF.' }, 400)
  }

  const buffer = await c.req.arrayBuffer()
  if (buffer.byteLength > MAX_SIZE) {
    return c.json({ error: 'File exceeds 5 MB limit' }, 400)
  }

  const key = `evidence/${orderId}`

  if (order.evidence_key) {
    await c.env.R2.delete(order.evidence_key)
  }

  await c.env.R2.put(key, buffer, { httpMetadata: { contentType: baseType } })

  const now = new Date().toISOString()
  await c.env.DB.prepare('UPDATE orders SET evidence_key = ?, updated_at = ? WHERE id = ?')
    .bind(key, now, orderId).run()

  return c.json({ ok: true })
})

fileRoutes.get('/merchant/orders/:id/evidence', merchantAuth, async (c) => {
  const orderId = c.req.param('id')
  const order = await c.env.DB.prepare('SELECT evidence_key FROM orders WHERE id = ?')
    .bind(orderId).first<{ evidence_key: string | null }>()

  if (!order?.evidence_key) return c.json({ error: 'No evidence uploaded' }, 404)

  const object = await c.env.R2.get(order.evidence_key)
  if (!object) return c.json({ error: 'File not found' }, 404)

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('cache-control', 'no-cache')

  return new Response(object.body, { headers })
})

fileRoutes.put('/merchant/menu/:id/image', merchantAuth, async (c) => {
  const itemId = c.req.param('id')

  const item = await c.env.DB.prepare('SELECT id, image_key FROM menu_items WHERE id = ?')
    .bind(itemId).first<{ id: string; image_key: string | null }>()
  if (!item) return c.json({ error: 'Item not found' }, 404)

  const contentType = c.req.header('content-type') ?? ''
  const baseType = contentType.split(';')[0].trim()
  if (!['image/jpeg', 'image/png'].includes(baseType)) {
    return c.json({ error: 'Only JPEG and PNG allowed for menu images' }, 400)
  }

  const buffer = await c.req.arrayBuffer()
  if (buffer.byteLength > MAX_SIZE) {
    return c.json({ error: 'File exceeds 5 MB limit' }, 400)
  }

  const key = `menu/${itemId}`
  if (item.image_key) await c.env.R2.delete(item.image_key)

  await c.env.R2.put(key, buffer, { httpMetadata: { contentType: baseType } })
  await c.env.DB.prepare('UPDATE menu_items SET image_key = ? WHERE id = ?')
    .bind(key, itemId).run()

  return c.json({ imageKey: key })
})

fileRoutes.get('/menu/:id/image', async (c) => {
  const itemId = c.req.param('id')
  const item = await c.env.DB.prepare('SELECT image_key FROM menu_items WHERE id = ?')
    .bind(itemId).first<{ image_key: string | null }>()

  if (!item?.image_key) return c.json({ error: 'No image' }, 404)

  const object = await c.env.R2.get(item.image_key)
  if (!object) return c.json({ error: 'Image not found' }, 404)

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('cache-control', 'public, max-age=3600')

  return new Response(object.body, { headers })
})
```

- [ ] **Step 2: Mount file routes in index.ts**

Edit `worker/src/index.ts`:
```typescript
import { fileRoutes } from './routes/files'
// ...
app.route('/api', fileRoutes)
```

- [ ] **Step 3: Test file routes manually**

```bash
wrangler dev --local
# In another terminal:
curl -X PUT http://localhost:8787/api/orders/NONEXISTENT/evidence -H "content-type: image/jpeg" --data-binary @/dev/null
# Expected: {"error":"Order not found"}
```

- [ ] **Step 4: Commit**

```bash
git add worker/src/routes/files.ts worker/src/index.ts
git commit -m "feat: add R2 file upload routes for evidence and menu images"
```

---

## Task 5a: Frontend Base — Layout, Routing, Cart, API Client

**Files:**
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/lib/api.ts`
- Create: `frontend/src/lib/cart.ts`
- Create: `frontend/src/context/CartContext.tsx`
- Create: `frontend/src/components/OrderStatusBadge.tsx`
- Create: `frontend/src/components/ProtectedRoute.tsx`

**Depends on:** Task 1 | **Parallel with:** Tasks 3a–4

- [ ] **Step 1: Write cart lib test**

`frontend/src/lib/cart.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { getCart, addToCart, updateQuantity, removeFromCart, clearCart } from './cart'
import type { CartItem } from '../types'

const item: CartItem = { id: 'i1', name: 'ข้าวมันไก่', price: 5000, quantity: 1, imageKey: null }

beforeEach(() => clearCart())

describe('cart', () => {
  it('starts empty', () => expect(getCart()).toHaveLength(0))

  it('adds item', () => {
    addToCart(item)
    expect(getCart()).toHaveLength(1)
    expect(getCart()[0].quantity).toBe(1)
  })

  it('merges duplicate', () => {
    addToCart(item)
    addToCart(item)
    expect(getCart()).toHaveLength(1)
    expect(getCart()[0].quantity).toBe(2)
  })

  it('updates quantity', () => {
    addToCart(item)
    updateQuantity('i1', 5)
    expect(getCart()[0].quantity).toBe(5)
  })

  it('removes item', () => {
    addToCart(item)
    removeFromCart('i1')
    expect(getCart()).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run test — confirm fail**

```bash
cd frontend && npx vitest run src/lib/cart.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement cart lib**

`frontend/src/lib/cart.ts`:
```typescript
import type { CartItem } from '../types'

const KEY = 'oshi_cart'

export function getCart(): CartItem[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as CartItem[]
  } catch {
    return []
  }
}

function saveCart(items: CartItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items))
}

export function addToCart(item: CartItem) {
  const cart = getCart()
  const existing = cart.find((i) => i.id === item.id)
  if (existing) {
    existing.quantity += item.quantity
  } else {
    cart.push({ ...item })
  }
  saveCart(cart)
}

export function updateQuantity(id: string, quantity: number) {
  const cart = getCart()
  const item = cart.find((i) => i.id === id)
  if (item) item.quantity = quantity
  saveCart(cart)
}

export function removeFromCart(id: string) {
  saveCart(getCart().filter((i) => i.id !== id))
}

export function clearCart() {
  localStorage.removeItem(KEY)
}
```

- [ ] **Step 4: Run cart test — expect pass**

```bash
cd frontend && npx vitest run src/lib/cart.test.ts
```

Expected: PASS

- [ ] **Step 5: Implement API client**

`frontend/src/lib/api.ts`:
```typescript
import type { MenuItem, Order } from '../types'

const BASE = '/api'

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText })) as { error: string }
    throw new Error(err.error)
  }
  return res.json() as Promise<T>
}

export const api = {
  menu: {
    list: () => req<{ items: MenuItem[] }>('/menu'),
    create: (data: Omit<MenuItem, 'id' | 'isAvailable'>) =>
      req<{ id: string }>('/merchant/menu', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<MenuItem>) =>
      req<{ ok: boolean }>(`/merchant/menu/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) =>
      req<{ ok: boolean }>(`/merchant/menu/${id}`, { method: 'DELETE' }),
    uploadImage: (id: string, file: File) => {
      return fetch(`${BASE}/merchant/menu/${id}/image`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': file.type },
        body: file,
      }).then((r) => r.json() as Promise<{ imageKey: string }>)
    },
  },
  orders: {
    create: (data: { customerName: string; phoneNumber: string; items: { menuItemId: string; name: string; price: number; quantity: number }[] }) =>
      req<{ orderId: string; orderNumber: string }>('/orders', { method: 'POST', body: JSON.stringify(data) }),
    getById: (id: string) => req<Order>(`/orders/${id}`),
    getByPhone: (phone: string) => req<{ orders: Order[] }>(`/orders?phone=${encodeURIComponent(phone)}`),
    uploadEvidence: (orderId: string, file: File) =>
      fetch(`${BASE}/orders/${orderId}/evidence`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': file.type },
        body: file,
      }).then((r) => r.json() as Promise<{ ok: boolean }>),
  },
  merchant: {
    login: (secret: string) =>
      req<{ ok: boolean }>('/merchant/login', { method: 'POST', body: JSON.stringify({ secret }) }),
    logout: () =>
      req<{ ok: boolean }>('/merchant/logout', { method: 'POST' }),
    orders: {
      list: (status?: string) =>
        req<{ orders: Order[] }>(`/merchant/orders${status ? `?status=${status}` : ''}`),
      getById: (id: string) =>
        req<Order & { phoneNumber: string; evidenceKey: string | null }>(`/merchant/orders/${id}`),
      updateStatus: (id: string, status: string) =>
        req<{ ok: boolean; status: string }>(`/merchant/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    },
  },
}
```

- [ ] **Step 6: Implement CartContext**

`frontend/src/context/CartContext.tsx`:
```typescript
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { getCart, addToCart, updateQuantity, removeFromCart, clearCart } from '../lib/cart'
import type { CartItem } from '../types'

type CartContextType = {
  items: CartItem[]
  add: (item: CartItem) => void
  update: (id: string, quantity: number) => void
  remove: (id: string) => void
  clear: () => void
  total: number
}

const CartContext = createContext<CartContextType | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(getCart)

  const sync = useCallback(() => setItems(getCart()), [])

  const add = useCallback((item: CartItem) => { addToCart(item); sync() }, [sync])
  const update = useCallback((id: string, qty: number) => { updateQuantity(id, qty); sync() }, [sync])
  const remove = useCallback((id: string) => { removeFromCart(id); sync() }, [sync])
  const clear = useCallback(() => { clearCart(); sync() }, [sync])
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0)

  return (
    <CartContext.Provider value={{ items, add, update, remove, clear, total }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be inside CartProvider')
  return ctx
}
```

- [ ] **Step 7: Implement shared components**

`frontend/src/components/OrderStatusBadge.tsx`:
```typescript
const COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  preparing: 'bg-blue-100 text-blue-800',
  ready: 'bg-green-100 text-green-800',
  done: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
}

const LABELS: Record<string, string> = {
  pending: 'รอชำระ',
  preparing: 'กำลังเตรียม',
  ready: 'พร้อมรับ',
  done: 'เสร็จสิ้น',
  cancelled: 'ยกเลิก',
}

export function OrderStatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${COLORS[status] ?? 'bg-gray-100'}`}>
      {LABELS[status] ?? status}
    </span>
  )
}
```

`frontend/src/components/ProtectedRoute.tsx`:
```typescript
import { type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const isLoggedIn = document.cookie.includes('merchant_logged_in=1')
  return isLoggedIn ? <>{children}</> : <Navigate to="/merchant" replace />
}
```

- [ ] **Step 8: Implement App.tsx and main.tsx**

`frontend/src/main.tsx`:
```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { CartProvider } from './context/CartContext'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <CartProvider>
        <App />
      </CartProvider>
    </BrowserRouter>
  </StrictMode>
)
```

`frontend/src/App.tsx`:
```typescript
import { Routes, Route } from 'react-router-dom'
import { LandingPage } from './pages/LandingPage'
import { CheckoutPage } from './pages/CheckoutPage'
import { PaymentPage } from './pages/PaymentPage'
import { OrderLookupPage } from './pages/OrderLookupPage'
import { MerchantLoginPage } from './pages/MerchantLoginPage'
import { MerchantOrdersPage } from './pages/MerchantOrdersPage'
import { MerchantOrderDetailPage } from './pages/MerchantOrderDetailPage'
import { MerchantMenuPage } from './pages/MerchantMenuPage'
import { ProtectedRoute } from './components/ProtectedRoute'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/payment/:id" element={<PaymentPage />} />
      <Route path="/orders" element={<OrderLookupPage />} />
      <Route path="/merchant" element={<MerchantLoginPage />} />
      <Route path="/merchant/orders" element={<ProtectedRoute><MerchantOrdersPage /></ProtectedRoute>} />
      <Route path="/merchant/orders/:id" element={<ProtectedRoute><MerchantOrderDetailPage /></ProtectedRoute>} />
      <Route path="/merchant/menu" element={<ProtectedRoute><MerchantMenuPage /></ProtectedRoute>} />
    </Routes>
  )
}
```

Create `frontend/src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 9: Run cart test one more time to confirm clean**

```bash
cd frontend && npx vitest run src/lib/cart.test.ts
```

Expected: PASS

- [ ] **Step 10: Commit**

```bash
git add frontend/src/
git commit -m "feat: add frontend base — routing, cart, API client, shared components"
```

---

## Task 5b: Customer-Facing Pages

**Files:**
- Create: `frontend/src/components/MenuItemCard.tsx`
- Create: `frontend/src/components/CartDrawer.tsx`
- Create: `frontend/src/pages/LandingPage.tsx`
- Create: `frontend/src/pages/CheckoutPage.tsx`
- Create: `frontend/src/pages/PaymentPage.tsx`
- Create: `frontend/src/pages/OrderLookupPage.tsx`

**Depends on:** Task 5a (and Task 3a+3b for API contract, but stubs are sufficient)

- [ ] **Step 1: Implement MenuItemCard**

`frontend/src/components/MenuItemCard.tsx`:
```typescript
import { useCart } from '../context/CartContext'
import type { MenuItem } from '../types'

function formatTHB(satang: number) {
  return `฿${(satang / 100).toFixed(2)}`
}

export function MenuItemCard({ item }: { item: MenuItem }) {
  const { add } = useCart()
  return (
    <div className={`rounded-xl border bg-white shadow-sm overflow-hidden flex flex-col ${!item.isAvailable ? 'opacity-50' : ''}`}>
      {item.imageKey ? (
        <img src={`/api/menu/${item.id}/image`} alt={item.name} className="h-40 w-full object-cover" />
      ) : (
        <div className="h-40 w-full bg-gray-100 flex items-center justify-center text-gray-400 text-sm">ไม่มีรูป</div>
      )}
      <div className="p-3 flex flex-col gap-1 flex-1">
        <p className="font-semibold text-gray-900">{item.name}</p>
        {item.description && <p className="text-xs text-gray-500">{item.description}</p>}
        <p className="text-orange-600 font-bold mt-auto">{formatTHB(item.price)}</p>
        {item.isAvailable ? (
          <button
            onClick={() => add({ id: item.id, name: item.name, price: item.price, quantity: 1, imageKey: item.imageKey })}
            className="mt-2 w-full bg-orange-500 hover:bg-orange-600 text-white rounded-lg py-1.5 text-sm font-medium"
          >
            เพิ่มลงตะกร้า
          </button>
        ) : (
          <p className="mt-2 text-center text-sm text-gray-400">หมดชั่วคราว</p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Implement CartDrawer**

`frontend/src/components/CartDrawer.tsx`:
```typescript
import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'

function formatTHB(satang: number) { return `฿${(satang / 100).toFixed(2)}` }

export function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { items, update, remove, total } = useCart()
  const navigate = useNavigate()

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />}
      <div className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-xl transition-transform duration-300 ${open ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="p-4 max-h-[80vh] flex flex-col">
          <h2 className="text-lg font-bold mb-3">ตะกร้าของคุณ</h2>
          {items.length === 0 ? (
            <p className="text-gray-400 text-center py-8">ตะกร้าว่างเปล่า</p>
          ) : (
            <div className="overflow-y-auto flex-1 divide-y">
              {items.map((item) => (
                <div key={item.id} className="py-2 flex items-center gap-3">
                  <span className="flex-1 text-sm">{item.name}</span>
                  <span className="text-xs text-gray-500">{formatTHB(item.price)}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => item.quantity > 1 ? update(item.id, item.quantity - 1) : remove(item.id)} className="w-6 h-6 rounded-full border text-sm flex items-center justify-center">−</button>
                    <span className="w-6 text-center text-sm">{item.quantity}</span>
                    <button onClick={() => update(item.id, item.quantity + 1)} className="w-6 h-6 rounded-full border text-sm flex items-center justify-center">+</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {items.length > 0 && (
            <div className="pt-3 border-t">
              <div className="flex justify-between font-semibold mb-3">
                <span>รวม</span>
                <span>{formatTHB(total)}</span>
              </div>
              <button
                onClick={() => { onClose(); navigate('/checkout') }}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-semibold"
              >
                ดำเนินการสั่งซื้อ
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 3: Implement LandingPage**

`frontend/src/pages/LandingPage.tsx`:
```typescript
import { useState, useEffect } from 'react'
import { MenuItemCard } from '../components/MenuItemCard'
import { CartDrawer } from '../components/CartDrawer'
import { useCart } from '../context/CartContext'
import { api } from '../lib/api'
import type { MenuItem } from '../types'

export function LandingPage() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { items: cartItems, total } = useCart()

  useEffect(() => {
    api.menu.list()
      .then((d) => setItems(d.items))
      .finally(() => setLoading(false))
  }, [])

  const cartCount = cartItems.reduce((s, i) => s + i.quantity, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-30 bg-white shadow-sm px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-orange-600">เมนูอาหาร</h1>
        {cartCount > 0 && (
          <button
            onClick={() => setDrawerOpen(true)}
            className="relative bg-orange-500 text-white px-4 py-1.5 rounded-full text-sm font-medium"
          >
            ตะกร้า ({cartCount}) · ฿{(total / 100).toFixed(0)}
          </button>
        )}
      </header>

      <main className="p-4 max-w-2xl mx-auto">
        {loading ? (
          <p className="text-center text-gray-400 py-12">กำลังโหลด...</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {items.map((item) => (
              <MenuItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </main>

      <CartDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  )
}
```

- [ ] **Step 4: Implement CheckoutPage**

`frontend/src/pages/CheckoutPage.tsx`:
```typescript
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { api } from '../lib/api'

const PHONE_RE = /^0\d{9}$/

function formatTHB(satang: number) { return `฿${(satang / 100).toFixed(2)}` }

export function CheckoutPage() {
  const { items, total, clear } = useCart()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (items.length === 0) {
    navigate('/')
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('กรุณาใส่ชื่อ'); return }
    if (!PHONE_RE.test(phone)) { setError('เบอร์โทรไม่ถูกต้อง (ตัวอย่าง: 0812345678)'); return }
    setError('')
    setLoading(true)

    try {
      const { orderId } = await api.orders.create({
        customerName: name.trim(),
        phoneNumber: phone,
        items: items.map((i) => ({ menuItemId: i.id, name: i.name, price: i.price, quantity: i.quantity })),
      })
      clear()
      navigate(`/payment/${orderId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">ยืนยันคำสั่งซื้อ</h1>

      <div className="bg-white rounded-xl p-4 mb-4 shadow-sm">
        <h2 className="font-semibold mb-2">รายการ</h2>
        {items.map((i) => (
          <div key={i.id} className="flex justify-between text-sm py-1">
            <span>{i.name} × {i.quantity}</span>
            <span>{formatTHB(i.price * i.quantity)}</span>
          </div>
        ))}
        <div className="flex justify-between font-bold border-t mt-2 pt-2">
          <span>รวม</span>
          <span>{formatTHB(total)}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl p-4 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">ชื่อ</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="ชื่อของคุณ" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">เบอร์โทรศัพท์</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="0812345678" maxLength={10} />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button type="submit" disabled={loading} className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white py-3 rounded-xl font-semibold">
          {loading ? 'กำลังสั่ง...' : 'สั่งซื้อ'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 5: Implement PaymentPage**

`frontend/src/pages/PaymentPage.tsx`:
```typescript
import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../lib/api'
import type { Order } from '../types'

const MAX_SIZE = 5 * 1024 * 1024
const ALLOWED = ['image/jpeg', 'image/png', 'application/pdf']

export function PaymentPage() {
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [uploaded, setUploaded] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (id) api.orders.getById(id).then(setOrder)
  }, [id])

  if (!order) return <div className="p-8 text-center text-gray-400">กำลังโหลด...</div>

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file) { setError('กรุณาเลือกไฟล์'); return }
    if (!ALLOWED.includes(file.type)) { setError('รองรับเฉพาะ JPEG, PNG, PDF'); return }
    if (file.size > MAX_SIZE) { setError('ไฟล์ใหญ่เกิน 5 MB'); return }

    setError('')
    setLoading(true)
    try {
      await api.orders.uploadEvidence(order!.id, file)
      setUploaded(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'อัปโหลดไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-2">ชำระเงิน</h1>
      <p className="text-gray-500 mb-6">หมายเลขออเดอร์: <span className="font-mono font-bold text-gray-900">{order.orderNumber}</span></p>

      <div className="bg-white rounded-xl p-4 shadow-sm mb-4 text-center">
        <p className="text-sm text-gray-500 mb-2">สแกน QR PromptPay</p>
        <img src="/promptpay-qr.png" alt="PromptPay QR" className="mx-auto w-48 h-48 object-contain" />
        <p className="mt-3 text-2xl font-bold text-orange-600">
          ฿{(order.totalAmount / 100).toFixed(2)}
        </p>
      </div>

      {uploaded ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="text-green-700 font-semibold">ส่งหลักฐานสำเร็จ ✓</p>
          <p className="text-sm text-green-600 mt-1">หมายเลขออเดอร์ของคุณ: {order.orderNumber}</p>
          <p className="text-xs text-gray-400 mt-2">แสดงเลขนี้เมื่อมารับที่ร้าน</p>
        </div>
      ) : (
        <form onSubmit={handleUpload} className="bg-white rounded-xl p-4 shadow-sm space-y-4">
          <p className="font-semibold text-sm">อัปโหลดหลักฐานการโอนเงิน</p>
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm"
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white py-3 rounded-xl font-semibold">
            {loading ? 'กำลังอัปโหลด...' : 'ส่งหลักฐาน'}
          </button>
        </form>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Implement OrderLookupPage**

`frontend/src/pages/OrderLookupPage.tsx`:
```typescript
import { useState } from 'react'
import { api } from '../lib/api'
import { OrderStatusBadge } from '../components/OrderStatusBadge'
import type { Order } from '../types'

const PHONE_RE = /^0\d{9}$/

export function OrderLookupPage() {
  const [phone, setPhone] = useState('')
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault()
    if (!PHONE_RE.test(phone)) { setError('เบอร์โทรไม่ถูกต้อง'); return }
    setError('')
    setLoading(true)
    try {
      const data = await api.orders.getByPhone(phone)
      setOrders(data.orders)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่พบข้อมูล')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">ตรวจสอบออเดอร์</h1>

      <form onSubmit={handleLookup} className="flex gap-2 mb-6">
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="0812345678"
          maxLength={10}
          className="flex-1 border rounded-lg px-3 py-2 text-sm"
        />
        <button type="submit" disabled={loading} className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
          ค้นหา
        </button>
      </form>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {orders !== null && (
        orders.length === 0 ? (
          <p className="text-gray-400 text-center py-8">ไม่พบออเดอร์</p>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono font-bold">{order.orderNumber}</span>
                  <OrderStatusBadge status={order.status} />
                </div>
                <div className="text-sm text-gray-600 space-y-0.5">
                  {order.items.map((i) => (
                    <p key={i.id}>{i.name} × {i.quantity}</p>
                  ))}
                </div>
                <p className="text-orange-600 font-bold mt-2">฿{(order.totalAmount / 100).toFixed(2)}</p>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/
git commit -m "feat: add customer-facing pages — landing, checkout, payment, order lookup"
```

---

## Task 5c: Merchant Panel Pages

**Files:**
- Create: `frontend/src/pages/MerchantLoginPage.tsx`
- Create: `frontend/src/pages/MerchantOrdersPage.tsx`
- Create: `frontend/src/pages/MerchantOrderDetailPage.tsx`
- Create: `frontend/src/pages/MerchantMenuPage.tsx`

**Depends on:** Task 5a | **Parallel with:** Task 5b

- [ ] **Step 1: Implement MerchantLoginPage**

`frontend/src/pages/MerchantLoginPage.tsx`:
```typescript
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

export function MerchantLoginPage() {
  const [secret, setSecret] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!secret.trim()) { setError('กรุณาใส่รหัส'); return }
    setError('')
    setLoading(true)
    try {
      await api.merchant.login(secret)
      navigate('/merchant/orders')
    } catch {
      setError('รหัสไม่ถูกต้อง')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center">Merchant Login</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Secret code"
            className="w-full border rounded-lg px-3 py-2"
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="w-full bg-gray-900 text-white py-2.5 rounded-lg font-semibold disabled:opacity-50">
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Implement MerchantOrdersPage**

`frontend/src/pages/MerchantOrdersPage.tsx`:
```typescript
import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { OrderStatusBadge } from '../components/OrderStatusBadge'
import type { Order } from '../types'

const STATUSES = ['', 'pending', 'preparing', 'ready', 'done', 'cancelled']
const STATUS_LABELS: Record<string, string> = {
  '': 'All', pending: 'Pending', preparing: 'Preparing', ready: 'Ready', done: 'Done', cancelled: 'Cancelled',
}

export function MerchantOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const load = useCallback(() => {
    api.merchant.orders.list(filter || undefined)
      .then((d) => setOrders(d.orders))
      .finally(() => setLoading(false))
  }, [filter])

  useEffect(() => { load() }, [load])

  // Poll every 10s for near-real-time updates
  useEffect(() => {
    const id = setInterval(load, 10_000)
    return () => clearInterval(id)
  }, [load])

  async function handleLogout() {
    await api.merchant.logout()
    navigate('/merchant')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold">Orders</h1>
        <div className="flex gap-2">
          <Link to="/merchant/menu" className="text-sm text-blue-600">Menu</Link>
          <button onClick={handleLogout} className="text-sm text-red-500">Logout</button>
        </div>
      </header>

      <div className="px-4 py-3 flex gap-2 overflow-x-auto">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${filter === s ? 'bg-gray-900 text-white' : 'bg-white border'}`}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="px-4 space-y-2 pb-8">
        {loading ? (
          <p className="text-center text-gray-400 py-8">Loading...</p>
        ) : orders.length === 0 ? (
          <p className="text-center text-gray-400 py-8">No orders</p>
        ) : (
          orders.map((order) => (
            <Link key={order.id} to={`/merchant/orders/${order.id}`} className="block bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold">{order.orderNumber}</span>
                <OrderStatusBadge status={order.status} />
              </div>
              <p className="text-sm text-gray-600 mt-1">{order.customerName}</p>
              <p className="text-orange-600 font-semibold text-sm">฿{(order.totalAmount / 100).toFixed(2)}</p>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Implement MerchantOrderDetailPage**

`frontend/src/pages/MerchantOrderDetailPage.tsx`:
```typescript
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { OrderStatusBadge } from '../components/OrderStatusBadge'
import type { Order } from '../types'

type DetailOrder = Order & { phoneNumber: string; evidenceKey: string | null }

const ACTIONS: Record<string, { label: string; next: string }[]> = {
  pending: [{ label: 'เริ่มเตรียม (Preparing)', next: 'preparing' }, { label: 'ยกเลิก', next: 'cancelled' }],
  preparing: [{ label: 'พร้อมรับแล้ว (Ready)', next: 'ready' }, { label: 'ยกเลิก', next: 'cancelled' }],
  ready: [{ label: 'รับแล้ว (Done)', next: 'done' }, { label: 'ยกเลิก', next: 'cancelled' }],
  done: [],
  cancelled: [],
}

export function MerchantOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<DetailOrder | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (id) api.merchant.orders.getById(id).then((d) => setOrder(d as DetailOrder))
  }, [id])

  async function handleAction(next: string) {
    if (!order) return
    setLoading(true)
    try {
      const res = await api.merchant.orders.updateStatus(order.id, next)
      setOrder((prev) => prev ? { ...prev, status: res.status as Order['status'] } : prev)
    } finally {
      setLoading(false)
    }
  }

  if (!order) return <div className="p-8 text-center text-gray-400">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 max-w-lg mx-auto">
      <button onClick={() => navigate('/merchant/orders')} className="text-sm text-blue-600 mb-4">← Back</button>

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold font-mono">{order.orderNumber}</h1>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm mb-3">
        <p className="font-medium">{order.customerName}</p>
        <p className="text-sm text-gray-500">{order.phoneNumber}</p>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm mb-3">
        <h2 className="font-semibold mb-2 text-sm">รายการ</h2>
        {order.items.map((i) => (
          <div key={i.id} className="flex justify-between text-sm py-0.5">
            <span>{i.name} × {i.quantity}</span>
            <span>฿{(i.price * i.quantity / 100).toFixed(2)}</span>
          </div>
        ))}
        <div className="flex justify-between font-bold border-t mt-2 pt-2">
          <span>รวม</span>
          <span>฿{(order.totalAmount / 100).toFixed(2)}</span>
        </div>
      </div>

      {order.hasEvidence && (
        <div className="bg-white rounded-xl p-4 shadow-sm mb-3">
          <h2 className="font-semibold mb-2 text-sm">หลักฐานการชำระ</h2>
          <img
            src={`/api/merchant/orders/${order.id}/evidence`}
            alt="payment evidence"
            className="w-full rounded-lg object-contain max-h-64"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        </div>
      )}

      {ACTIONS[order.status]?.length > 0 && (
        <div className="space-y-2">
          {ACTIONS[order.status].map((action) => (
            <button
              key={action.next}
              onClick={() => handleAction(action.next)}
              disabled={loading}
              className={`w-full py-3 rounded-xl font-semibold disabled:opacity-50 ${
                action.next === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-gray-900 text-white'
              }`}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Implement MerchantMenuPage**

`frontend/src/pages/MerchantMenuPage.tsx`:
```typescript
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import type { MenuItem } from '../types'

export function MerchantMenuPage() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', description: '', price: '' })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadItems = () => api.menu.list().then((d) => setItems(d.items))
  useEffect(() => { loadItems() }, [])

  function startAdd() {
    setEditingId('new')
    setForm({ name: '', description: '', price: '' })
    setImageFile(null)
  }

  function startEdit(item: MenuItem) {
    setEditingId(item.id)
    setForm({ name: item.name, description: item.description ?? '', price: String(item.price / 100) })
    setImageFile(null)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const priceNum = Math.round(parseFloat(form.price) * 100)
    if (!form.name.trim() || isNaN(priceNum)) { setError('ชื่อและราคาจำเป็น'); return }
    setError('')
    setLoading(true)

    try {
      let id = editingId!

      if (editingId === 'new') {
        const res = await api.menu.create({ name: form.name.trim(), description: form.description || null, price: priceNum, imageKey: null })
        id = res.id
      } else {
        await api.menu.update(id, { name: form.name.trim(), description: form.description || null, price: priceNum })
      }

      if (imageFile) {
        await api.menu.uploadImage(id, imageFile)
      }

      setEditingId(null)
      await loadItems()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }

  async function handleToggle(item: MenuItem) {
    await api.menu.update(item.id, { isAvailable: !item.isAvailable })
    await loadItems()
  }

  async function handleDelete(id: string) {
    if (!confirm('ลบรายการนี้?')) return
    await api.menu.delete(id)
    await loadItems()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm px-4 py-3 flex items-center justify-between">
        <Link to="/merchant/orders" className="text-sm text-blue-600">← Orders</Link>
        <h1 className="text-lg font-bold">Menu</h1>
        <button onClick={startAdd} className="text-sm bg-gray-900 text-white px-3 py-1.5 rounded-lg">+ Add</button>
      </header>

      {editingId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h2 className="font-bold text-lg">{editingId === 'new' ? 'Add Item' : 'Edit Item'}</h2>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="ชื่อ" className="w-full border rounded-lg px-3 py-2 text-sm" />
            <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="คำอธิบาย (ไม่บังคับ)" className="w-full border rounded-lg px-3 py-2 text-sm" />
            <input value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} placeholder="ราคา (บาท)" type="number" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm" />
            <div>
              <p className="text-sm mb-1">รูปภาพ (JPEG/PNG)</p>
              <input type="file" accept=".jpg,.jpeg,.png" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} className="text-sm" />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={() => setEditingId(null)} className="flex-1 border rounded-lg py-2 text-sm">ยกเลิก</button>
              <button type="submit" disabled={loading} className="flex-1 bg-gray-900 text-white rounded-lg py-2 text-sm disabled:opacity-50">บันทึก</button>
            </div>
          </form>
        </div>
      )}

      <div className="px-4 py-4 space-y-2">
        {items.map((item) => (
          <div key={item.id} className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-3">
            {item.imageKey && (
              <img src={`/api/menu/${item.id}/image`} alt={item.name} className="w-16 h-16 rounded-lg object-cover" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{item.name}</p>
              <p className="text-sm text-orange-600">฿{(item.price / 100).toFixed(2)}</p>
              <p className="text-xs text-gray-400">{item.isAvailable ? 'Available' : 'Out of stock'}</p>
            </div>
            <div className="flex flex-col gap-1 text-xs">
              <button onClick={() => startEdit(item)} className="px-3 py-1 border rounded-lg">Edit</button>
              <button onClick={() => handleToggle(item)} className="px-3 py-1 border rounded-lg">
                {item.isAvailable ? 'Out' : 'In'}
              </button>
              <button onClick={() => handleDelete(item.id)} className="px-3 py-1 border rounded-lg text-red-500">Del</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/
git commit -m "feat: add merchant panel pages — login, orders, detail, menu management"
```

---

## Task 6: Integration, Secrets & Deploy Config

**Files:**
- Modify: `wrangler.toml`
- Create: `.dev.vars` (gitignored)
- Modify: `.gitignore`

**Depends on:** All other tasks

- [ ] **Step 1: Create .gitignore**

`.gitignore`:
```
node_modules/
dist/
.dev.vars
.wrangler/
*.local
```

- [ ] **Step 2: Create local dev secrets**

`.dev.vars`:
```
MERCHANT_SECRET=dev-secret-change-me
```

- [ ] **Step 3: Create Cloudflare R2 bucket**

```bash
wrangler r2 bucket create oshi-files
```

- [ ] **Step 4: Set production secret**

```bash
wrangler secret put MERCHANT_SECRET
# Enter your production secret when prompted
```

- [ ] **Step 5: Build and verify locally**

```bash
# Build frontend
cd frontend && npm run build && cd ..

# Start worker locally with static assets
wrangler dev --local
```

Open http://localhost:8787 — verify:
- Landing page shows (empty menu)
- `/merchant` login page renders

- [ ] **Step 6: Add a test menu item via API to verify end-to-end**

```bash
# Login to get cookie (requires a browser session — use curl with cookies)
curl -c cookies.txt -X POST http://localhost:8787/api/merchant/login \
  -H "Content-Type: application/json" \
  -d '{"secret":"dev-secret-change-me"}'
# Expected: {"ok":true}

curl -b cookies.txt -X POST http://localhost:8787/api/merchant/menu \
  -H "Content-Type: application/json" \
  -d '{"name":"ข้าวมันไก่","price":5000}'
# Expected: {"id":"<uuid>"}
```

Reload http://localhost:8787 — item should appear in menu.

- [ ] **Step 7: Place a test order end-to-end**

```bash
curl -X POST http://localhost:8787/api/orders \
  -H "Content-Type: application/json" \
  -d '{"customerName":"สมชาย","phoneNumber":"0812345678","items":[{"menuItemId":"<id-from-step-6>","name":"ข้าวมันไก่","price":5000,"quantity":2}]}'
# Expected: {"orderId":"...","orderNumber":"ORD-0001"}
```

Verify at `/merchant/orders` — order appears.

- [ ] **Step 8: Deploy to Cloudflare**

```bash
npm run deploy
```

Expected: Deployment URL printed. Visit it — confirm landing page loads.

- [ ] **Step 9: Final commit**

```bash
git add .gitignore wrangler.toml
git commit -m "chore: finalize deploy config, gitignore, and verified end-to-end flow"
```

---

## Self-Review Checklist

### Spec Coverage

| FR/NFR | Covered in Task |
|--------|----------------|
| FR-01 Menu display | Task 3a + 5b (LandingPage) |
| FR-02 Out-of-stock visual | Task 5b (MenuItemCard) |
| FR-03 Dynamic menu | Task 5b (useEffect fetch on mount) |
| FR-04–06 Cart | Task 5a (CartContext, CartDrawer) |
| FR-07 Cart persists (localStorage) | Task 5a (cart.ts) |
| FR-08–10 Checkout + phone validation | Task 3b + 5b (CheckoutPage) |
| FR-11 Redirect to payment | Task 5b (CheckoutPage navigate) |
| FR-12 QR + amount | Task 5b (PaymentPage) |
| FR-13–15 Evidence upload | Task 4 + 5b (PaymentPage) |
| FR-16–18 Order lookup | Task 3b + 5b (OrderLookupPage) |
| FR-19–21 Merchant auth + cookie | Task 3c + 5c (MerchantLoginPage) |
| FR-22–24 Order list + filter + polling | Task 3c + 5c (MerchantOrdersPage) |
| FR-25–29 Order detail + evidence view | Task 3c + 4 + 5c (MerchantOrderDetailPage) |
| FR-30–33 Menu CRUD + toggle | Task 3a + 4 + 5c (MerchantMenuPage) |
| NFR-01–04 Cloudflare-native | wrangler.toml |
| NFR-05–06 Responsive + mobile-first | Tailwind + Task 5b/5c |
| NFR-07 Thai language | Pages use Thai text |
| NFR-11 Secret as env var | Task 6 (.dev.vars + `wrangler secret`) |
| NFR-13 Dual validation (client+server) | phone validation in both CheckoutPage and orders route |
| NFR-14 Evidence not public | Task 4 (`merchantAuth` on evidence GET route) |
| NFR-16 Structured JSON errors | All routes return `{ error: "..." }` |

### Type Consistency

- `MenuItem.imageKey` (camelCase) used consistently in frontend types and API client.
- Worker returns snake_case from DB, mapped to camelCase in route responses.
- `CartItem` matches fields used in `CartContext` and `MenuItemCard`.
- Order status state machine in `VALID_TRANSITIONS` matches SRS table exactly.

### One Gap Addressed

The SRS FR-03 says "changes reflect without full page reload" — the LandingPage `useEffect` fetches on mount. For a proper polling/SSE solution this could be extended, but the fetch-on-mount satisfies the spirit for v1.
