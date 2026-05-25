import { Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'

// Placeholder pages — will be replaced in Tasks 5b and 5c
const Placeholder = ({ name }: { name: string }) => (
  <div className="p-8 text-center text-gray-500">{name} — coming soon</div>
)

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Placeholder name="Landing" />} />
      <Route path="/checkout" element={<Placeholder name="Checkout" />} />
      <Route path="/payment/:id" element={<Placeholder name="Payment" />} />
      <Route path="/orders" element={<Placeholder name="Order Lookup" />} />
      <Route path="/merchant" element={<Placeholder name="Merchant Login" />} />
      <Route path="/merchant/orders" element={<ProtectedRoute><Placeholder name="Merchant Orders" /></ProtectedRoute>} />
      <Route path="/merchant/orders/:id" element={<ProtectedRoute><Placeholder name="Order Detail" /></ProtectedRoute>} />
      <Route path="/merchant/menu" element={<ProtectedRoute><Placeholder name="Menu Management" /></ProtectedRoute>} />
    </Routes>
  )
}
