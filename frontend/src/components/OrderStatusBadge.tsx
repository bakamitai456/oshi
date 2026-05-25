const COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  preparing: 'bg-blue-100 text-blue-800',
  ready: 'bg-green-100 text-green-800',
  done: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
}

const LABELS: Record<string, string> = {
  pending: 'รอชำระ',
  preparing: 'กำลังเตรียม',
  ready: 'พร้อมรับ',
  done: 'เสร็จสิ้น',
  cancelled: 'ยกเลิก',
}

export function OrderStatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {LABELS[status] ?? status}
    </span>
  )
}
