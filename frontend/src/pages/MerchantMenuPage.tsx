import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { formatTHB } from '../components/MenuItemCard'
import type { MenuItem } from '../types'

type FormState = { name: string; description: string; price: string }

const EMPTY_FORM: FormState = { name: '', description: '', price: '' }

export function MerchantMenuPage() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [actionMsg, setActionMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null)
  const [loadError, setLoadError] = useState('')

  const loadItems = useCallback(() => {
    api.menu.list()
      .then((d) => setItems(d.items))
      .catch(() => setLoadError('ไม่สามารถโหลดเมนูได้'))
  }, [])

  useEffect(() => { loadItems() }, [loadItems])

  function startAdd() {
    setEditingId('new')
    setForm(EMPTY_FORM)
    setImageFile(null)
    setFormError('')
  }

  function startEdit(item: MenuItem) {
    setEditingId(item.id)
    setForm({
      name: item.name,
      description: item.description ?? '',
      price: (item.price / 100).toFixed(2),
    })
    setImageFile(null)
    setFormError('')
  }

  function closeModal() {
    setEditingId(null)
    setFormError('')
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const priceNum = Math.round(parseFloat(form.price) * 100)
    if (!form.name.trim()) { setFormError('กรุณาใส่ชื่อ'); return }
    if (isNaN(priceNum) || priceNum <= 0) { setFormError('ราคาไม่ถูกต้อง'); return }
    setFormError('')
    setSaving(true)

    try {
      let itemId = editingId!

      if (editingId === 'new') {
        const res = await api.menu.create({
          name: form.name.trim(),
          description: form.description.trim() || null,
          price: priceNum,
        })
        itemId = res.id
      } else {
        await api.menu.update(itemId, {
          name: form.name.trim(),
          description: form.description.trim() || null,
          price: priceNum,
        })
      }

      if (imageFile) {
        await api.menu.uploadImage(itemId, imageFile)
      }

      closeModal()
      loadItems()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleAvailability(item: MenuItem) {
    try {
      await api.menu.update(item.id, { isAvailable: !item.isAvailable })
      loadItems()
    } catch {
      setActionMsg({ type: 'error', text: `ไม่สามารถ${item.isAvailable ? 'ปิด' : 'เปิด'}เมนูได้` })
    }
  }

  async function handleDelete(item: MenuItem) {
    if (!confirm(`ลบ "${item.name}" ออกจากเมนู?`)) return
    try {
      await api.menu.delete(item.id)
      loadItems()
    } catch {
      setActionMsg({ type: 'error', text: `ไม่สามารถลบ "${item.name}" ได้` })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm px-4 py-3 flex items-center justify-between">
        <Link to="/merchant/orders" className="text-sm text-blue-600 hover:underline">← Orders</Link>
        <h1 className="text-lg font-bold">Menu</h1>
        <button
          onClick={startAdd}
          className="text-sm bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors"
        >
          + Add
        </button>
      </header>

      {/* Add/Edit Modal */}
      {editingId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
          <form
            onSubmit={handleSave}
            className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-3 shadow-xl"
          >
            <h2 className="font-bold text-lg">{editingId === 'new' ? 'Add Item' : 'Edit Item'}</h2>
            <div>
              <label className="block text-sm font-medium mb-1">ชื่อ *</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="ชื่อเมนู"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">คำอธิบาย</label>
              <input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="คำอธิบาย (ไม่บังคับ)"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">ราคา (บาท) *</label>
              <input
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                placeholder="เช่น 59.00"
                type="number"
                step="0.01"
                min="0.01"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">รูปภาพ (JPEG/PNG)</label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png"
                onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                className="text-sm w-full"
              />
            </div>
            {formError && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{formError}</p>}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={closeModal}
                className="flex-1 border rounded-lg py-2 text-sm hover:bg-gray-50 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-gray-900 text-white rounded-lg py-2 text-sm disabled:opacity-50 hover:bg-gray-700 transition-colors"
              >
                {saving ? 'Saving...' : 'บันทึก'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Item list */}
      <div className="px-4 py-4 space-y-2 pb-8">
        {actionMsg && (
          <div className={`mb-3 px-3 py-2 rounded-lg text-sm flex items-center justify-between ${
            actionMsg.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
          }`}>
            <span>{actionMsg.text}</span>
            <button onClick={() => setActionMsg(null)} className="ml-3 text-lg leading-none">&times;</button>
          </div>
        )}
        {loadError && <p className="text-center text-red-500 py-8">{loadError}</p>}
        {!loadError && items.length === 0 && <p className="text-center text-gray-400 py-8">ยังไม่มีเมนู</p>}
        {items.map((item) => (
          <div key={item.id} className="bg-white rounded-xl p-3 shadow-sm flex items-center gap-3">
            {item.imageKey ? (
              <img
                src={`/api/menu/${item.id}/image`}
                alt={item.name}
                className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                <span className="text-gray-300 text-xs">No img</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className={`font-semibold truncate ${!item.isAvailable ? 'text-gray-400' : ''}`}>{item.name}</p>
              {item.description && <p className="text-xs text-gray-400 truncate">{item.description}</p>}
              <p className="text-sm text-orange-600 font-medium">{formatTHB(item.price)}</p>
              <p className="text-xs text-gray-400">{item.isAvailable ? 'Available' : 'Out of stock'}</p>
            </div>
            <div className="flex flex-col gap-1 text-xs flex-shrink-0">
              <button
                onClick={() => startEdit(item)}
                className="px-3 py-1 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => handleToggleAvailability(item)}
                className={`px-3 py-1 border rounded-lg transition-colors ${
                  item.isAvailable ? 'hover:bg-yellow-50' : 'hover:bg-green-50'
                }`}
              >
                {item.isAvailable ? 'Out' : 'In'}
              </button>
              <button
                onClick={() => handleDelete(item)}
                className="px-3 py-1 border rounded-lg text-red-500 hover:bg-red-50 transition-colors"
              >
                Del
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
