import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useStore } from './store'
import LoginPage from './components/layout/LoginPage'
import LandingPage from './components/landing/LandingPage'
import AppHub from './components/hub/AppHub'
import { authApi } from './utils/api'
import { PRODUCTS } from './products/registry'

// Create lazy components once at module level — one entry per registered product.
// Adding a product to registry.js automatically creates its route here.
const LazyApps = Object.fromEntries(
  PRODUCTS.map((p) => [p.id, lazy(p.lazy)])
)

function ProtectedRoute({ children }) {
  const token = useStore((s) => s.token)
  return token ? children : <Navigate to="/login" replace />
}

function PageSpinner() {
  return (
    <div className="flex items-center justify-center h-screen bg-ink-950">
      <span className="w-6 h-6 border-2 border-ink-700 border-t-purple-500 rounded-full animate-spin" />
    </div>
  )
}

export default function App() {
  const { token, setUser } = useStore()

  useEffect(() => {
    if (token) {
      authApi.me().then(({ data }) => setUser(data)).catch(() => {})
    }
  }, [token, setUser])

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Product hub — first page after login */}
      <Route path="/app" element={<ProtectedRoute><AppHub /></ProtectedRoute>} />

      {/* One route per registered product — generated from registry */}
      {PRODUCTS.map((p) => {
        const LazyApp = LazyApps[p.id]
        return (
          <Route
            key={p.id}
            path={`${p.path}/*`}
            element={
              <ProtectedRoute>
                <Suspense fallback={<PageSpinner />}>
                  <LazyApp />
                </Suspense>
              </ProtectedRoute>
            }
          />
        )
      })}

      {/* Legacy redirect — keep old /dashboard links working */}
      <Route path="/dashboard" element={<Navigate to="/app/connoisseur" replace />} />
      <Route path="/*" element={<Navigate to="/app" replace />} />
    </Routes>
  )
}
