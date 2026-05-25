import type { Context, Next } from 'hono'
import type { Bindings } from '../types'

export async function merchantAuth(c: Context<{ Bindings: Bindings }>, next: Next) {
  const cookie = c.req.raw.headers.get('cookie') ?? ''
  const match = cookie.match(/merchant_token=([^;]+)/)
  const token = match?.[1]
  if (!token || token !== c.env.MERCHANT_SECRET) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  return next()
}
