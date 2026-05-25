import type { CartItem } from '../types'

const KEY = 'oshi_cart'

export function getCart(): CartItem[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as CartItem[]
  } catch {
    return []
  }
}

function saveCart(items: CartItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items))
}

export function addToCart(item: CartItem) {
  const cart = getCart()
  const existing = cart.find((i) => i.id === item.id)
  if (existing) {
    existing.quantity += item.quantity
  } else {
    cart.push({ ...item })
  }
  saveCart(cart)
}

export function updateQuantity(id: string, quantity: number) {
  if (quantity <= 0) {
    removeFromCart(id)
    return
  }
  const cart = getCart()
  const item = cart.find((i) => i.id === id)
  if (item) item.quantity = quantity
  saveCart(cart)
}

export function removeFromCart(id: string) {
  saveCart(getCart().filter((i) => i.id !== id))
}

export function clearCart() {
  localStorage.removeItem(KEY)
}
