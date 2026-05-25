import { Hono } from 'hono'
import type { Bindings } from './types'
import { menuRoutes } from './routes/menu'
import { orderRoutes } from './routes/orders'
import { merchantRoutes } from './routes/merchant'
import { fileRoutes } from './routes/files'

const app = new Hono<{ Bindings: Bindings }>()

app.route('/api', menuRoutes)
app.route('/api', orderRoutes)
app.route('/api', merchantRoutes)
app.route('/api', fileRoutes)

app.get('*', (c) => c.env.ASSETS.fetch(c.req.raw))

export default app
