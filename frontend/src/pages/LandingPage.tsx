import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MenuItemCard, formatTHB } from '../components/MenuItemCard'
import { CartDrawer } from '../components/CartDrawer'
import { useCart } from '../context/CartContext'
import { api } from '../lib/api'
import type { MenuItem, Order } from '../types'

function DesktopCart() {
  const { items, update, total } = useCart()
  const navigate = useNavigate()

  return (
    <aside className="hidden lg:flex flex-col w-80 xl:w-96 shrink-0">
      <div className="sticky top-[61px] bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col max-h-[calc(100vh-77px)]">
        <div className="px-4 pt-4 pb-2 border-b">
          <h2 className="text-lg font-bold">ตะกร้าของคุณ</h2>
        </div>
        {items.length === 0 ? (
          <p className="text-gray-400 text-center py-12 text-sm">ตะกร้าว่างเปล่า</p>
        ) : (
          <>
            <div className="overflow-y-auto flex-1 divide-y px-4">
              {items.map((item) => (
                <div key={item.id} className="py-2.5 flex items-center gap-3">
                  <span className="flex-1 text-sm">{item.name}</span>
                  <span className="text-xs text-gray-500 w-20 text-right">{formatTHB(item.price * item.quantity)}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => update(item.id, item.quantity - 1)}
                      className="w-6 h-6 rounded-full border text-sm flex items-center justify-center hover:bg-gray-50"
                    >−</button>
                    <span className="w-5 text-center text-sm font-medium">{item.quantity}</span>
                    <button
                      onClick={() => update(item.id, item.quantity + 1)}
                      className="w-6 h-6 rounded-full border text-sm flex items-center justify-center hover:bg-gray-50"
                    >+</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4 py-4 border-t">
              <div className="flex justify-between font-semibold mb-3 text-sm">
                <span>รวม</span>
                <span className="text-orange-600">{formatTHB(total)}</span>
              </div>
              <button
                onClick={() => navigate('/checkout')}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-semibold transition-colors text-sm"
              >
                ดำเนินการสั่งซื้อ
              </button>
            </div>
          </>
        )}
      </div>
    </aside>
  )
}

export function LandingPage() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [pendingOrder, setPendingOrder] = useState<Order | null>(null)
  const { items: cartItems, total } = useCart()

  useEffect(() => {
    api.menu.list()
      .then((d) => setItems(d.items))
      .catch(() => setError('ไม่สามารถโหลดเมนูได้'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const savedId = localStorage.getItem('oshi_last_order_id')
    if (!savedId) return
    api.orders.getById(savedId)
      .then((order) => {
        if (order.status === 'pending') {
          setPendingOrder(order)
        } else {
          localStorage.removeItem('oshi_last_order_id')
        }
      })
      .catch(() => localStorage.removeItem('oshi_last_order_id'))
  }, [])

  const cartCount = cartItems.reduce((s, i) => s + i.quantity, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-30 bg-white shadow-sm px-4 py-3 flex items-center">
        <div className="w-1/4">
          <Link to="/" className="text-xl font-bold text-orange-600">oshi</Link>
        </div>
        <div className="flex-1 flex justify-center">
          <h1 className="text-xl font-bold text-gray-900">เมนูอาหาร</h1>
        </div>
        <div className="w-1/4 flex items-center justify-end gap-2">
          <Link
            to="/orders"
            className="text-sm text-orange-500 hover:text-orange-600 font-medium transition-colors"
          >
            ติดตามออเดอร์
          </Link>
          {cartCount > 0 && (
            <button
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden bg-orange-500 hover:bg-orange-600 text-white px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
            >
              ตะกร้า ({cartCount}) · {formatTHB(total)}
            </button>
          )}
        </div>
      </header>

      <div className="flex gap-6 p-4 max-w-6xl mx-auto">
        <main className="flex-1 min-w-0">
          {pendingOrder && (
            <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-amber-800">คุณมีออเดอร์ที่ยังไม่ได้ชำระเงิน</p>
                <p className="text-xs text-amber-600 mt-0.5">
                  หมายเลข <span className="font-mono font-bold">{pendingOrder.orderNumber}</span>
                  {' · '}{formatTHB(pendingOrder.totalAmount)}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  to={`/payment/${pendingOrder.id}`}
                  className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                >
                  ชำระเงิน
                </Link>
                <button
                  onClick={() => { localStorage.removeItem('oshi_last_order_id'); setPendingOrder(null) }}
                  className="text-amber-400 hover:text-amber-600 text-lg leading-none"
                  aria-label="ปิด"
                >
                  ×
                </button>
              </div>
            </div>
          )}
          {loading && <p className="text-center text-gray-400 py-12">กำลังโหลด...</p>}
          {error && <p className="text-center text-red-500 py-12">{error}</p>}
          {!loading && !error && items.length === 0 && (
            <p className="text-center text-gray-400 py-12">ยังไม่มีเมนู</p>
          )}
          {!loading && !error && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {items.map((item) => (
                <MenuItemCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </main>

        <DesktopCart />
      </div>

      <CartDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  )
}
