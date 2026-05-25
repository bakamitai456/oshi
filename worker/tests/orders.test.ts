import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { orderRoutes } from '../src/routes/orders'
import type { Bindings } from '../src/types'

const mockOrder = {
  id: 'ord-1', order_number: 'ORD-0006', customer_name: 'สมชาย', phone_number: '0812345678',
  status: 'pending', total_amount: 5000, evidence_key: null,
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
}
const mockOrderItems = [
  { id: 'oi-1', order_id: 'ord-1', menu_item_id: 'mi-1', name: 'ข้าวมันไก่', price: 5000, quantity: 1 }
]

function makeDb() {
  const counter = { value: 5 }
  return {
    prepare: (sql: string) => {
      const upper = sql.trim().toUpperCase()
      return {
        bind: (..._: unknown[]) => ({
          run: async () => ({ success: true }),
          first: async <T>() => {
            if (upper.includes('COUNTERS')) return counter as T
            return mockOrder as T
          },
          all: async <T>() => ({
            results: (upper.includes('ORDER_ITEMS') ? mockOrderItems : [mockOrder]) as T[]
          }),
        }),
        run: async () => ({ success: true }),
        all: async <T>() => ({ results: [mockOrder] as T[] }),
        first: async <T>() => mockOrder as T,
      }
    },
    batch: async (stmts: D1PreparedStatement[]) =>
      stmts.map((_) => ({ results: [counter], success: true })),
  } as unknown as D1Database
}

function makeApp() {
  const app = new Hono<{ Bindings: Bindings }>()
  app.route('/api', orderRoutes)
  return app
}

const mockEnv = () => ({
  DB: makeDb(),
  R2: {} as R2Bucket,
  ASSETS: {} as Fetcher,
  MERCHANT_SECRET: 'test-secret',
})

describe('POST /api/orders', () => {
  it('creates order with valid payload', async () => {
    const app = makeApp()
    const res = await app.request('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'สมชาย',
        phoneNumber: '0812345678',
        items: [{ menuItemId: 'mi-1', name: 'ข้าวมันไก่', price: 5000, quantity: 1 }],
      }),
    }, mockEnv())
    expect(res.status).toBe(201)
    const data = await res.json() as { orderId: string; orderNumber: string }
    expect(typeof data.orderId).toBe('string')
    expect(data.orderNumber).toMatch(/^ORD-/)
  })

  it('rejects invalid Thai phone number', async () => {
    const app = makeApp()
    const res = await app.request('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Test',
        phoneNumber: '123456',
        items: [{ menuItemId: 'mi-1', name: 'X', price: 5000, quantity: 1 }],
      }),
    }, mockEnv())
    expect(res.status).toBe(400)
  })

  it('rejects empty items array', async () => {
    const app = makeApp()
    const res = await app.request('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Test',
        phoneNumber: '0812345678',
        items: [],
      }),
    }, mockEnv())
    expect(res.status).toBe(400)
  })

  it('rejects missing customerName', async () => {
    const app = makeApp()
    const res = await app.request('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: '',
        phoneNumber: '0812345678',
        items: [{ menuItemId: 'mi-1', name: 'X', price: 5000, quantity: 1 }],
      }),
    }, mockEnv())
    expect(res.status).toBe(400)
  })
})

describe('GET /api/orders', () => {
  it('returns orders for valid Thai phone', async () => {
    const app = makeApp()
    const res = await app.request('/api/orders?phone=0812345678', {}, mockEnv())
    expect(res.status).toBe(200)
    const data = await res.json() as { orders: unknown[] }
    expect(Array.isArray(data.orders)).toBe(true)
  })

  it('rejects invalid phone', async () => {
    const app = makeApp()
    const res = await app.request('/api/orders?phone=123', {}, mockEnv())
    expect(res.status).toBe(400)
  })
})

describe('GET /api/orders/:id', () => {
  it('returns order by id', async () => {
    const app = makeApp()
    const res = await app.request('/api/orders/ord-1', {}, mockEnv())
    expect(res.status).toBe(200)
    const data = await res.json() as { id: string; orderNumber: string }
    expect(data.id).toBe('ord-1')
    expect(data.orderNumber).toBeDefined()
  })
})
