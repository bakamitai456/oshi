import { Hono } from 'hono'
import type { Bindings } from '../types'

export const settingsRoutes = new Hono<{ Bindings: Bindings }>()

const PLACEHOLDER = 'โปรดอัปเดตจุดรับสินค้าในไฟล์ wrangler.toml'

settingsRoutes.get('/settings', (c) => {
  const raw = c.env.PICKUP_LOCATION ?? ''
  if (!raw || raw === PLACEHOLDER) {
    console.warn('[settings] PICKUP_LOCATION is not configured — hiding pickup location from customers')
    return c.json({ pickupLocation: '' })
  }
  return c.json({ pickupLocation: raw })
})
