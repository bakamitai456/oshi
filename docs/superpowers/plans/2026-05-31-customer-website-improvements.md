# Customer Website Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the customer experience with better order-tracking page copy, pickup location visibility on checkout and tracking, and a new marketing landing page.

**Architecture:** Tasks 1 & 4 are pure frontend changes. Task 2 adds a `PICKUP_LOCATION` Worker env var exposed via `GET /api/settings`. Task 3 wires that value into the frontend. The current `LandingPage` (menu + cart, currently at `/`) moves to `/order`; a new `CustomerHomePage` takes over `/`.

**Tech Stack:** React 18 + Vite + React Router v6, Hono v4 (Cloudflare Worker), Tailwind CSS, TypeScript.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `frontend/src/pages/OrderLookupPage.tsx` | Title fix, instruction text, pickup location display |
| Modify | `frontend/src/pages/CheckoutPage.tsx` | Pickup location display, back-link `/` → `/order` |
| Modify | `frontend/src/pages/PaymentPage.tsx` | Back-link `/` → `/order` |
| Modify | `frontend/src/lib/api.ts` | Add `api.settings.get()` |
| Modify | `worker/src/types.ts` | Add `PICKUP_LOCATION` to Bindings |
| Modify | `wrangler.toml` | Add `[vars]` section with `PICKUP_LOCATION` |
| Modify | `worker/src/index.ts` | Mount settingsRoutes |
| Modify | `frontend/src/App.tsx` | Add `/` → CustomerHomePage, move LandingPage to `/order` |
| Create | `worker/src/routes/settings.ts` | `GET /api/settings` endpoint |
| Create | `worker/tests/settings.test.ts` | Tests for settings endpoint |
| Create | `frontend/src/pages/CustomerHomePage.tsx` | New landing page (About, Menu, How to Order) |

---

### Task 1: Order Tracking Page — Title & Instruction Text

**Files:**
- Modify: `frontend/src/pages/OrderLookupPage.tsx`

- [ ] **Step 1: Change the page title and add instruction text**

  In `frontend/src/pages/OrderLookupPage.tsx`, replace the header block (lines 33–36) and add a paragraph before the form:

  ```tsx
  // Replace this:
  <div className="flex items-center gap-3 mb-6">
    <Link to="/" className="text-orange-500">←</Link>
    <h1 className="text-2xl font-bold">ตรวจสอบออเดอร์</h1>
  </div>

  <form onSubmit={handleLookup} className="flex gap-2 mb-6">

  // With this:
  <div className="flex items-center gap-3 mb-4">
    <Link to="/order" className="text-orange-500">←</Link>
    <h1 className="text-2xl font-bold">ติดตามออเดอร์</h1>
  </div>

  <p className="text-sm text-gray-500 mb-4">กรอกเบอร์โทรศัพท์ที่ใช้สั่งออเดอร์เพื่อดูสถานะ</p>

  <form onSubmit={handleLookup} className="flex gap-2 mb-6">
  ```

  Also update the placeholder to make the input purpose clearer:
  ```tsx
  // Replace:
  placeholder="0812345678"
  // With:
  placeholder="เบอร์โทรศัพท์ เช่น 0812345678"
  ```

- [ ] **Step 2: Verify the page compiles**

  Run: `cd /Users/lmwn/personal-workspaces/oshi && npm run build --workspace=frontend 2>&1 | tail -5`
  Expected: exits 0, no TypeScript errors.

- [ ] **Step 3: Commit**

  ```bash
  git add frontend/src/pages/OrderLookupPage.tsx
  git commit -m "fix: rename order tracking page title and add input instruction"
  ```

---

### Task 2: Worker — Pickup Location Env Var & API Endpoint

**Files:**
- Modify: `worker/src/types.ts`
- Modify: `wrangler.toml`
- Create: `worker/src/routes/settings.ts`
- Modify: `worker/src/index.ts`
- Create: `worker/tests/settings.test.ts`

