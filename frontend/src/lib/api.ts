import type { MenuItem, Order } from '../types'

const BASE = '/api'

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText })) as { error: string }
    throw new Error(err.error)
  }
  return res.json() as Promise<T>
}

export const api = {
  menu: {
    list: () => req<{ items: MenuItem[] }>('/menu'),
    create: (data: { name: string; description?: string | null; price: number; imageKey?: string | null }) =>
      req<{ id: string }>('/merchant/menu', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<{ name: string; description: string | null; price: number; imageKey: string | null; isAvailable: boolean }>) =>
      req<{ ok: boolean }>(`/merchant/menu/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) =>
      req<{ ok: boolean }>(`/merchant/menu/${id}`, { method: 'DELETE' }),
    uploadImage: (id: string, file: File) =>
      fetch(`${BASE}/merchant/menu/${id}/image`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': file.type },
        body: file,
      }).then(async (r) => {
        if (!r.ok) {
          const e = await r.json().catch(() => ({ error: r.statusText })) as { error: string }
          throw new Error(e.error)
        }
        return r.json() as Promise<{ imageKey: string }>
      }),
  },
  orders: {
    create: (data: { customerName: string; phoneNumber: string; items: { menuItemId: string; name: string; price: number; quantity: number }[] }) =>
      req<{ orderId: string; orderNumber: string }>('/orders', { method: 'POST', body: JSON.stringify(data) }),
    getById: (id: string) => req<Order>(`/orders/${id}`),
    getByPhone: (phone: string) => req<{ orders: Order[] }>(`/orders?phone=${encodeURIComponent(phone)}`),
    uploadEvidence: (orderId: string, file: File) =>
      fetch(`${BASE}/orders/${orderId}/evidence`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': file.type },
        body: file,
      }).then(async (r) => {
        if (!r.ok) {
          const e = await r.json().catch(() => ({ error: r.statusText })) as { error: string }
          throw new Error(e.error)
        }
        return r.json() as Promise<{ ok: boolean }>
      }),
  },
  merchant: {
    login: (secret: string) =>
      req<{ ok: boolean }>('/merchant/login', { method: 'POST', body: JSON.stringify({ secret }) }),
    logout: () =>
      req<{ ok: boolean }>('/merchant/logout', { method: 'POST' }),
    orders: {
      list: (status?: string) =>
        req<{ orders: Order[] }>(`/merchant/orders${status ? `?status=${encodeURIComponent(status)}` : ''}`),
      getById: (id: string) =>
        req<Order & { phoneNumber: string; evidenceKey: string | null }>(`/merchant/orders/${id}`),
      updateStatus: (id: string, status: string) =>
        req<{ ok: boolean; status: string }>(`/merchant/orders/${id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        }),
    },
  },
  settings: {
    get: () => req<{ pickupLocation: string }>('/settings'),
  },
}
