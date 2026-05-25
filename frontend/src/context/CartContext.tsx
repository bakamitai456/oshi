import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { getCart, addToCart, updateQuantity, removeFromCart, clearCart } from '../lib/cart'
import type { CartItem } from '../types'

type CartContextType = {
  items: CartItem[]
  add: (item: CartItem) => void
  update: (id: string, quantity: number) => void
  remove: (id: string) => void
  clear: () => void
  total: number
}

const CartContext = createContext<CartContextType | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(getCart)

  const sync = useCallback(() => setItems(getCart()), [])

  const add = useCallback((item: CartItem) => { addToCart(item); sync() }, [sync])
  const update = useCallback((id: string, qty: number) => { updateQuantity(id, qty); sync() }, [sync])
  const remove = useCallback((id: string) => { removeFromCart(id); sync() }, [sync])
  const clear = useCallback(() => { clearCart(); sync() }, [sync])
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0)

  return (
    <CartContext.Provider value={{ items, add, update, remove, clear, total }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be inside CartProvider')
  return ctx
}
