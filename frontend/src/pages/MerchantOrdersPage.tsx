import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { OrderStatusBadge } from '../components/OrderStatusBadge'
import { formatTHB } from '../components/MenuItemCard'
import type { Order } from '../types'

const STATUSES = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'ready', label: 'Ready' },
  { value: 'done', label: 'Done' },
  { value: 'cancelled', label: 'Cancelled' },
]

export function MerchantOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const load = useCallback(() => {
    setLoading(true)
    api.merchant.orders.list(filter || undefined)
      .then((d) => setOrders(d.orders))
      .catch((err) => {
        if (err instanceof Error && err.message === 'Unauthorized') navigate('/merchant')
      })
      .finally(() => setLoading(false))
  }, [filter, navigate])

  useEffect(() => { load() }, [load])

  // Poll every 10s for near-real-time updates
  useEffect(() => {
    const id = setInterval(load, 10_000)
    return () => clearInterval(id)
  }, [load])

  async function handleLogout() {
    await api.merchant.logout().catch(() => undefined)
    navigate('/merchant')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold">Orders</h1>
        <div className="flex items-center gap-3">
          <Link to="/merchant/menu" className="text-sm text-blue-600 hover:underline">Menu</Link>
          <button onClick={handleLogout} className="text-sm text-red-500 hover:underline">Logout</button>
        </div>
      </header>

      <div className="px-4 pt-3 pb-1 flex gap-2 overflow-x-auto">
        {STATUSES.map((s) => (
          <button
            key={s.value}
            onClick={() => setFilter(s.value)}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              filter === s.value ? 'bg-gray-900 text-white' : 'bg-white border hover:bg-gray-50'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="px-4 py-3 space-y-2 pb-8">
        {loading ? (
          <p className="text-center text-gray-400 py-8">Loading...</p>
        ) : orders.length === 0 ? (
          <p className="text-center text-gray-400 py-8">No orders</p>
        ) : (
          orders.map((order) => (
            <Link
              key={order.id}
              to={`/merchant/orders/${order.id}`}
              className="block bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono font-bold text-gray-900">{order.orderNumber}</span>
                <OrderStatusBadge status={order.status} />
              </div>
              <p className="text-sm text-gray-600">{order.customerName}</p>
              <p className="text-orange-600 font-semibold text-sm mt-0.5">{formatTHB(order.totalAmount)}</p>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
