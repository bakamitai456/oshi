import { Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { CustomerHomePage } from './pages/CustomerHomePage'
import { LandingPage } from './pages/LandingPage'
import { CheckoutPage } from './pages/CheckoutPage'
import { PaymentPage } from './pages/PaymentPage'
import { OrderLookupPage } from './pages/OrderLookupPage'
import { MerchantLoginPage } from './pages/MerchantLoginPage'
import { MerchantOrdersPage } from './pages/MerchantOrdersPage'
import { MerchantOrderDetailPage } from './pages/MerchantOrderDetailPage'
import { MerchantMenuPage } from './pages/MerchantMenuPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<CustomerHomePage />} />
      <Route path="/order" element={<LandingPage />} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/payment/:id" element={<PaymentPage />} />
      <Route path="/orders" element={<OrderLookupPage />} />
      <Route path="/merchant" element={<MerchantLoginPage />} />
      <Route path="/merchant/orders" element={<ProtectedRoute><MerchantOrdersPage /></ProtectedRoute>} />
      <Route path="/merchant/orders/:id" element={<ProtectedRoute><MerchantOrderDetailPage /></ProtectedRoute>} />
      <Route path="/merchant/menu" element={<ProtectedRoute><MerchantMenuPage /></ProtectedRoute>} />
    </Routes>
  )
}
