import { useState, useMemo, useEffect } from 'react'
import { useStore } from '../../store'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, LineChart, CartesianGrid,
  Area
} from 'recharts'
import { BarChart3, TrendingUp, ScatterChart as ScatterIcon, Activity, PieChart, X, ZoomIn } from 'lucide-react'

const PLOT_TYPES = [
  { id: 'histogram',    label: 'Histogram',    icon: BarChart3  },
  { id: 'boxplot',      label: 'Box Plot',     icon: Activity   },
  { id: 'scatter',      label: 'Scatter',      icon: ScatterIcon },
  { id: 'distribution', label: 'Distribution', icon: TrendingUp },
  { id: 'pairplot',     label: 'Pair Grid',    icon: PieChart   },
]

const PALETTE = ['#00C98A', '#8B5CF6', '#F59E0B', '#F43F5E', '#1DDBA0', '#A78BFA', '#FBBF24', '#FB7185']

function buildHistogram(values, bins = 20) {
  if (!values || values.length === 0) return []
  const min = Math.min(...values)
  const max = Math.max(...values)
  const size = (max - min) / bins || 1
  const counts = Array(bins).fill(0)
  values.forEach((v) => {
    const i = Math.min(Math.floor((v - min) / size), bins - 1)
    counts[i]++
  })
  return counts.map((count, i) => ({
    bin: (min + i * size).toFixed(2),
    count,
  }))
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="card-glass px-3 py-2 text-xs shadow-xl">
      <p className="text-ink-200 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-mono">
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(3) : p.value}
        </p>
      ))}
    </div>
  )
}

