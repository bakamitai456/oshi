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
