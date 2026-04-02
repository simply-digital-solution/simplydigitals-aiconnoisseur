import { useState, useEffect } from 'react'
import { Search, Plus, Trash2, BarChart2, Star, TrendingUp, TrendingDown } from 'lucide-react'
import toast from 'react-hot-toast'
import { useArbitrageurStore } from '../store/arbitrageurStore'
import { arbitrageurApi } from '../../../utils/api'

export default function WatchlistSection() {
  const { watchlist, addToWatchlist, removeFromWatchlist, addToChart, setActiveSection } =
    useArbitrageurStore()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [quotes, setQuotes] = useState({}) // { AAPL: { price, change, changePct } }

  // Debounced search
  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const { data } = await arbitrageurApi.searchTickers(query)
        setResults(data.slice(0, 6))
      } catch {
        toast.error('Search failed')
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  // Fetch live quotes for watchlist items
  useEffect(() => {
    if (!watchlist.length) return
    const symbols = watchlist.map((t) => t.symbol)
    arbitrageurApi
      .getQuotes(symbols)
      .then(({ data }) => setQuotes(data))
      .catch(() => {})
  }, [watchlist])

  function addFromSearch(ticker) {
    addToWatchlist(ticker)
    toast.success(`${ticker.symbol} added to watchlist`)
    setQuery('')
    setResults([])
  }

  function openChart(symbol) {
    addToChart(symbol)
    setActiveSection('charts')
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display font-700 text-ink-50 text-xl mb-1">Watchlist</h2>
        <p className="text-ink-500 text-sm">Track tickers and jump to their charts.</p>
      </div>

      {/* Search */}
      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-500" />
          <input
            className="input pl-9"
            placeholder="Add ticker to watchlist…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {(results.length > 0 || searching) && (
            <div className="absolute top-full left-0 right-0 mt-1 card z-20 overflow-hidden">
              {searching && (
                <div className="px-4 py-3 text-ink-500 text-sm flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-ink-600 border-t-amber-400 rounded-full animate-spin" />
                  Searching…
                </div>
              )}
              {results.map((t) => (
                <div key={t.symbol}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-ink-800 cursor-pointer transition-colors">
                  <div className="flex-1 min-w-0">
                    <span className="font-mono font-600 text-ink-100 text-sm">{t.symbol}</span>
                    <span className="text-ink-500 text-xs ml-2 truncate">{t.name}</span>
                  </div>
                  <button
                    onClick={() => addFromSearch(t)}
                    className="btn-ghost text-amber-400 hover:bg-amber-500/10 text-xs flex-shrink-0">
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Watchlist */}
      {watchlist.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center card">
          <Star className="w-10 h-10 text-ink-700 mb-3" />
          <p className="text-ink-500 text-sm">Your watchlist is empty. Search for a ticker to add one.</p>
        </div>
      ) : (
        <div className="card divide-y divide-ink-800">
          {watchlist.map((ticker) => {
            const q = quotes[ticker.symbol]
            const isUp = q?.changePct >= 0

            return (
              <div key={ticker.symbol} className="flex items-center gap-4 px-4 py-3">
                {/* Icon */}
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                  {isUp
                    ? <TrendingUp className="w-4 h-4 text-amber-400" />
                    : <TrendingDown className="w-4 h-4 text-rose-400" />
                  }
                </div>

                {/* Symbol + name */}
                <div className="flex-1 min-w-0">
                  <p className="font-mono font-600 text-ink-100 text-sm">{ticker.symbol}</p>
                  <p className="text-ink-500 text-xs truncate">{ticker.name}</p>
                </div>

                {/* Quote */}
                {q ? (
                  <div className="text-right flex-shrink-0">
                    <p className="font-mono font-600 text-ink-100 text-sm">${q.price?.toFixed(2)}</p>
                    <p className={`text-xs font-mono ${isUp ? 'text-green-400' : 'text-rose-400'}`}>
                      {isUp ? '+' : ''}{q.changePct?.toFixed(2)}%
                    </p>
                  </div>
                ) : (
                  <div className="w-16 h-8 bg-ink-800 rounded animate-pulse flex-shrink-0" />
                )}

                {/* Open chart */}
                <button
                  onClick={() => openChart(ticker.symbol)}
                  title="Open in chart"
                  className="btn-ghost text-amber-400 hover:bg-amber-500/10 flex-shrink-0">
                  <BarChart2 className="w-3.5 h-3.5" />
                </button>

                {/* Remove */}
                <button
                  onClick={() => removeFromWatchlist(ticker.symbol)}
                  className="btn-ghost text-ink-500 hover:text-rose-400 hover:bg-rose-500/8 flex-shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
