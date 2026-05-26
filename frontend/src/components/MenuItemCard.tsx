import { useCart } from '../context/CartContext'
import type { MenuItem } from '../types'

export function formatTHB(satang: number): string {
  return `฿${(satang / 100).toFixed(2)}`
}

export function MenuItemCard({ item }: { item: MenuItem }) {
  const { add } = useCart()
  return (
    <div className={`rounded-xl border bg-white shadow-sm overflow-hidden flex flex-col ${!item.isAvailable ? 'opacity-50' : ''}`}>
      {item.imageKey ? (
        <img src={`/api/menu/${item.id}/image`} alt={item.name} className="h-40 w-full object-cover" />
      ) : (
        <div className="h-40 w-full bg-gray-100 flex items-center justify-center text-gray-400 text-sm">ไม่มีรูป</div>
      )}
      <div className="p-3 flex flex-col gap-1 flex-1">
        <p className="font-semibold text-gray-900 leading-tight">{item.name}</p>
        {item.description && <p className="text-xs text-gray-500 line-clamp-2">{item.description}</p>}
        <p className="text-orange-600 font-bold mt-auto">{formatTHB(item.price)}</p>
        {item.isAvailable ? (
          <button
            onClick={() => add({ id: item.id, name: item.name, price: item.price, quantity: 1, imageKey: item.imageKey })}
            className="mt-2 w-full bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white rounded-lg py-1.5 text-sm font-medium transition-colors"
          >
            เพิ่มลงตะกร้า
          </button>
        ) : (
          <p className="mt-2 text-center text-sm text-gray-400 py-1.5">หมดชั่วคราว</p>
        )}
      </div>
    </div>
  )
}
