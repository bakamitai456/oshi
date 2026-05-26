import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { formatTHB } from './MenuItemCard'

export function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { items, update, total } = useCart()
  const navigate = useNavigate()

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-xl transition-transform duration-300 ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="p-4 max-h-[80vh] flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">ตะกร้าของคุณ</h2>
            <button onClick={onClose} className="text-gray-400 text-2xl leading-none">&times;</button>
          </div>
          {items.length === 0 ? (
            <p className="text-gray-400 text-center py-8">ตะกร้าว่างเปล่า</p>
          ) : (
            <div className="overflow-y-auto flex-1 divide-y">
              {items.map((item) => (
                <div key={item.id} className="py-2 flex items-center gap-3">
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
          )}
          {items.length > 0 && (
            <div className="pt-3 border-t mt-2">
              <div className="flex justify-between font-semibold mb-3">
                <span>รวม</span>
                <span className="text-orange-600">{formatTHB(total)}</span>
              </div>
              <button
                onClick={() => { onClose(); navigate('/checkout') }}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-semibold transition-colors"
              >
                ดำเนินการสั่งซื้อ
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
