import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { merchantRoutes } from '../src/routes/merchant'
import type { Bindings } from '../src/types'

const SECRET = 'test-secret-123'

const mockOrder = {
  id: 'ord-1', order_number: 'ORD-0001', customer_name: 'สมชาย', phone_number: '0812345678',
  status: 'pending', total_amount: 5000, evidence_key: null,
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
}
const mockItems = [
  { id: 'oi-1', order_id: 'ord-1', menu_item_id: 'mi-1', name: 'ข้าวมันไก่', price: 5000, quantity: 1 }
]

function makeDb() {
  return {
    prepare: (_sql: string) => ({
      bind: (..._: unknown[]) => ({
        run: async () => ({ success: true }),
        first: async <T>() => mockOrder as T,
        all: async <T>() => ({
          results: (_sql.includes('order_items') ? mockItems : [mockOrder]) as T[]
        }),
      }),
      first: async <T>() => mockOrder as T,
      all: async <T>() => ({ results: [mockOrder] as T[] }),
      run: async () => ({ success: true }),
    }),
  } as unknown as D1Database
}

function makeApp() {
  const app = new Hono<{ Bindings: Bindings }>()
  app.route('/api', merchantRoutes)
  return app
}

const mockEnv = () => ({
  DB: makeDb(),
  R2: {} as R2Bucket,
  ASSETS: {} as Fetcher,
  MERCHANT_SECRET: SECRET,
})

describe('POST /api/merchant/login', () => {
  it('returns 200 and sets cookies on correct secret', async () => {
    const app = makeApp()
    const res = await app.request('/api/merchant/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: SECRET }),
    }, mockEnv())
    expect(res.status).toBe(200)
    const setCookie = res.headers.get('set-cookie') ?? ''
    expect(setCookie).toContain('merchant_token=')
  })

  it('returns 401 on wrong secret', async () => {
    const app = makeApp()
    const res = await app.request('/api/merchant/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: 'wrong' }),
    }, mockEnv())
    expect(res.status).toBe(401)
  })
})

describe('POST /api/merchant/logout', () => {
  it('clears cookies', async () => {
    const app = makeApp()
    const res = await app.request('/api/merchant/logout', {
      method: 'POST',
    }, mockEnv())
    expect(res.status).toBe(200)
  })
})

describe('GET /api/merchant/orders', () => {
  it('returns 401 without auth', async () => {
    const app = makeApp()
    const res = await app.request('/api/merchant/orders', {}, mockEnv())
    expect(res.status).toBe(401)
  })

  it('returns orders list when authenticated', async () => {
    const app = makeApp()
    const res = await app.request('/api/merchant/orders', {
      headers: { 'Cookie': `merchant_token=${SECRET}` },
    }, mockEnv())
    expect(res.status).toBe(200)
    const data = await res.json() as { orders: unknown[] }
    expect(Array.isArray(data.orders)).toBe(true)
  })
})

describe('PATCH /api/merchant/orders/:id/status', () => {
  it('returns 401 without auth', async () => {
    const app = makeApp()
    const res = await app.request('/api/merchant/orders/ord-1/status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'preparing' }),
    }, mockEnv())
    expect(res.status).toBe(401)
  })

  it('allows valid transition from pending to preparing', async () => {
    const app = makeApp()
    const res = await app.request('/api/merchant/orders/ord-1/status', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `merchant_token=${SECRET}`,
      },
      body: JSON.stringify({ status: 'preparing' }),
    }, mockEnv())
    expect(res.status).toBe(200)
    const data = await res.json() as { ok: boolean; status: string }
    expect(data.ok).toBe(true)
    expect(data.status).toBe('preparing')
  })

  it('rejects invalid transition (pending to done)', async () => {
    const app = makeApp()
    const res = await app.request('/api/merchant/orders/ord-1/status', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `merchant_token=${SECRET}`,
      },
      body: JSON.stringify({ status: 'done' }),
    }, mockEnv())
    expect(res.status).toBe(422)
  })
})

describe('GET /api/merchant/orders/:id', () => {
  it('returns 401 without auth', async () => {
    const app = makeApp()
    const res = await app.request('/api/merchant/orders/ord-1', {}, mockEnv())
    expect(res.status).toBe(401)
  })

  it('returns order detail when authenticated', async () => {
    const app = makeApp()
    const res = await app.request('/api/merchant/orders/ord-1', {
      headers: { 'Cookie': `merchant_token=${SECRET}` },
    }, mockEnv())
    expect(res.status).toBe(200)
    const data = await res.json() as { id: string; orderNumber: string; phoneNumber: string; evidenceKey: unknown }
    expect(data.id).toBe('ord-1')
    expect(data.orderNumber).toBeDefined()
    expect(data.phoneNumber).toBeDefined()
    expect('evidenceKey' in data).toBe(true)
  })
})
