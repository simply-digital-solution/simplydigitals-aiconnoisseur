import { Cpu, UserCircle, LogOut } from 'lucide-react'
import { useStore } from '../../store'
import { PRODUCTS } from '../../products/registry'
import ProductCard from './ProductCard'

export default function AppHub() {
  const { user, clearAuth } = useStore()

  return (
    <div
      className="min-h-screen bg-ink-950 flex flex-col"
      style={{
        backgroundImage:
          'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(147,51,234,0.08) 0%, transparent 60%)',
      }}>

      {/* Top bar */}
      <header className="border-b border-ink-700/50 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center">
            <Cpu className="w-4 h-4 text-purple-400" />
          </div>
          <span className="font-display font-700 text-ink-50 text-sm">
            Simply Digital <span className="text-ink-400 font-400">Solutions</span>
          </span>
        </div>
        <div className="flex items-center gap-5">
          {user && (
            <div className="flex items-center gap-2 text-ink-300 text-xs">
              <UserCircle className="w-4 h-4" />
              <span>{user.full_name || user.email}</span>
            </div>
          )}
          <button
            onClick={clearAuth}
            className="flex items-center gap-1.5 text-ink-500 hover:text-rose-400 text-xs transition-colors">
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </header>

      {/* Product grid */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-12">
            <h1 className="font-display text-4xl font-700 text-ink-50 mb-3">
              Choose a Product
            </h1>
            <p className="text-ink-400 font-body text-sm">
              Select the application you want to work with.
            </p>
          </div>
          <div className="space-y-4">
            {PRODUCTS.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </main>

      <footer className="text-center text-ink-700 text-xs py-4">
        simplydigitalsolutions · {PRODUCTS.length} products
      </footer>
    </div>
  )
}
