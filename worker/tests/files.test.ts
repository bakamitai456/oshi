import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { fileRoutes } from '../src/routes/files'
import type { Bindings } from '../src/types'

const SECRET = 'test-secret'

function makeR2(hasObject = true) {
  return {
    get: async (_key: string) => hasObject ? {
      body: new ReadableStream(),
      writeHttpMetadata: (h: Headers) => { h.set('content-type', 'image/jpeg') },
    } : null,
    put: async () => ({}),
    delete: async () => undefined,
  } as unknown as R2Bucket
}

function makeDb(opts: { orderFound?: boolean; evidenceKey?: string | null; itemFound?: boolean; imageKey?: string | null } = {}) {
  const { orderFound = true, evidenceKey = null, itemFound = true, imageKey = null } = opts
  return {
    prepare: (sql: string) => ({
      bind: (..._: unknown[]) => ({
        run: async () => ({ success: true }),
        first: async <T>() => {
          if (sql.includes('orders')) {
            return (orderFound ? { id: 'ord-1', evidence_key: evidenceKey } : null) as T
          }
          if (sql.includes('menu_items')) {
            return (itemFound ? { id: 'item-1', image_key: imageKey } : null) as T
          }
          return null as T
        },
      }),
    }),
  } as unknown as D1Database
}

function makeApp() {
  const app = new Hono<{ Bindings: Bindings }>()
  app.route('/api', fileRoutes)
  return app
}

const mockEnv = (dbOpts = {}, hasR2Object = true) => ({
  DB: makeDb(dbOpts),
  R2: makeR2(hasR2Object),
  ASSETS: {} as Fetcher,
  MERCHANT_SECRET: SECRET,
})

describe('PUT /api/orders/:id/evidence', () => {
  it('returns 404 if order not found', async () => {
    const app = makeApp()
    const res = await app.request('/api/orders/nonexistent/evidence', {
      method: 'PUT',
      headers: { 'content-type': 'image/jpeg' },
      body: new Uint8Array(10),
    }, mockEnv({ orderFound: false }))
    expect(res.status).toBe(404)
  })

  it('rejects disallowed content type', async () => {
    const app = makeApp()
    const res = await app.request('/api/orders/ord-1/evidence', {
      method: 'PUT',
      headers: { 'content-type': 'image/gif' },
      body: new Uint8Array(10),
    }, mockEnv())
    expect(res.status).toBe(400)
  })

  it('accepts valid JPEG upload', async () => {
    const app = makeApp()
    const res = await app.request('/api/orders/ord-1/evidence', {
      method: 'PUT',
      headers: { 'content-type': 'image/jpeg' },
      body: new Uint8Array(100),
    }, mockEnv())
    expect(res.status).toBe(200)
  })

  it('accepts PDF upload', async () => {
    const app = makeApp()
    const res = await app.request('/api/orders/ord-1/evidence', {
      method: 'PUT',
      headers: { 'content-type': 'application/pdf' },
      body: new Uint8Array(100),
    }, mockEnv())
    expect(res.status).toBe(200)
  })
})

describe('GET /api/merchant/orders/:id/evidence', () => {
  it('returns 401 without auth', async () => {
    const app = makeApp()
    const res = await app.request('/api/merchant/orders/ord-1/evidence', {}, mockEnv({ evidenceKey: 'evidence/ord-1' }))
    expect(res.status).toBe(401)
  })

  it('returns 404 if no evidence uploaded', async () => {
    const app = makeApp()
    const res = await app.request('/api/merchant/orders/ord-1/evidence', {
      headers: { 'Cookie': `merchant_token=${SECRET}` },
    }, mockEnv({ evidenceKey: null }))
    expect(res.status).toBe(404)
  })
})

describe('PUT /api/merchant/menu/:id/image', () => {
  it('returns 401 without auth', async () => {
    const app = makeApp()
    const res = await app.request('/api/merchant/menu/item-1/image', {
      method: 'PUT',
      headers: { 'content-type': 'image/jpeg' },
      body: new Uint8Array(10),
    }, mockEnv())
    expect(res.status).toBe(401)
  })

  it('rejects PDF for menu image', async () => {
    const app = makeApp()
    const res = await app.request('/api/merchant/menu/item-1/image', {
      method: 'PUT',
      headers: {
        'content-type': 'application/pdf',
        'Cookie': `merchant_token=${SECRET}`,
      },
      body: new Uint8Array(10),
    }, mockEnv())
    expect(res.status).toBe(400)
  })

  it('accepts JPEG for menu image when authenticated', async () => {
    const app = makeApp()
    const res = await app.request('/api/merchant/menu/item-1/image', {
      method: 'PUT',
      headers: {
        'content-type': 'image/jpeg',
        'Cookie': `merchant_token=${SECRET}`,
      },
      body: new Uint8Array(100),
    }, mockEnv())
    expect(res.status).toBe(200)
    const data = await res.json() as { imageKey: string }
    expect(data.imageKey).toBe('menu/item-1')
  })
})

describe('GET /api/menu/:id/image', () => {
  it('returns 404 if item has no image', async () => {
    const app = makeApp()
    const res = await app.request('/api/menu/item-1/image', {}, mockEnv({ imageKey: null }))
    expect(res.status).toBe(404)
  })
})
