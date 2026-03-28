import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useStore } from './store'
import Layout from './components/layout/Layout'
import LoginPage from './components/layout/LoginPage'
import Dashboard from './components/layout/Dashboard'
import { authApi } from './utils/api'

function ProtectedRoute({ children }) {
  const token = useStore((s) => s.token)
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  const { token, setUser } = useStore()

  useEffect(() => {
    if (token) {
      authApi.me().then(({ data }) => setUser(data)).catch(() => {})
    }
  }, [token])

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
