export type Bindings = {
  DB: D1Database
  R2: R2Bucket
  ASSETS: Fetcher
  MERCHANT_SECRET: string
}

export type MenuItem = {
  id: string
  name: string
  description: string | null
  price: number
  image_key: string | null
  is_available: number
  created_at: string
}

export type Order = {
  id: string
  order_number: string
  customer_name: string
  phone_number: string
  status: 'pending' | 'preparing' | 'ready' | 'done' | 'cancelled'
  total_amount: number
  evidence_key: string | null
  created_at: string
  updated_at: string
}

export type OrderItem = {
  id: string
  order_id: string
  menu_item_id: string
  name: string
  price: number
  quantity: number
}
