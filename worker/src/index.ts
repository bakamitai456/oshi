import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Bindings } from './types'
import { menuRoutes } from './routes/menu'

const app = new Hono<{ Bindings: Bindings }>()

app.use('/api/*', cors({ origin: '*', credentials: true }))
app.route('/api', menuRoutes)

app.get('*', (c) => c.env.ASSETS.fetch(c.req.raw))

export default app
