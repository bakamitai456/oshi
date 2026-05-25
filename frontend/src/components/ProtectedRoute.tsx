import { type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const isLoggedIn = document.cookie.split(';').some((c) => c.trim() === 'merchant_logged_in=1')
  return isLoggedIn ? <>{children}</> : <Navigate to="/merchant" replace />
}