function BoxPlotCard({ col, stats }) {
  const range = stats.max - stats.min || 1
  const pct = (v) => ((v - stats.min) / range * 100).toFixed(1) + '%'
  return (
    <div className="card p-4 space-y-3">
      <div className="font-mono text-purple-400 text-xs font-500">{col}</div>
      <div className="relative h-10 flex items-center">
        {/* whiskers */}
        <div className="absolute h-0.5 bg-ink-500" style={{ left: '0%', right: `${100 - parseFloat(pct(stats.q1))}%` }} />
        <div className="absolute h-0.5 bg-ink-500" style={{ left: pct(stats.q3), right: '0%' }} />
        {/* box */}
        <div className="absolute h-6 bg-violet-500/30 border border-violet-500/60 rounded-sm"
          style={{ left: pct(stats.q1), width: `${parseFloat(pct(stats.q3)) - parseFloat(pct(stats.q1))}%` }} />
        {/* median */}
        <div className="absolute h-6 w-0.5 bg-purple-400"
          style={{ left: pct(stats.median) }} />
        {/* mean dot */}
        <div className="absolute w-2 h-2 rounded-full bg-amber-400 -translate-y-0"
          style={{ left: `calc(${pct(stats.mean)} - 4px)` }} />
      </div>
      <div className="grid grid-cols-5 gap-1 text-center">
        {[['Min', stats.min], ['Q1', stats.q1], ['Med', stats.median], ['Q3', stats.q3], ['Max', stats.max]].map(([l, v]) => (
          <div key={l}>
            <div className="text-ink-600 text-xs">{l}</div>
            <div className="text-ink-300 text-xs font-mono">{v?.toFixed(2)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

const HIST_PAGE_SIZE = 9

export default function PlotsSection() {
  const { columnStats, columns } = useStore()
  const numericCols = columns.filter((c) => columnStats[c]?.isNumeric)

  const [plotType, setPlotType] = useState('histogram')
  const [xCol, setXCol] = useState(numericCols[0] || '')
  const [yCol, setYCol] = useState(numericCols[1] || '')
  const [bins, setBins] = useState(20)
  const [histPage, setHistPage] = useState(0)
  const [zoomedCol, setZoomedCol] = useState(null)
  const [zoomedBins, setZoomedBins] = useState(20)

  const histTotalPages = Math.ceil(numericCols.length / HIST_PAGE_SIZE)
  const histPageCols = numericCols.slice(histPage * HIST_PAGE_SIZE, (histPage + 1) * HIST_PAGE_SIZE)

  useEffect(() => {
    if (!zoomedCol) return
    const onKey = (e) => { if (e.key === 'Escape') setZoomedCol(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zoomedCol])

  const scatterData = useMemo(() => {
    if (!xCol || !yCol) return []
    const vx = columnStats[xCol]?.values || []
    const vy = columnStats[yCol]?.values || []
    const n = Math.min(vx.length, vy.length, 500)
    return Array.from({ length: n }, (_, i) => ({ x: vx[i], y: vy[i] }))
  }, [xCol, yCol, columnStats])

  const distData = useMemo(() => {
    if (!xCol) return []
    const vals = columnStats[xCol]?.values || []
    const sorted = [...vals].sort((a, b) => a - b)
    return sorted.map((v, i) => ({ value: v, cumulative: (i / sorted.length * 100).toFixed(1) }))
      .filter((_, i) => i % Math.max(1, Math.floor(sorted.length / 200)) === 0)
  }, [xCol, columnStats])

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h2 className="font-display text-2xl font-700 text-ink-50">Visualisations</h2>
        <p className="text-ink-200 text-sm mt-0.5">Explore distributions, relationships, and patterns in your data.</p>
      </div>

      {/* Plot type selector */}
      <div className="flex flex-wrap gap-2">
        {PLOT_TYPES.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setPlotType(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-display font-500 border transition-all duration-200
              ${plotType === id
                ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                : 'bg-ink-800/50 text-ink-200 border-ink-600 hover:text-ink-50 hover:border-ink-500'
              }`}>
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4 p-4 bg-ink-900/50 border border-ink-700/40 rounded-xl">
        {['distribution', 'scatter'].includes(plotType) && (
          <div>
            <label className="label">X Column</label>
            <select className="select w-48" value={xCol} onChange={(e) => setXCol(e.target.value)}>
              {numericCols.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}
        {['scatter', 'pairplot'].includes(plotType) && (
          <div>
            <label className="label">Y Column</label>
            <select className="select w-48" value={yCol} onChange={(e) => setYCol(e.target.value)}>
              {numericCols.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}
        {plotType === 'histogram' && (
          <div>
            <label className="label">Bins</label>
            <select className="select w-32" value={bins} onChange={(e) => { setBins(Number(e.target.value)); setHistPage(0) }}>
              {[10, 15, 20, 30, 50].map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* ── Histogram — 3×3 paged grid ── */}
      {plotType === 'histogram' && (
        <div className="animate-fade-in space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-ink-500 text-sm">
              {numericCols.length} numeric columns · {bins} bins each
            </p>
            {histTotalPages > 1 && (
              <span className="text-ink-500 text-xs font-mono">
                Page {histPage + 1} / {histTotalPages}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {histPageCols.map((col, idx) => {
              const data = buildHistogram(columnStats[col]?.values, bins)
              const color = PALETTE[idx % PALETTE.length]
              return (
                <div key={col}
                  onClick={() => { setZoomedCol(col); setZoomedBins(bins) }}
                  className="card p-4 cursor-pointer hover:border-purple-500/40 hover:bg-ink-800/60 transition-all duration-200 group">
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-mono text-xs font-500 truncate" style={{ color }}>{col}</div>
                    <ZoomIn className="w-3.5 h-3.5 text-ink-600 group-hover:text-purple-400 transition-colors flex-shrink-0 ml-2" />
                  </div>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={data} margin={{ top: 0, right: 4, bottom: 0, left: -16 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="bin" tick={{ fill: '#6B6B8A', fontSize: 9, fontFamily: 'JetBrains Mono' }}
                        interval="preserveStartEnd" tickFormatter={(v) => Number(v).toFixed(1)} />
                      <YAxis tick={{ fill: '#6B6B8A', fontSize: 9 }} width={28} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" fill={color} radius={[2, 2, 0, 0]} fillOpacity={0.85} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )
            })}
          </div>

          {histTotalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setHistPage((p) => Math.max(0, p - 1))}
                disabled={histPage === 0}
                className="btn-ghost disabled:opacity-30 disabled:cursor-not-allowed">
                ← Previous
              </button>
              <div className="flex gap-1.5">
                {Array.from({ length: histTotalPages }, (_, i) => (
                  <button key={i} onClick={() => setHistPage(i)}
                    className={`w-2 h-2 rounded-full transition-colors ${i === histPage ? 'bg-purple-400' : 'bg-ink-600 hover:bg-ink-500'}`} />
                ))}
              </div>
              <button
                onClick={() => setHistPage((p) => Math.min(histTotalPages - 1, p + 1))}
                disabled={histPage === histTotalPages - 1}
                className="btn-ghost disabled:opacity-30 disabled:cursor-not-allowed">
                Next →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Box plots ── */}
      {plotType === 'boxplot' && (
        <div className="space-y-4 animate-fade-in">
          <p className="text-ink-500 text-sm">Box plots showing quartiles, median (green line), and mean (amber dot) for all numeric columns.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {numericCols.map((col) => (
              <BoxPlotCard key={col} col={col} stats={columnStats[col]} />
            ))}
          </div>
        </div>
      )}

      {/* ── Scatter ── */}
      {plotType === 'scatter' && xCol && yCol && (
        <div className="card p-6 animate-fade-in">
          <h3 className="font-display font-600 text-ink-100 mb-1">
            Scatter — <span className="text-purple-400 font-mono">{xCol}</span> × <span className="text-violet-400 font-mono">{yCol}</span>
          </h3>
          <p className="text-ink-500 text-xs mb-5">Showing up to 500 points</p>
          <ResponsiveContainer width="100%" height={380}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="x" name={xCol} tick={{ fill: '#B4B4CC', fontSize: 11 }} label={{ value: xCol, fill: '#B4B4CC', fontSize: 12, position: 'insideBottom', offset: -4 }} />
              <YAxis dataKey="y" name={yCol} tick={{ fill: '#B4B4CC', fontSize: 11 }} label={{ value: yCol, fill: '#B4B4CC', fontSize: 12, angle: -90, position: 'insideLeft' }} />
              <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
              <Scatter data={scatterData} fill="#8B5CF6" fillOpacity={0.6} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── CDF / Distribution ── */}
      {plotType === 'distribution' && xCol && (
        <div className="card p-6 animate-fade-in">
          <h3 className="font-display font-600 text-ink-100 mb-1">Cumulative Distribution — <span className="text-purple-400 font-mono">{xCol}</span></h3>
          <p className="text-ink-500 text-xs mb-5">Empirical cumulative distribution function (ECDF)</p>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={distData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="value" tick={{ fill: '#B4B4CC', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                tickFormatter={(v) => Number(v).toFixed(1)} />
              <YAxis tick={{ fill: '#B4B4CC', fontSize: 11 }} tickFormatter={(v) => v + '%'} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="cumulative" stroke="#00C98A" fill="rgba(0,201,138,0.12)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Histogram Zoom Modal ── */}
      {zoomedCol && (() => {
        const color = PALETTE[numericCols.indexOf(zoomedCol) % PALETTE.length]
        const zoomedData = buildHistogram(columnStats[zoomedCol]?.values, zoomedBins)
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => setZoomedCol(null)}>
            {/* backdrop */}
            <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" />

            {/* panel */}
            <div className="relative w-full max-w-3xl card p-6 space-y-5 animate-fade-up"
              onClick={(e) => e.stopPropagation()}>

              {/* header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display font-600 text-ink-100">
                    Histogram — <span className="font-mono" style={{ color }}>{zoomedCol}</span>
                  </h3>
                  <p className="text-ink-500 text-xs mt-0.5">
                    {columnStats[zoomedCol]?.count?.toLocaleString()} values · {zoomedBins} bins
                  </p>
                </div>
                <button onClick={() => setZoomedCol(null)}
                  className="btn-ghost text-ink-400 hover:text-ink-100 p-1.5">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* bins control */}
              <div className="flex items-center gap-3">
                <label className="label mb-0 whitespace-nowrap">Bins</label>
                <input
                  type="range" min={5} max={100} step={5}
                  value={zoomedBins}
                  onChange={(e) => setZoomedBins(Number(e.target.value))}
                  className="flex-1 accent-purple-500"
                />
                <input
                  type="number" min={5} max={100} step={5}
                  value={zoomedBins}
                  onChange={(e) => setZoomedBins(Math.max(5, Math.min(100, Number(e.target.value))))}
                  className="input w-20 text-center font-mono text-sm py-1"
                />
              </div>

              {/* chart */}
              <ResponsiveContainer width="100%" height={340}>
                <BarChart data={zoomedData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="bin" tick={{ fill: '#B4B4CC', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                    interval="preserveStartEnd" tickFormatter={(v) => Number(v).toFixed(2)} />
                  <YAxis tick={{ fill: '#B4B4CC', fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill={color} radius={[3, 3, 0, 0]} fillOpacity={0.9} />
                </BarChart>
              </ResponsiveContainer>

              <p className="text-ink-600 text-xs text-center">Press Esc or click outside to close</p>
            </div>
          </div>
        )
      })()}

      {/* ── Pair Grid ── */}
      {plotType === 'pairplot' && (
        <div className="animate-fade-in space-y-3">
          <p className="text-ink-500 text-sm">Mini scatter plots for each pair of numeric columns (first 5 shown).</p>
          <div className="grid gap-3"
            style={{ gridTemplateColumns: `repeat(${Math.min(numericCols.length, 4)}, 1fr)` }}>
            {numericCols.slice(0, 4).map((c1, i) =>
              numericCols.slice(0, 4).map((c2, j) => {
                if (i === j) {
                  // diagonal: small histogram
                  const hd = buildHistogram(columnStats[c1]?.values || [], 12)
                  return (
                    <div key={`${c1}-${c2}`} className="card p-2 h-36">
                      <div className="text-purple-400 text-xs font-mono mb-1 truncate">{c1}</div>
                      <ResponsiveContainer width="100%" height={90}>
                        <BarChart data={hd} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                          <Bar dataKey="count" fill={PALETTE[i % PALETTE.length]} radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )
                }
                const vx = columnStats[c1]?.values || []
                const vy = columnStats[c2]?.values || []
                const n = Math.min(vx.length, vy.length, 120)
                const data = Array.from({ length: n }, (_, k) => ({ x: vx[k], y: vy[k] }))
                return (
                  <div key={`${c1}-${c2}`} className="card p-2 h-36">
                    <div className="text-ink-600 text-xs font-mono mb-1 truncate">{c2.slice(0,8)} vs {c1.slice(0,8)}</div>
                    <ResponsiveContainer width="100%" height={90}>
                      <ScatterChart>
                        <Scatter data={data} fill={PALETTE[(i + j) % PALETTE.length]} fillOpacity={0.5} />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
