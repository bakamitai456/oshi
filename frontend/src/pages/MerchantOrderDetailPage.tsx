import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../lib/api'
import { OrderStatusBadge } from '../components/OrderStatusBadge'
import { formatTHB } from '../components/MenuItemCard'
import type { Order } from '../types'

type DetailOrder = Order & { evidenceKey: string | null }

const ACTIONS: Record<string, { label: string; next: string; danger?: boolean }[]> = {
  pending: [
    { label: 'เริ่มเตรียม (Preparing)', next: 'preparing' },
    { label: 'ยกเลิกออเดอร์', next: 'cancelled', danger: true },
  ],
  preparing: [
    { label: 'พร้อมรับแล้ว (Ready)', next: 'ready' },
    { label: 'ยกเลิกออเดอร์', next: 'cancelled', danger: true },
  ],
  ready: [
    { label: 'รับแล้ว / สำเร็จ (Done)', next: 'done' },
    { label: 'ยกเลิกออเดอร์', next: 'cancelled', danger: true },
  ],
  done: [],
  cancelled: [],
}

export function MerchantOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [order, setOrder] = useState<DetailOrder | null>(null)
  const [loadError, setLoadError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    if (id) {
      api.merchant.orders.getById(id)
        .then((d) => setOrder(d as DetailOrder))
        .catch((err) => {
          if (err instanceof Error && err.message === 'Unauthorized') navigate('/merchant')
          else setLoadError('ไม่พบออเดอร์')
        })
    }
  }, [id, navigate])

  async function handleAction(next: string) {
    if (!order) return
    setActionLoading(true)
    setActionError('')
    try {
      const res = await api.merchant.orders.updateStatus(order.id, next)
      setOrder((prev) => prev ? { ...prev, status: res.status as Order['status'] } : prev)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setActionLoading(false)
    }
  }

  if (loadError) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500 mb-3">{loadError}</p>
        <Link to="/merchant/orders" className="text-blue-600 underline text-sm">← Back to Orders</Link>
      </div>
    )
  }

  if (!order) return <div className="p-8 text-center text-gray-400">Loading...</div>

  const actions = ACTIONS[order.status] ?? []

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <header className="bg-white shadow-sm px-4 py-3 flex items-center gap-3">
        <Link to="/merchant/orders" className="text-blue-600 text-sm hover:underline">← Orders</Link>
        <span className="text-gray-300">|</span>
        <span className="font-mono font-bold">{order.orderNumber}</span>
        <div className="ml-auto"><OrderStatusBadge status={order.status} /></div>
      </header>

      <div className="px-4 py-4 max-w-lg mx-auto space-y-3">
        {/* Customer info */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="text-xs font-semibold text-gray-400 uppercase mb-2">ลูกค้า</h2>
          <p className="font-semibold">{order.customerName}</p>
          <p className="text-sm text-gray-500">{order.phoneNumber}</p>
        </div>

        {/* Order items */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="text-xs font-semibold text-gray-400 uppercase mb-2">รายการ</h2>
          {order.items.map((i) => (
            <div key={i.id} className="flex justify-between text-sm py-1">
              <span>{i.name} × {i.quantity}</span>
              <span>{formatTHB(i.price * i.quantity)}</span>
            </div>
          ))}
          <div className="flex justify-between font-bold border-t mt-2 pt-2">
            <span>รวม</span>
            <span className="text-orange-600">{formatTHB(order.totalAmount)}</span>
          </div>
        </div>

        {/* Payment evidence */}
        {order.hasEvidence && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="text-xs font-semibold text-gray-400 uppercase mb-2">หลักฐานการชำระ</h2>
            <img
              src={`/api/merchant/orders/${order.id}/evidence`}
              alt="payment evidence"
              className="w-full rounded-lg object-contain max-h-72 bg-gray-50"
              onError={(e) => {
                const target = e.currentTarget
                target.style.display = 'none'
                target.insertAdjacentHTML('afterend', '<p class="text-sm text-gray-400">ไม่สามารถแสดงไฟล์ได้ (PDF หรือไฟล์เสีย)</p>')
              }}
            />
          </div>
        )}

        {/* Actions */}
        {actions.length > 0 && (
          <div className="space-y-2">
            {actionError && (
              <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{actionError}</p>
            )}
            {actions.map((action) => (
              <button
                key={action.next}
                onClick={() => handleAction(action.next)}
                disabled={actionLoading}
                className={`w-full py-3 rounded-xl font-semibold disabled:opacity-50 transition-colors ${
                  action.danger
                    ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                    : 'bg-gray-900 text-white hover:bg-gray-700'
                }`}
              >
                {actionLoading ? '...' : action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