- [ ] **Step 1: Write the failing test**

  Create `worker/tests/settings.test.ts`:

  ```ts
  import { describe, it, expect } from 'vitest'
  import { Hono } from 'hono'
  import { settingsRoutes } from '../src/routes/settings'
  import type { Bindings } from '../src/types'

  function makeApp(pickupLocation: string) {
    const app = new Hono<{ Bindings: Bindings }>()
    app.route('/api', settingsRoutes)
    return app
  }

  const mockEnv = (pickupLocation: string) => ({
    DB: {} as D1Database,
    R2: {} as R2Bucket,
    ASSETS: {} as Fetcher,
    MERCHANT_SECRET: 'test-secret',
    PICKUP_LOCATION: pickupLocation,
  })

  describe('GET /api/settings', () => {
    it('returns pickupLocation from env', async () => {
      const app = makeApp('ชั้น 1 อาคาร A')
      const res = await app.request('/api/settings', {}, mockEnv('ชั้น 1 อาคาร A'))
      expect(res.status).toBe(200)
      const data = await res.json() as { pickupLocation: string }
      expect(data.pickupLocation).toBe('ชั้น 1 อาคาร A')
    })

    it('returns empty string when PICKUP_LOCATION is not set', async () => {
      const app = makeApp('')
      const res = await app.request('/api/settings', {}, mockEnv(''))
      expect(res.status).toBe(200)
      const data = await res.json() as { pickupLocation: string }
      expect(data.pickupLocation).toBe('')
    })
  })
  ```

- [ ] **Step 2: Run the test to confirm it fails**

  Run: `cd /Users/lmwn/personal-workspaces/oshi/worker && npm test -- settings 2>&1 | tail -15`
  Expected: FAIL — "Cannot find module '../src/routes/settings'"

- [ ] **Step 3: Add `PICKUP_LOCATION` to Bindings**

  In `worker/src/types.ts`, add `PICKUP_LOCATION: string` to the Bindings type:

  ```ts
  export type Bindings = {
    DB: D1Database
    R2: R2Bucket
    ASSETS: Fetcher
    MERCHANT_SECRET: string
    PICKUP_LOCATION: string
  }
  ```

- [ ] **Step 4: Create the settings route**

  Create `worker/src/routes/settings.ts`:

  ```ts
  import { Hono } from 'hono'
  import type { Bindings } from '../types'

  export const settingsRoutes = new Hono<{ Bindings: Bindings }>()

  settingsRoutes.get('/settings', (c) => {
    return c.json({ pickupLocation: c.env.PICKUP_LOCATION ?? '' })
  })
  ```

- [ ] **Step 5: Mount the settings route in index.ts**

  In `worker/src/index.ts`:

  ```ts
  import { Hono } from 'hono'
  import type { Bindings } from './types'
  import { menuRoutes } from './routes/menu'
  import { orderRoutes } from './routes/orders'
  import { merchantRoutes } from './routes/merchant'
  import { fileRoutes } from './routes/files'
  import { settingsRoutes } from './routes/settings'

  const app = new Hono<{ Bindings: Bindings }>()

  app.route('/api', menuRoutes)
  app.route('/api', orderRoutes)
  app.route('/api', merchantRoutes)
  app.route('/api', fileRoutes)
  app.route('/api', settingsRoutes)

  app.get('*', (c) => c.env.ASSETS.fetch(c.req.raw))

  export default app
  ```

- [ ] **Step 6: Add PICKUP_LOCATION to wrangler.toml**

  In `wrangler.toml`, add `[vars]` sections for local dev and each environment. Insert after the `[[r2_buckets]]` block and after each env's `[[r2_buckets]]` block:

  ```toml
  # after the top-level [[r2_buckets]] block:
  [vars]
  PICKUP_LOCATION = "โปรดอัปเดตจุดรับสินค้าในไฟล์ wrangler.toml"

  # after [[env.beta.r2_buckets]]:
  [env.beta.vars]
  PICKUP_LOCATION = "โปรดอัปเดตจุดรับสินค้าในไฟล์ wrangler.toml"

  # after [[env.production.r2_buckets]]:
  [env.production.vars]
  PICKUP_LOCATION = "โปรดอัปเดตจุดรับสินค้าในไฟล์ wrangler.toml"
  ```

  > **Note to merchant:** Replace the placeholder string with your actual pickup address/instructions, e.g. `"ร้าน oshi ชั้น 1 อาคาร XYZ ถนน ABC — เปิด 10:00–20:00 น."`.

- [ ] **Step 7: Run the test to confirm it passes**

  Run: `cd /Users/lmwn/personal-workspaces/oshi/worker && npm test -- settings 2>&1 | tail -15`
  Expected: PASS — 2 tests pass.

