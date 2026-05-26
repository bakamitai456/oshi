import { Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LandingPage } from './pages/LandingPage'
import { CheckoutPage } from './pages/CheckoutPage'
import { PaymentPage } from './pages/PaymentPage'
import { OrderLookupPage } from './pages/OrderLookupPage'

// Merchant pages will be wired in Task 5c — keep placeholders for now
const MerchantPlaceholder = ({ name }: { name: string }) => (
  <div className="p-8 text-center text-gray-500">{name} — coming in Task 5c</div>
)

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/payment/:id" element={<PaymentPage />} />
      <Route path="/orders" element={<OrderLookupPage />} />
      <Route path="/merchant" element={<MerchantPlaceholder name="Merchant Login" />} />
      <Route path="/merchant/orders" element={<ProtectedRoute><MerchantPlaceholder name="Merchant Orders" /></ProtectedRoute>} />
      <Route path="/merchant/orders/:id" element={<ProtectedRoute><MerchantPlaceholder name="Order Detail" /></ProtectedRoute>} />
      <Route path="/merchant/menu" element={<ProtectedRoute><MerchantPlaceholder name="Menu Management" /></ProtectedRoute>} />
    </Routes>
  )
}
