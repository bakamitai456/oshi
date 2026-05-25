import { describe, it, expect, beforeEach } from 'vitest'
import { getCart, addToCart, updateQuantity, removeFromCart, clearCart } from './cart'
import type { CartItem } from '../types'

const item: CartItem = { id: 'i1', name: 'ข้าวมันไก่', price: 5000, quantity: 1, imageKey: null }

beforeEach(() => clearCart())

describe('cart', () => {
  it('starts empty', () => expect(getCart()).toHaveLength(0))

  it('adds item', () => {
    addToCart(item)
    expect(getCart()).toHaveLength(1)
    expect(getCart()[0].quantity).toBe(1)
  })

  it('merges duplicate item (increments quantity)', () => {
    addToCart(item)
    addToCart(item)
    expect(getCart()).toHaveLength(1)
    expect(getCart()[0].quantity).toBe(2)
  })

  it('updates quantity', () => {
    addToCart(item)
    updateQuantity('i1', 5)
    expect(getCart()[0].quantity).toBe(5)
  })

  it('removes item', () => {
    addToCart(item)
    removeFromCart('i1')
    expect(getCart()).toHaveLength(0)
  })

  it('clears all items', () => {
    addToCart(item)
    addToCart({ ...item, id: 'i2' })
    clearCart()
    expect(getCart()).toHaveLength(0)
  })
})
