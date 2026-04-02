import { TrendingUp, BarChart2, List, Briefcase, Bell, LogOut, ChevronRight, UserCircle } from 'lucide-react'
import { useArbitrageurStore } from '../store/arbitrageurStore'
import { useStore } from '../../../store'
import ProductHeader from '../../../components/shared/ProductHeader'

const NAV = [
  { id: 'charts',    icon: BarChart2, label: 'Charts' },
  { id: 'watchlist', icon: List,      label: 'Watchlist' },
  { id: 'portfolio', icon: Briefcase, label: 'Portfolio' },
  { id: 'triggers',  icon: Bell,      label: 'Triggers' },
]

export default function ArbitrageurLayout({ children }) {
  const { activeSection, setActiveSection } = useArbitrageurStore()
  const { clearAuth, user } = useStore()

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-ink-900 border-r border-ink-700/50 flex flex-col">
        {/* Back to hub */}
        <div className="px-5 pt-4 pb-2">
          <ProductHeader />
        </div>

        {/* Logo */}
        <div className="px-5 py-4 border-b border-ink-700/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="font-display font-700 text-ink-50 text-sm leading-tight">
                AI<span className="text-amber-400">Arbitrageur</span>
              </div>
              <div className="text-ink-300 text-xs">Trading Analytics</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ id, icon: Icon, label }) => {
            const isActive = activeSection === id
            return (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200
                  ${isActive
                    ? 'bg-amber-500/20 text-white border border-amber-400/40'
                    : 'text-white hover:bg-amber-500/10 hover:border hover:border-amber-400/20'
                  }`}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="font-body flex-1 text-left">{label}</span>
                {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
              </button>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-3 border-t border-ink-600 space-y-1">
          {user && (
            <div className="flex items-center gap-3 px-3 py-2.5">
              <UserCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-white text-sm font-display font-600 truncate">{user.full_name}</div>
                <div className="text-ink-300 text-xs truncate">{user.email}</div>
              </div>
            </div>
          )}
          <button
            onClick={clearAuth}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-ink-200 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-200">
            <LogOut className="w-4 h-4" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
