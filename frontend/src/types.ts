export type MenuItem = {
  id: string
  name: string
  description: string | null
  price: number
  imageKey: string | null
  isAvailable: boolean
}

export type OrderItem = {
  id: string
  menuItemId: string
  name: string
  price: number
  quantity: number
}

export type Order = {
  id: string
  orderNumber: string
  customerName: string
  phoneNumber: string
  status: 'pending' | 'preparing' | 'ready' | 'done' | 'cancelled'
  totalAmount: number
  items: OrderItem[]
  hasEvidence: boolean
  createdAt: string
}

export type CartItem = {
  id: string
  name: string
  price: number
  quantity: number
  imageKey: string | null
}
