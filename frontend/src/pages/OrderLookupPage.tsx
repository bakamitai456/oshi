import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { OrderStatusBadge } from '../components/OrderStatusBadge'
import { formatTHB } from '../components/MenuItemCard'
import type { Order } from '../types'

const PHONE_RE = /^0\d{9}$/

export function OrderLookupPage() {
  const [phone, setPhone] = useState('')
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault()
    if (!PHONE_RE.test(phone)) { setError('เบอร์โทรไม่ถูกต้อง (ต้องเป็น 10 หลัก เริ่มต้นด้วย 0)'); return }
    setError('')
    setLoading(true)
    try {
      const data = await api.orders.getByPhone(phone)
      setOrders(data.orders)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่พบข้อมูล')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/" className="text-orange-500">←</Link>
        <h1 className="text-2xl font-bold">ตรวจสอบออเดอร์</h1>
      </div>

      <form onSubmit={handleLookup} className="flex gap-2 mb-6">
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
          placeholder="0812345678"
          inputMode="numeric"
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {loading ? '...' : 'ค้นหา'}
        </button>
      </form>

      {error && <p className="text-red-500 text-sm mb-4 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      {orders !== null && (
        orders.length === 0 ? (
          <p className="text-gray-400 text-center py-8">ไม่พบออเดอร์สำหรับเบอร์นี้</p>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono font-bold text-gray-900">{order.orderNumber}</span>
                  <OrderStatusBadge status={order.status} />
                </div>
                <div className="text-sm text-gray-600 space-y-0.5 mb-2">
                  {order.items.map((i) => (
                    <p key={i.id}>{i.name} × {i.quantity}</p>
                  ))}
                </div>
                <p className="text-orange-600 font-bold">{formatTHB(order.totalAmount)}</p>
                {order.status === 'ready' && (
                  <p className="mt-2 text-green-600 text-sm font-medium">🎉 ออเดอร์พร้อมรับแล้ว!</p>
                )}
                {order.status === 'pending' && (
                  <Link
                    to={`/payment/${order.id}`}
                    className="mt-3 inline-block w-full text-center bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    {order.hasEvidence ? 'อัปโหลดหลักฐานใหม่' : 'อัปโหลดหลักฐานการชำระเงิน'}
                  </Link>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}
