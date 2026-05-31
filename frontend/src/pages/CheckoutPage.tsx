import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { api } from '../lib/api'
import { formatTHB } from '../components/MenuItemCard'

const PHONE_RE = /^0\d{9}$/

export function CheckoutPage() {
  const { items, total, clear } = useCart()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [pickupLocation, setPickupLocation] = useState('')

  useEffect(() => {
    api.settings.get().then((s) => setPickupLocation(s.pickupLocation)).catch(() => {})
  }, [])

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">ตะกร้าว่างเปล่า</p>
        <Link to="/" className="text-orange-500 underline">กลับหน้าเมนู</Link>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('กรุณาใส่ชื่อ'); return }
    if (!PHONE_RE.test(phone)) { setError('เบอร์โทรไม่ถูกต้อง (ตัวอย่าง: 0812345678)'); return }
    setError('')
    setLoading(true)
    try {
      const { orderId } = await api.orders.create({
        customerName: name.trim(),
        phoneNumber: phone,
        items: items.map((i) => ({ menuItemId: i.id, name: i.name, price: i.price, quantity: i.quantity })),
      })
      clear()
      localStorage.setItem('oshi_last_order_id', orderId)
      navigate(`/payment/${orderId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/" className="text-orange-500">←</Link>
        <h1 className="text-2xl font-bold">ยืนยันคำสั่งซื้อ</h1>
      </div>

      <div className="bg-white rounded-xl p-4 mb-4 shadow-sm">
        <h2 className="font-semibold mb-2 text-sm text-gray-600">รายการ</h2>
        {items.map((i) => (
          <div key={i.id} className="flex justify-between text-sm py-1">
            <span>{i.name} × {i.quantity}</span>
            <span>{formatTHB(i.price * i.quantity)}</span>
          </div>
        ))}
        <div className="flex justify-between font-bold border-t mt-2 pt-2">
          <span>รวม</span>
          <span className="text-orange-600">{formatTHB(total)}</span>
        </div>
      </div>

      {pickupLocation && (
        <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 mb-4 flex items-start gap-2">
          <span className="text-orange-500 mt-0.5">📍</span>
          <div>
            <p className="text-xs font-semibold text-orange-700 mb-0.5">จุดรับสินค้า</p>
            <p className="text-sm text-orange-800">{pickupLocation}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl p-4 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">ชื่อ *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            placeholder="ชื่อของคุณ"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">เบอร์โทรศัพท์ *</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            placeholder="0812345678"
            inputMode="numeric"
          />
          <p className="text-xs text-gray-400 mt-1">10 หลัก เริ่มต้นด้วย 0</p>
        </div>
        {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white py-3 rounded-xl font-semibold transition-colors"
        >
          {loading ? 'กำลังสั่ง...' : 'สั่งซื้อ'}
        </button>
      </form>
    </div>
  )
}
