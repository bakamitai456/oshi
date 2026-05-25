import { Hono } from 'hono'
import { setCookie, deleteCookie } from 'hono/cookie'
import { merchantAuth } from '../middleware/auth'
import type { Bindings, Order, OrderItem } from '../types'

export const merchantRoutes = new Hono<{ Bindings: Bindings }>()

merchantRoutes.post('/merchant/login', async (c) => {
  const body = await c.req.json<{ secret: string }>()
  if (body.secret !== c.env.MERCHANT_SECRET) {
    return c.json({ error: 'Invalid secret' }, 401)
  }

  setCookie(c, 'merchant_token', c.env.MERCHANT_SECRET, {
    httpOnly: true,
    secure: true,
    sameSite: 'Strict',
    path: '/',
  })
  setCookie(c, 'merchant_logged_in', '1', {
    httpOnly: false,
    secure: true,
    sameSite: 'Strict',
    path: '/',
  })

  return c.json({ ok: true })
})

merchantRoutes.post('/merchant/logout', (c) => {
  deleteCookie(c, 'merchant_token', { path: '/' })
  deleteCookie(c, 'merchant_logged_in', { path: '/' })
  return c.json({ ok: true })
})

merchantRoutes.get('/merchant/orders', merchantAuth, async (c) => {
  const status = c.req.query('status')
  const { results } = status
    ? await c.env.DB.prepare('SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC').bind(status).all<Order>()
    : await c.env.DB.prepare('SELECT * FROM orders ORDER BY created_at DESC').all<Order>()

  const orders = await Promise.all(results.map(async (order) => {
    const { results: items } = await c.env.DB.prepare(
      'SELECT * FROM order_items WHERE order_id = ?'
    ).bind(order.id).all<OrderItem>()

    return {
      id: order.id,
      orderNumber: order.order_number,
      customerName: order.customer_name,
      phoneNumber: order.phone_number,
      status: order.status,
      totalAmount: order.total_amount,
      hasEvidence: !!order.evidence_key,
      items: items.map((i) => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity })),
      createdAt: order.created_at,
      updatedAt: order.updated_at,
    }
  }))

  return c.json({ orders })
})

merchantRoutes.get('/merchant/orders/:id', merchantAuth, async (c) => {
  const orderId = c.req.param('id')
  const order = await c.env.DB.prepare('SELECT * FROM orders WHERE id = ?')
    .bind(orderId).first<Order>()
  if (!order) return c.json({ error: 'Not found' }, 404)

  const { results: items } = await c.env.DB.prepare(
    'SELECT * FROM order_items WHERE order_id = ?'
  ).bind(orderId).all<OrderItem>()

  return c.json({
    id: order.id,
    orderNumber: order.order_number,
    customerName: order.customer_name,
    phoneNumber: order.phone_number,
    status: order.status,
    totalAmount: order.total_amount,
    evidenceKey: order.evidence_key,
    hasEvidence: !!order.evidence_key,
    items: items.map((i) => ({
      id: i.id,
      menuItemId: i.menu_item_id,
      name: i.name,
      price: i.price,
      quantity: i.quantity,
    })),
    createdAt: order.created_at,
    updatedAt: order.updated_at,
  })
})

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['done', 'cancelled'],
  done: [],
  cancelled: [],
}

merchantRoutes.patch('/merchant/orders/:id/status', merchantAuth, async (c) => {
  const orderId = c.req.param('id')
  const body = await c.req.json<{ status: string }>()

  const order = await c.env.DB.prepare('SELECT status FROM orders WHERE id = ?')
    .bind(orderId).first<{ status: string }>()
  if (!order) return c.json({ error: 'Not found' }, 404)

  const allowed = VALID_TRANSITIONS[order.status] ?? []
  if (!allowed.includes(body.status)) {
    return c.json({ error: `Cannot transition from ${order.status} to ${body.status}` }, 422)
  }

  const now = new Date().toISOString()
  await c.env.DB.prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?')
    .bind(body.status, now, orderId).run()

  return c.json({ ok: true, status: body.status })
})
