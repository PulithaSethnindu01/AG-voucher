import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute, PublicOnlyRoute } from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import VouchersPage from './pages/vouchers/VouchersPage'
import VoucherDetailPage from './pages/vouchers/VoucherDetailPage'
import NewVoucherPage from './pages/vouchers/NewVoucherPage'
import UsersPage from './pages/admin/UsersPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <LoginPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicOnlyRoute>
                <RegisterPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <VouchersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/vouchers/new"
            element={
              <ProtectedRoute requireAnyRole={['FIRST_RECEIVER', 'ADMIN']}>
                <NewVoucherPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/vouchers/:id"
            element={
              <ProtectedRoute>
                <VoucherDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute requireAnyRole={['ADMIN', 'SUPERVISOR']}>
                <UsersPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
