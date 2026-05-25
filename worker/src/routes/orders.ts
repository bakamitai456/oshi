import { Hono } from 'hono'
import type { Bindings, Order, OrderItem } from '../types'

export const orderRoutes = new Hono<{ Bindings: Bindings }>()

const PHONE_RE = /^0\d{9}$/

orderRoutes.post('/orders', async (c) => {
  const body = await c.req.json<{
    customerName: string
    phoneNumber: string
    items: { menuItemId: string; name: string; price: number; quantity: number }[]
  }>()

  if (!body.customerName?.trim()) return c.json({ error: 'customerName required' }, 400)
  if (!PHONE_RE.test(body.phoneNumber ?? '')) return c.json({ error: 'Invalid Thai phone number' }, 400)
  if (!Array.isArray(body.items) || body.items.length === 0) return c.json({ error: 'items required' }, 400)

  const totalAmount = body.items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const now = new Date().toISOString()
  const orderId = crypto.randomUUID()

  const batchResults = await c.env.DB.batch([
    c.env.DB.prepare('UPDATE counters SET value = value + 1 WHERE key = ?').bind('order_number'),
    c.env.DB.prepare('SELECT value FROM counters WHERE key = ?').bind('order_number'),
  ])
  const counterRow = (batchResults[1] as unknown as { results: { value: number }[] }).results?.[0]
  const counterVal = counterRow?.value ?? 1
  const orderNumber = `ORD-${String(counterVal).padStart(4, '0')}`

  await c.env.DB.prepare(
    'INSERT INTO orders (id, order_number, customer_name, phone_number, status, total_amount, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(orderId, orderNumber, body.customerName.trim(), body.phoneNumber, 'pending', totalAmount, now, now).run()

  const itemInserts = body.items.map((item) =>
    c.env.DB.prepare(
      'INSERT INTO order_items (id, order_id, menu_item_id, name, price, quantity) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(crypto.randomUUID(), orderId, item.menuItemId, item.name, item.price, item.quantity)
  )
  await c.env.DB.batch(itemInserts)

  return c.json({ orderId, orderNumber }, 201)
})

orderRoutes.get('/orders', async (c) => {
  const phone = c.req.query('phone')
  if (!phone || !PHONE_RE.test(phone)) return c.json({ error: 'Valid Thai phone required' }, 400)

  const { results } = await c.env.DB.prepare(
    'SELECT * FROM orders WHERE phone_number = ? ORDER BY created_at DESC'
  ).bind(phone).all<Order>()

  const orders = await Promise.all(results.map(async (order) => {
    const { results: items } = await c.env.DB.prepare(
      'SELECT * FROM order_items WHERE order_id = ?'
    ).bind(order.id).all<OrderItem>()

    return {
      id: order.id,
      orderNumber: order.order_number,
      customerName: order.customer_name,
      status: order.status,
      totalAmount: order.total_amount,
      items: items.map((i) => ({
        id: i.id,
        menuItemId: i.menu_item_id,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
      })),
      hasEvidence: !!order.evidence_key,
      createdAt: order.created_at,
    }
  }))

  return c.json({ orders })
})

orderRoutes.get('/orders/:id', async (c) => {
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
    items: items.map((i) => ({
      id: i.id,
      menuItemId: i.menu_item_id,
      name: i.name,
      price: i.price,
      quantity: i.quantity,
    })),
    hasEvidence: !!order.evidence_key,
    createdAt: order.created_at,
  })
})