- [ ] **Step 8: Commit**

  ```bash
  git add worker/src/types.ts worker/src/routes/settings.ts worker/src/index.ts worker/tests/settings.test.ts wrangler.toml
  git commit -m "feat: expose pickup location via GET /api/settings"
  ```

---

### Task 3: Frontend — Fetch & Display Pickup Location

**Files:**
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/src/pages/CheckoutPage.tsx`
- Modify: `frontend/src/pages/OrderLookupPage.tsx`

- [ ] **Step 1: Add `api.settings.get()` to the API client**

  In `frontend/src/lib/api.ts`, add a `settings` namespace to the `api` object (after the `merchant` block):

  ```ts
  // Add to the api object:
  settings: {
    get: () => req<{ pickupLocation: string }>('/settings'),
  },
  ```

- [ ] **Step 2: Display pickup location in CheckoutPage**

  In `frontend/src/pages/CheckoutPage.tsx`:

  1. Add `useEffect` to the existing imports (already imported).
  2. Add state for `pickupLocation`:

  ```tsx
  const [pickupLocation, setPickupLocation] = useState('')

  useEffect(() => {
    api.settings.get().then((s) => setPickupLocation(s.pickupLocation)).catch(() => {})
  }, [])
  ```

  3. After the order items summary card (the `<div className="bg-white rounded-xl p-4 mb-4 shadow-sm">` block) and before the form, insert the pickup location card:

  ```tsx
  {pickupLocation && (
    <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 mb-4 flex items-start gap-2">
      <span className="text-orange-500 mt-0.5">📍</span>
      <div>
        <p className="text-xs font-semibold text-orange-700 mb-0.5">จุดรับสินค้า</p>
        <p className="text-sm text-orange-800">{pickupLocation}</p>
      </div>
    </div>
  )}
  ```

- [ ] **Step 3: Display pickup location in OrderLookupPage**

  In `frontend/src/pages/OrderLookupPage.tsx`:

  1. Add state and effect for pickup location (after the existing state declarations):

  ```tsx
  const [pickupLocation, setPickupLocation] = useState('')

  useEffect(() => {
    api.settings.get().then((s) => setPickupLocation(s.pickupLocation)).catch(() => {})
  }, [])
  ```

  2. Inside each order card (inside the `.map` callback), after the `order.status === 'ready'` block and before the `order.status === 'pending'` block, add:

  ```tsx
  {pickupLocation && (
    <p className="mt-2 text-xs text-gray-500">📍 {pickupLocation}</p>
  )}
  ```

- [ ] **Step 4: Verify the frontend compiles**

  Run: `cd /Users/lmwn/personal-workspaces/oshi && npm run build --workspace=frontend 2>&1 | tail -5`
  Expected: exits 0.

- [ ] **Step 5: Commit**

  ```bash
  git add frontend/src/lib/api.ts frontend/src/pages/CheckoutPage.tsx frontend/src/pages/OrderLookupPage.tsx
  git commit -m "feat: display pickup location on checkout and order tracking pages"
  ```

---

### Task 4: New Customer Landing Page & Route Restructure

**Files:**
- Create: `frontend/src/pages/CustomerHomePage.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/pages/CheckoutPage.tsx` (back-links)
- Modify: `frontend/src/pages/PaymentPage.tsx` (back-links)

> **Why route restructure?** The current `/` is the menu/ordering page (LandingPage). The new landing page takes over `/` as the shop introduction. The ordering page moves to `/order`. All existing pages that link back to `/` (meaning "go to the menu") must be updated to `/order`.

- [ ] **Step 1: Create CustomerHomePage**

  Create `frontend/src/pages/CustomerHomePage.tsx`:

  ```tsx
  import { useState, useEffect, useRef } from 'react'
  import { Link } from 'react-router-dom'
  import { api } from '../lib/api'
  import { formatTHB } from '../components/MenuItemCard'
  import type { MenuItem } from '../types'

  export function CustomerHomePage() {
    const [menuItems, setMenuItems] = useState<MenuItem[]>([])
    const [menuLoading, setMenuLoading] = useState(true)
    const aboutRef = useRef<HTMLElement>(null)
    const menuRef = useRef<HTMLElement>(null)
    const howRef = useRef<HTMLElement>(null)

    useEffect(() => {
      api.menu.list()
        .then((d) => setMenuItems(d.items.filter((i) => i.isAvailable)))
        .catch(() => {})
        .finally(() => setMenuLoading(false))
    }, [])

    function scrollTo(ref: React.RefObject<HTMLElement | null>) {
      ref.current?.scrollIntoView({ behavior: 'smooth' })
    }

    return (
      <div className="min-h-screen bg-white">
        {/* ── Sticky header ── */}
        <header className="sticky top-0 z-30 bg-white shadow-sm px-4 py-3 flex items-center justify-between">
          <span className="text-xl font-bold text-orange-600">oshi</span>
          <nav className="flex items-center gap-4">
            <button onClick={() => scrollTo(aboutRef)} className="text-sm text-gray-600 hover:text-orange-500 transition-colors">เกี่ยวกับเรา</button>
            <button onClick={() => scrollTo(menuRef)} className="text-sm text-gray-600 hover:text-orange-500 transition-colors">เมนู</button>
            <button onClick={() => scrollTo(howRef)} className="text-sm text-gray-600 hover:text-orange-500 transition-colors">วิธีสั่ง</button>
            <Link to="/orders" className="text-sm text-orange-500 hover:text-orange-600 font-medium transition-colors">ติดตามออเดอร์</Link>
          </nav>
        </header>

        {/* ── Hero ── */}
        <section className="bg-orange-50 px-6 py-20 text-center">
          <h1 className="text-5xl font-bold text-orange-600 mb-3">oshi</h1>
          <p className="text-lg text-gray-600 max-w-sm mx-auto">อาหารทำสด ทำด้วยใจ ส่งตรงถึงคุณ</p>
          <Link
            to="/order"
            className="mt-8 inline-block bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-full font-semibold text-base transition-colors shadow-sm"
          >
            สั่งอาหารเลย →
          </Link>
        </section>

        {/* ── About Us ── */}
        <section ref={aboutRef} className="px-6 py-16 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">เกี่ยวกับเรา</h2>
          <div className="w-10 h-1 bg-orange-400 rounded mb-6" />
          <p className="text-gray-600 leading-relaxed mb-4">
            oshi คือร้านอาหารที่เราเชื่อว่าทุกมื้อควรเป็นมื้อที่ดี เราคัดสรรวัตถุดิบสดใหม่และปรุงอาหารตามสั่งด้วยความตั้งใจทุกจาน
          </p>
          <p className="text-gray-600 leading-relaxed mb-4">
            แนวคิดของเราเรียบง่าย — อาหารดีไม่ต้องราคาสูง แค่ต้องทำด้วยใจ เราอยากให้คุณได้กินอาหารที่ดีต่อสุขภาพและอร่อยพร้อมกันในทุกวัน
          </p>
          <p className="text-gray-600 leading-relaxed">
            สั่งออนไลน์ได้ง่ายๆ ชำระเงินผ่าน PromptPay และมารับที่ร้านได้เลย ไม่มีค่าส่ง ไม่ยุ่งยาก
          </p>
        </section>

        {/* ── Menu ── */}
        <section ref={menuRef} className="bg-gray-50 px-6 py-16">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">เมนู</h2>
            <div className="w-10 h-1 bg-orange-400 rounded mb-6" />
            {menuLoading && <p className="text-gray-400 text-center py-8">กำลังโหลด...</p>}
            {!menuLoading && menuItems.length === 0 && (
              <p className="text-gray-400 text-center py-8">ยังไม่มีเมนูในขณะนี้</p>
            )}
            {!menuLoading && menuItems.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {menuItems.map((item) => (
                  <div key={item.id} className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-3">
                    {item.imageKey && (
                      <img
                        src={`/api/files/${item.imageKey}`}
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded-lg shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm">{item.name}</p>
                      {item.description && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.description}</p>
                      )}
                      <p className="text-orange-600 font-bold text-sm mt-1">{formatTHB(item.price)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── How to Order ── */}
        <section ref={howRef} className="px-6 py-16 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">วิธีสั่งซื้อ</h2>
          <div className="w-10 h-1 bg-orange-400 rounded mb-6" />
          <ol className="space-y-4">
            {[
              { step: '1', text: 'เลือกเมนูที่ต้องการและเพิ่มลงตะกร้า' },
              { step: '2', text: 'กรอกชื่อและเบอร์โทรศัพท์ของคุณ' },
              { step: '3', text: 'โอนเงินผ่าน PromptPay ตามยอดที่แจ้ง' },
              { step: '4', text: 'อัปโหลดหลักฐานการโอนเงินในแอป' },
              { step: '5', text: 'รอรับการยืนยันและมารับอาหารที่จุดรับสินค้า' },
            ].map(({ step, text }) => (
              <li key={step} className="flex items-start gap-4">
                <span className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 font-bold text-sm flex items-center justify-center shrink-0">
                  {step}
                </span>
                <p className="text-gray-600 pt-1">{text}</p>
              </li>
            ))}
          </ol>
          <div className="mt-10 text-center">
            <Link
              to="/order"
              className="inline-block bg-orange-500 hover:bg-orange-600 text-white px-10 py-3.5 rounded-full font-semibold text-base transition-colors shadow-sm"
            >
              สั่งอาหารเลย →
            </Link>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="bg-gray-900 text-gray-400 text-center text-xs py-6 px-4">
          <p className="font-semibold text-white mb-1">oshi</p>
          <p>© {new Date().getFullYear()} oshi. All rights reserved.</p>
        </footer>
      </div>
    )
  }
  ```

- [ ] **Step 2: Update App.tsx — add new route and move LandingPage to /order**

  Replace the contents of `frontend/src/App.tsx`:

  ```tsx
  import { Routes, Route } from 'react-router-dom'
  import { ProtectedRoute } from './components/ProtectedRoute'
  import { CustomerHomePage } from './pages/CustomerHomePage'
  import { LandingPage } from './pages/LandingPage'
  import { CheckoutPage } from './pages/CheckoutPage'
  import { PaymentPage } from './pages/PaymentPage'
  import { OrderLookupPage } from './pages/OrderLookupPage'
  import { MerchantLoginPage } from './pages/MerchantLoginPage'
  import { MerchantOrdersPage } from './pages/MerchantOrdersPage'
  import { MerchantOrderDetailPage } from './pages/MerchantOrderDetailPage'
  import { MerchantMenuPage } from './pages/MerchantMenuPage'

  export default function App() {
    return (
      <Routes>
        <Route path="/" element={<CustomerHomePage />} />
        <Route path="/order" element={<LandingPage />} />
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

- [ ] **Step 3: Fix back-links in CheckoutPage**

  In `frontend/src/pages/CheckoutPage.tsx`, update both `to="/"` occurrences to `to="/order"`:

  ```tsx
  // Empty cart state back link — change:
  <Link to="/" className="text-orange-500 underline">กลับหน้าเมนู</Link>
  // To:
  <Link to="/order" className="text-orange-500 underline">กลับหน้าเมนู</Link>

  // Header back arrow — change:
  <Link to="/" className="text-orange-500">←</Link>
  // To:
  <Link to="/order" className="text-orange-500">←</Link>
  ```

- [ ] **Step 4: Fix back-links in PaymentPage**

  In `frontend/src/pages/PaymentPage.tsx`, update the error-state back link (line 33):

  ```tsx
  // Change:
  <Link to="/" className="text-orange-500 underline">กลับหน้าหลัก</Link>
  // To:
  <Link to="/order" className="text-orange-500 underline">กลับหน้าเมนู</Link>
  ```

- [ ] **Step 5: Verify the frontend compiles with no errors**

  Run: `cd /Users/lmwn/personal-workspaces/oshi && npm run build --workspace=frontend 2>&1 | tail -10`
  Expected: exits 0.

- [ ] **Step 6: Verify all worker tests still pass**

  Run: `cd /Users/lmwn/personal-workspaces/oshi/worker && npm test 2>&1 | tail -15`
  Expected: all tests pass.

- [ ] **Step 7: Commit**

  ```bash
  git add frontend/src/pages/CustomerHomePage.tsx frontend/src/App.tsx frontend/src/pages/CheckoutPage.tsx frontend/src/pages/PaymentPage.tsx
  git commit -m "feat: add customer landing page and move ordering to /order"
  ```

---

## Post-Implementation Checklist

- [ ] Update `PICKUP_LOCATION` in `wrangler.toml` with the actual pickup address for beta and production environments.
- [ ] Replace `/public/promptpay-qr.png` with the real PromptPay QR (noted in AGENTS.md as a placeholder).
- [ ] Update the "About Us" text in `CustomerHomePage.tsx` with the real shop story and values.
- [ ] Deploy to beta: `npm run deploy -- --env beta` and verify all four pages load: `/`, `/order`, `/orders`, `/checkout`.
