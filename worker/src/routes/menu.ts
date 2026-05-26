import { Hono } from 'hono'
import { hashSecret } from '../lib/auth'
import type { Bindings, MenuItem } from '../types'

export const menuRoutes = new Hono<{ Bindings: Bindings }>()

async function isMerchantAuthed(c: { env: Bindings; req: { raw: Request } }): Promise<boolean> {
  const cookie = c.req.raw.headers.get('cookie') ?? ''
  const match = cookie.match(/merchant_token=([^;]+)/)
  const token = match?.[1]
  return !!token && token === await hashSecret(c.env.MERCHANT_SECRET)
}

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

menuRoutes.post('/merchant/menu', async (c) => {
  if (!await isMerchantAuthed(c)) return c.json({ error: 'Unauthorized' }, 401)

  const body = await c.req.json<{
    name: string
    description?: string
    price: number
    imageKey?: string
  }>()

  if (!body.name?.trim() || typeof body.price !== 'number') {
    return c.json({ error: 'name and price are required' }, 400)
  }

  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  await c.env.DB.prepare(
    'INSERT INTO menu_items (id, name, description, price, image_key, is_available, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)'
  ).bind(id, body.name.trim(), body.description ?? null, body.price, body.imageKey ?? null, now).run()

  return c.json({ id }, 201)
})

menuRoutes.patch('/merchant/menu/:id', async (c) => {
  if (!await isMerchantAuthed(c)) return c.json({ error: 'Unauthorized' }, 401)

  const itemId = c.req.param('id')
  const body = await c.req.json<Partial<{
    name: string
    description: string | null
    price: number
    imageKey: string | null
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
  if (!await isMerchantAuthed(c)) return c.json({ error: 'Unauthorized' }, 401)

  const itemId = c.req.param('id')
  await c.env.DB.prepare('UPDATE menu_items SET is_available = 0 WHERE id = ?')
    .bind(itemId).run()

  return c.json({ ok: true })
})
