import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, X, Star, TrendingUp, TrendingDown } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { useArbitrageurStore } from '../store/arbitrageurStore'
import { arbitrageurApi } from '../../../utils/api'

const RANGES = ['1D', '5D', '1M', '3M', '1Y', '2Y', '5Y']

// Distinct colours for overlaid tickers
const LINE_COLORS = ['#FBBF24', '#C084FC', '#34D399', '#60A5FA', '#F87171', '#A3E635']

const RANGE_MAP = {
  '1D': 'intraday', '5D': 'intraday',
  '1M': 'history',  '3M': 'history',
  '1Y': 'history',  '2Y': 'history', '5Y': 'history',
}

function formatPrice(v) {
  return v == null ? '' : `$${Number(v).toFixed(2)}`
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="card px-3 py-2 text-xs space-y-1">
      <p className="text-ink-400">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {formatPrice(p.value)}
        </p>
      ))}
    </div>
  )
}

export default function ChartSection() {
  const {
    chartSymbols, chartRange, addToChart, removeFromChart, setChartRange,
    priceCache, setPriceCache, watchlist, addToWatchlist,
  } = useArbitrageurStore()

  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [loadingPrices, setLoadingPrices] = useState(false)
  const [chartData, setChartData] = useState([])

  // Search tickers
  const handleSearch = useCallback(async (q) => {
    if (!q.trim()) { setSearchResults([]); return }
    setSearching(true)
    try {
      const { data } = await arbitrageurApi.searchTickers(q)
      setSearchResults(data.slice(0, 6))
    } catch {
      toast.error('Ticker search failed')
    } finally {
      setSearching(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => handleSearch(query), 300)
    return () => clearTimeout(t)
  }, [query, handleSearch])

  // Fetch prices for all charted symbols whenever symbols or range changes
  useEffect(() => {
    if (!chartSymbols.length) { setChartData([]); return }

    const type = RANGE_MAP[chartRange]

    async function fetchAll() {
      setLoadingPrices(true)
      try {
        const results = await Promise.all(
          chartSymbols.map(async (symbol) => {
            const cached = priceCache[symbol]?.[type]
            if (cached) return { symbol, bars: cached }
            const fetch = type === 'intraday'
              ? arbitrageurApi.getIntraday(symbol)
              : arbitrageurApi.getHistory(symbol, chartRange)
            const { data } = await fetch
            setPriceCache(symbol, type, data)
            return { symbol, bars: data }
          })
        )

        // Merge all series on timestamp key
        const merged = {}
        results.forEach(({ symbol, bars }) => {
          bars.forEach((bar) => {
            const key = bar.ts || bar.date
            if (!merged[key]) merged[key] = { time: key }
            merged[key][symbol] = bar.close
          })
        })
        setChartData(Object.values(merged).sort((a, b) => (a.time > b.time ? 1 : -1)))
      } catch {
        toast.error('Could not load price data')
      } finally {
        setLoadingPrices(false)
      }
    }

    fetchAll()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartSymbols, chartRange])

  function addSymbol(ticker) {
    addToChart(ticker.symbol)
    setQuery('')
    setSearchResults([])
  }

  function addToWl(ticker) {
    addToWatchlist(ticker)
    toast.success(`Added ${ticker.symbol} to watchlist`)
  }

  const isInWatchlist = (symbol) => watchlist.some((t) => t.symbol === symbol)

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display font-700 text-ink-50 text-xl mb-1">Charts</h2>
        <p className="text-ink-500 text-sm">Search and overlay multiple tickers. Up to 5 years of price history.</p>
      </div>

      {/* Search + active symbols */}
      <div className="card p-4 space-y-4">
        <div className="flex gap-3">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-500" />
            <input
              className="input pl-9"
              placeholder="Search ticker (e.g. AAPL, TSLA)…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {/* Dropdown */}
            {(searchResults.length > 0 || searching) && (
              <div className="absolute top-full left-0 right-0 mt-1 card z-20 overflow-hidden">
                {searching && (
                  <div className="px-4 py-3 text-ink-500 text-sm flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-ink-600 border-t-amber-400 rounded-full animate-spin" />
                    Searching…
                  </div>
                )}
                {searchResults.map((t) => (
                  <div key={t.symbol}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-ink-800 cursor-pointer transition-colors">
                    <div className="flex-1 min-w-0">
                      <span className="font-mono font-600 text-ink-100 text-sm">{t.symbol}</span>
                      <span className="text-ink-500 text-xs ml-2 truncate">{t.name}</span>
                    </div>
                    <button
                      onClick={() => addToWl(t)}
                      title="Add to watchlist"
                      className={`btn-ghost text-xs flex-shrink-0 ${isInWatchlist(t.symbol) ? 'text-amber-400' : 'text-ink-500 hover:text-amber-400'}`}>
                      <Star className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => addSymbol(t)}
                      className="btn-ghost text-amber-400 hover:bg-amber-500/10 text-xs flex-shrink-0">
                      <Plus className="w-3.5 h-3.5" />
                      Add to chart
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Active symbol badges */}
        {chartSymbols.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {chartSymbols.map((symbol, i) => (
              <span
                key={symbol}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-600 border"
                style={{ color: LINE_COLORS[i % LINE_COLORS.length], borderColor: `${LINE_COLORS[i % LINE_COLORS.length]}40`, backgroundColor: `${LINE_COLORS[i % LINE_COLORS.length]}12` }}>
                {symbol}
                <button onClick={() => removeFromChart(symbol)} className="hover:opacity-70 transition-opacity">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Range selector */}
      <div className="flex items-center gap-1">
        {RANGES.map((r) => (
          <button
            key={r}
            onClick={() => setChartRange(r)}
            className={`px-3 py-1.5 rounded-lg text-xs font-display font-600 transition-all duration-150
              ${chartRange === r
                ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                : 'text-ink-500 hover:text-ink-200 hover:bg-ink-800'
              }`}>
            {r}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="card p-4">
        {!chartSymbols.length ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <TrendingUp className="w-10 h-10 text-ink-700 mb-3" />
            <p className="text-ink-500 text-sm">Search for a ticker above and add it to the chart.</p>
          </div>
        ) : loadingPrices ? (
          <div className="flex items-center justify-center py-20">
            <span className="w-6 h-6 border-2 border-ink-700 border-t-amber-400 rounded-full animate-spin" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <TrendingDown className="w-8 h-8 text-ink-700 mb-3" />
            <p className="text-ink-500 text-sm">No price data available for this range.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={380}>
            <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="time"
                tick={{ fill: '#5E5E7E', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => {
                  const d = new Date(v)
                  return chartRange === '1D' || chartRange === '5D'
                    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : d.toLocaleDateString([], { month: 'short', day: 'numeric' })
                }}
              />
              <YAxis
                tick={{ fill: '#5E5E7E', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `$${v.toFixed(0)}`}
                width={56}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#9090B0' }} />
              {chartSymbols.map((symbol, i) => (
                <Line
                  key={symbol}
                  type="monotone"
                  dataKey={symbol}
                  stroke={LINE_COLORS[i % LINE_COLORS.length]}
                  dot={false}
                  strokeWidth={2}
                  activeDot={{ r: 4 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
