import { useState, useEffect } from 'react'
import { MenuItemCard } from '../components/MenuItemCard'
import { CartDrawer } from '../components/CartDrawer'
import { useCart } from '../context/CartContext'
import { api } from '../lib/api'
import type { MenuItem } from '../types'

export function LandingPage() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { items: cartItems, total } = useCart()

  useEffect(() => {
    api.menu.list()
      .then((d) => setItems(d.items))
      .catch(() => setError('ไม่สามารถโหลดเมนูได้'))
      .finally(() => setLoading(false))
  }, [])

  const cartCount = cartItems.reduce((s, i) => s + i.quantity, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-30 bg-white shadow-sm px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-orange-600">เมนูอาหาร</h1>
        {cartCount > 0 && (
          <button
            onClick={() => setDrawerOpen(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
          >
            ตะกร้า ({cartCount}) · ฿{(total / 100).toFixed(0)}
          </button>
        )}
      </header>

      <main className="p-4 max-w-2xl mx-auto">
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

      <CartDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  )
}
