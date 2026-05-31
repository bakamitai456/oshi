import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../lib/api'
import { formatTHB } from '../components/MenuItemCard'
import { PageHeader } from '../components/PageHeader'
import type { Order } from '../types'

const MAX_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf']

export function PaymentPage() {
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [loadError, setLoadError] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState('')
  const [uploaded, setUploaded] = useState(false)
  const [reupload, setReupload] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (id) {
      api.orders.getById(id)
        .then(setOrder)
        .catch(() => setLoadError('ไม่พบออเดอร์นี้'))
    }
  }, [id])

  if (loadError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-center px-4">
        <p className="text-red-500">{loadError}</p>
        <Link to="/order" className="text-orange-500 underline">กลับหน้าเมนู</Link>
      </div>
    )
  }

  if (!order) {
    return <div className="p-8 text-center text-gray-400">กำลังโหลด...</div>
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    setFileError('')
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file) { setFileError('กรุณาเลือกไฟล์'); return }
    if (!ALLOWED_TYPES.includes(file.type)) { setFileError('รองรับเฉพาะ JPEG, PNG, PDF'); return }
    if (file.size > MAX_SIZE) { setFileError(`ไฟล์ใหญ่เกิน 5 MB (ไฟล์ของคุณ: ${(file.size / 1024 / 1024).toFixed(1)} MB)`); return }

    setFileError('')
    setUploading(true)
    try {
      await api.orders.uploadEvidence(order!.id, file)
      setUploaded(true)
    } catch (err) {
      setFileError(err instanceof Error ? err.message : 'อัปโหลดไม่สำเร็จ')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="ชำระเงิน"
        right={<Link to="/orders" className="text-sm text-orange-500 hover:text-orange-600 transition-colors">ติดตามออเดอร์</Link>}
      />
      <div className="max-w-lg mx-auto px-4 py-6">
      <p className="text-gray-500 mb-5 text-sm">
        หมายเลขออเดอร์:{' '}
        <span className="font-mono font-bold text-gray-900 bg-yellow-100 px-1.5 py-0.5 rounded">
          {order.orderNumber}
        </span>
      </p>

      <div className="bg-white rounded-xl p-4 shadow-sm mb-4 text-center">
        <p className="text-sm text-gray-500 mb-3">สแกน QR PromptPay เพื่อโอนเงิน</p>
        <img src="/promptpay-qr.png" alt="PromptPay QR" className="mx-auto w-52 h-52 object-contain" />
        <p className="mt-3 text-3xl font-bold text-orange-600">{formatTHB(order.totalAmount)}</p>
        <p className="text-xs text-gray-400 mt-1">กรุณาโอนตามยอดที่แสดง</p>
      </div>

      {uploaded && !reupload ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
          <p className="text-green-700 font-bold text-lg">ส่งหลักฐานสำเร็จ ✓</p>
          <p className="text-sm text-green-600 mt-2">
            หมายเลขออเดอร์ของคุณ:{' '}
            <span className="font-mono font-bold">{order.orderNumber}</span>
          </p>
          <p className="text-xs text-gray-400 mt-2">แสดงเลขนี้เมื่อมารับที่ร้าน</p>
          <div className="mt-4 flex flex-col gap-2 items-center">
            <Link to="/orders" className="text-orange-500 underline text-sm">
              ติดตามออเดอร์
            </Link>
            <button
              onClick={() => setReupload(true)}
              className="text-gray-400 underline text-xs"
            >
              อัปโหลดหลักฐานใหม่
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleUpload} className="bg-white rounded-xl p-4 shadow-sm space-y-4">
          <p className="font-semibold text-sm">
            {order.hasEvidence ? 'อัปโหลดหลักฐานใหม่' : 'อัปโหลดหลักฐานการโอนเงิน'}
          </p>
          {order.hasEvidence && (
            <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
              มีหลักฐานเดิมอยู่แล้ว — อัปโหลดไฟล์ใหม่เพื่อแทนที่
            </p>
          )}
          <p className="text-xs text-gray-400">รองรับ: JPEG, PNG, PDF ขนาดไม่เกิน 5 MB</p>
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            onChange={handleFileChange}
            className="w-full text-sm file:mr-3 file:py-1 file:px-3 file:rounded-full file:border-0 file:bg-orange-50 file:text-orange-700"
          />
          {fileError && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{fileError}</p>}
          <button
            type="submit"
            disabled={uploading || !file}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white py-3 rounded-xl font-semibold transition-colors"
          >
            {uploading ? 'กำลังอัปโหลด...' : 'ส่งหลักฐาน'}
          </button>
        </form>
      )}
      </div>
    </div>
  )
}
