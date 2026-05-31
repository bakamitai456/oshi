import { Hono } from 'hono'
import type { Bindings } from '../types'

export const settingsRoutes = new Hono<{ Bindings: Bindings }>()

settingsRoutes.get('/settings', (c) => {
  return c.json({ pickupLocation: c.env.PICKUP_LOCATION ?? '' })
})
