import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { menuRoutes } from '../src/routes/menu'
import type { Bindings } from '../src/types'

const mockItems = [
  { id: 'item-1', name: 'ข้าวมันไก่', description: null, price: 5000, image_key: null, is_available: 1, created_at: '2026-01-01T00:00:00Z' },
]

function makeDb(items = mockItems) {
  return {
    prepare: (_sql: string) => ({
      all: async <T>() => ({ results: items as T[] }),
      run: async () => ({ success: true }),
      first: async <T>() => items[0] as T,
      bind: (..._args: unknown[]) => ({
        all: async <T>() => ({ results: items as T[] }),
        run: async () => ({ success: true }),
        first: async <T>() => items[0] as T,
      }),
    }),
  } as unknown as D1Database
}

function makeApp(db: D1Database) {
  const app = new Hono<{ Bindings: Bindings }>()
  app.route('/api', menuRoutes)
  return app
}

const mockEnv = (db: D1Database) => ({
  DB: db,
  R2: {} as R2Bucket,
  ASSETS: {} as Fetcher,
  MERCHANT_SECRET: 'test-secret',
})

describe('GET /api/menu', () => {
  it('returns mapped menu items', async () => {
    const app = makeApp(makeDb())
    const res = await app.request('/api/menu', {}, mockEnv(makeDb()))
    expect(res.status).toBe(200)
    const data = await res.json() as { items: unknown[] }
    expect(Array.isArray(data.items)).toBe(true)
    expect(data.items).toHaveLength(1)
  })
})

describe('POST /api/merchant/menu', () => {
  it('rejects unauthenticated requests with 401', async () => {
    const app = makeApp(makeDb())
    const res = await app.request('/api/merchant/menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', price: 5000 }),
    }, mockEnv(makeDb()))
    expect(res.status).toBe(401)
  })

  it('creates menu item when authenticated', async () => {
    const app = makeApp(makeDb())
    const res = await app.request('/api/merchant/menu', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'merchant_token=test-secret',
      },
      body: JSON.stringify({ name: 'New Item', price: 8000 }),
    }, mockEnv(makeDb()))
    expect(res.status).toBe(201)
    const data = await res.json() as { id: string }
    expect(typeof data.id).toBe('string')
  })
})

describe('PATCH /api/merchant/menu/:id', () => {
  it('rejects unauthenticated requests', async () => {
    const app = makeApp(makeDb())
    const res = await app.request('/api/merchant/menu/item-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated' }),
    }, mockEnv(makeDb()))
    expect(res.status).toBe(401)
  })
})

describe('DELETE /api/merchant/menu/:id', () => {
  it('soft-deletes (marks out of stock) when authenticated', async () => {
    const app = makeApp(makeDb())
    const res = await app.request('/api/merchant/menu/item-1', {
      method: 'DELETE',
      headers: { 'Cookie': 'merchant_token=test-secret' },
    }, mockEnv(makeDb()))
    expect(res.status).toBe(200)
  })
})
