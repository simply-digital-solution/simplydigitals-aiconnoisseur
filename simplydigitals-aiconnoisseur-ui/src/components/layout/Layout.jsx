import { useStore } from '../../store'
import { Cpu, Upload, Table2, BarChart3, Settings2, FlaskConical, LogOut, ChevronRight, UserCircle } from 'lucide-react'

const NAV = [
  { id: 'upload',        icon: Upload,        label: 'Data Upload' },
  { id: 'explorer',      icon: Table2,         label: 'Data Explorer' },
  { id: 'plots',         icon: BarChart3,      label: 'Visualisations' },
  { id: 'preprocessing', icon: Settings2,      label: 'Preprocessing' },
  { id: 'abtesting',     icon: FlaskConical,   label: 'A/B Testing' },
]

export default function Layout({ children }) {
  const { activeSection, setActiveSection, clearAuth, activeDataset, user } = useStore()

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-ink-900 border-r border-ink-700/50 flex flex-col">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-ink-700/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
              <Cpu className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="font-display font-700 text-ink-50 text-sm leading-tight">
                AI<span className="text-gradient-purple">Connoisseur</span>
              </div>
              <div className="text-ink-300 text-xs">ML Analytics</div>
            </div>
          </div>
        </div>

        {/* Active dataset indicator */}
        {activeDataset && (
          <div className="mx-3 mt-3 px-3 py-2.5 bg-purple-500/8 border border-purple-500/20 rounded-xl">
            <div className="text-purple-500 text-xs font-display font-600 uppercase tracking-wider mb-0.5">Active Dataset</div>
            <div className="text-ink-200 text-sm font-mono truncate">{activeDataset.name}</div>
            <div className="text-ink-500 text-xs mt-0.5">{activeDataset.row_count?.toLocaleString()} rows · {activeDataset.column_count} cols</div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ id, icon: Icon, label }) => {
            const isActive = activeSection === id
            const needsDataset = id !== 'upload' && !activeDataset
            return (
              <button key={id} onClick={() => !needsDataset && setActiveSection(id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 group
                  ${isActive
                    ? 'bg-purple-500/25 text-white border border-purple-400/50'
                    : needsDataset
                    ? 'text-white cursor-not-allowed'
                    : 'text-white hover:bg-purple-500/20 hover:border hover:border-purple-400/30'
                  }`}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="font-body flex-1 text-left">{label}</span>
                {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
                {needsDataset && <span className="text-xs text-ink-700">—</span>}
              </button>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-3 border-t border-ink-600 space-y-1">
          {user && (
            <div className="flex items-center gap-3 px-3 py-2.5">
              <UserCircle className="w-5 h-5 text-purple-400 flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-white text-sm font-display font-600 truncate">{user.full_name}</div>
                <div className="text-ink-300 text-xs truncate">{user.email}</div>
              </div>
            </div>
          )}
          <button onClick={clearAuth}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-ink-200 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-200">
            <LogOut className="w-4 h-4" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
