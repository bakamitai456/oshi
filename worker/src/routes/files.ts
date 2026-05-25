import { Hono } from 'hono'
import { merchantAuth } from '../middleware/auth'
import type { Bindings } from '../types'

export const fileRoutes = new Hono<{ Bindings: Bindings }>()

const ALLOWED_EVIDENCE_TYPES = ['image/jpeg', 'image/png', 'application/pdf']
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png']
const MAX_SIZE = 5 * 1024 * 1024

function getBaseContentType(header: string | null): string {
  return (header ?? '').split(';')[0].trim().toLowerCase()
}

fileRoutes.put('/orders/:id/evidence', async (c) => {
  const orderId = c.req.param('id')

  const order = await c.env.DB.prepare('SELECT id, evidence_key FROM orders WHERE id = ?')
    .bind(orderId).first<{ id: string; evidence_key: string | null }>()
  if (!order) return c.json({ error: 'Order not found' }, 404)

  const contentType = getBaseContentType(c.req.header('content-type'))
  if (!ALLOWED_EVIDENCE_TYPES.includes(contentType)) {
    return c.json({ error: 'File type not allowed. Use JPEG, PNG, or PDF.' }, 400)
  }

  const buffer = await c.req.arrayBuffer()
  if (buffer.byteLength > MAX_SIZE) {
    return c.json({ error: 'File exceeds 5 MB limit' }, 400)
  }

  const key = `evidence/${orderId}`

  await c.env.R2.put(key, buffer, { httpMetadata: { contentType } })

  const now = new Date().toISOString()
  await c.env.DB.prepare('UPDATE orders SET evidence_key = ?, updated_at = ? WHERE id = ?')
    .bind(key, now, orderId).run()

  if (order.evidence_key && order.evidence_key !== key) {
    await c.env.R2.delete(order.evidence_key)
  }

  return c.json({ ok: true })
})

fileRoutes.get('/merchant/orders/:id/evidence', merchantAuth, async (c) => {
  const orderId = c.req.param('id')
  const order = await c.env.DB.prepare('SELECT evidence_key FROM orders WHERE id = ?')
    .bind(orderId).first<{ evidence_key: string | null }>()

  if (!order) return c.json({ error: 'Order not found' }, 404)
  if (!order.evidence_key) return c.json({ error: 'No evidence uploaded' }, 404)

  const object = await c.env.R2.get(order.evidence_key)
  if (!object) return c.json({ error: 'File not found in storage' }, 404)

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('cache-control', 'no-cache')

  return new Response(object.body, { headers })
})

fileRoutes.put('/merchant/menu/:id/image', merchantAuth, async (c) => {
  const itemId = c.req.param('id')

  const item = await c.env.DB.prepare('SELECT id, image_key FROM menu_items WHERE id = ?')
    .bind(itemId).first<{ id: string; image_key: string | null }>()
  if (!item) return c.json({ error: 'Menu item not found' }, 404)

  const contentType = getBaseContentType(c.req.header('content-type'))
  if (!ALLOWED_IMAGE_TYPES.includes(contentType)) {
    return c.json({ error: 'Only JPEG and PNG allowed for menu images' }, 400)
  }

  const buffer = await c.req.arrayBuffer()
  if (buffer.byteLength > MAX_SIZE) {
    return c.json({ error: 'File exceeds 5 MB limit' }, 400)
  }

  const key = `menu/${itemId}`

  await c.env.R2.put(key, buffer, { httpMetadata: { contentType } })
  await c.env.DB.prepare('UPDATE menu_items SET image_key = ? WHERE id = ?')
    .bind(key, itemId).run()

  if (item.image_key && item.image_key !== key) {
    await c.env.R2.delete(item.image_key)
  }

  return c.json({ imageKey: key })
})

fileRoutes.get('/menu/:id/image', async (c) => {
  const itemId = c.req.param('id')
  const item = await c.env.DB.prepare('SELECT image_key FROM menu_items WHERE id = ?')
    .bind(itemId).first<{ image_key: string | null }>()

  if (!item) return c.json({ error: 'Menu item not found' }, 404)
  if (!item.image_key) return c.json({ error: 'No image for this item' }, 404)

  const object = await c.env.R2.get(item.image_key)
  if (!object) return c.json({ error: 'Image not found in storage' }, 404)

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('cache-control', 'public, max-age=3600')

  return new Response(object.body, { headers })
})
