import { useState, useMemo } from 'react'
import { useStore } from '../../store'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, LineChart, Line, CartesianGrid,
  BoxPlot, ComposedChart, Area, Cell, Legend
} from 'recharts'
import { BarChart3, TrendingUp, ScatterChart as ScatterIcon, Activity, PieChart } from 'lucide-react'

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

function buildBoxData(stats) {
  return {
    min: stats.min,
    q1: stats.q1,
    median: stats.median,
    q3: stats.q3,
    max: stats.max,
    mean: stats.mean,
  }
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="card-glass px-3 py-2 text-xs shadow-xl">
      <p className="text-ink-400 mb-1">{label}</p>
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
      <div className="font-mono text-jade-400 text-xs font-500">{col}</div>
      <div className="relative h-10 flex items-center">
        {/* whiskers */}
        <div className="absolute h-0.5 bg-ink-500" style={{ left: '0%', right: `${100 - parseFloat(pct(stats.q1))}%` }} />
        <div className="absolute h-0.5 bg-ink-500" style={{ left: pct(stats.q3), right: '0%' }} />
        {/* box */}
        <div className="absolute h-6 bg-violet-500/30 border border-violet-500/60 rounded-sm"
          style={{ left: pct(stats.q1), width: `${parseFloat(pct(stats.q3)) - parseFloat(pct(stats.q1))}%` }} />
        {/* median */}
        <div className="absolute h-6 w-0.5 bg-jade-400"
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

export default function PlotsSection() {
  const { columnStats, columns } = useStore()
  const numericCols = columns.filter((c) => columnStats[c]?.isNumeric)

  const [plotType, setPlotType] = useState('histogram')
  const [xCol, setXCol] = useState(numericCols[0] || '')
  const [yCol, setYCol] = useState(numericCols[1] || '')
  const [bins, setBins] = useState(20)

  const histData = useMemo(() =>
    xCol ? buildHistogram(columnStats[xCol]?.values, bins) : [],
    [xCol, bins, columnStats]
  )

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
        <p className="text-ink-400 text-sm mt-0.5">Explore distributions, relationships, and patterns in your data.</p>
      </div>

      {/* Plot type selector */}
      <div className="flex flex-wrap gap-2">
        {PLOT_TYPES.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setPlotType(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-display font-500 border transition-all duration-200
              ${plotType === id
                ? 'bg-jade-500/15 text-jade-400 border-jade-500/30'
                : 'bg-ink-800/50 text-ink-400 border-ink-700/50 hover:text-ink-200 hover:border-ink-600'
              }`}>
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4 p-4 bg-ink-900/50 border border-ink-700/40 rounded-xl">
        {['histogram', 'distribution', 'boxplot', 'scatter'].includes(plotType) && (
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
            <select className="select w-32" value={bins} onChange={(e) => setBins(Number(e.target.value))}>
              {[10, 15, 20, 30, 50].map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* ── Histogram ── */}
      {plotType === 'histogram' && xCol && (
        <div className="card p-6 animate-fade-in">
          <h3 className="font-display font-600 text-ink-100 mb-1">Histogram — <span className="text-jade-400 font-mono">{xCol}</span></h3>
          <p className="text-ink-500 text-xs mb-5">Distribution of values across {bins} equal-width bins</p>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={histData} margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="bin" tick={{ fill: '#6B6B8A', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
              <YAxis tick={{ fill: '#6B6B8A', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill="#00C98A" radius={[3, 3, 0, 0]} fillOpacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
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
            Scatter — <span className="text-jade-400 font-mono">{xCol}</span> × <span className="text-violet-400 font-mono">{yCol}</span>
          </h3>
          <p className="text-ink-500 text-xs mb-5">Showing up to 500 points</p>
          <ResponsiveContainer width="100%" height={380}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="x" name={xCol} tick={{ fill: '#6B6B8A', fontSize: 11 }} label={{ value: xCol, fill: '#9494B0', fontSize: 12, position: 'insideBottom', offset: -4 }} />
              <YAxis dataKey="y" name={yCol} tick={{ fill: '#6B6B8A', fontSize: 11 }} label={{ value: yCol, fill: '#9494B0', fontSize: 12, angle: -90, position: 'insideLeft' }} />
              <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
              <Scatter data={scatterData} fill="#8B5CF6" fillOpacity={0.6} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── CDF / Distribution ── */}
      {plotType === 'distribution' && xCol && (
        <div className="card p-6 animate-fade-in">
          <h3 className="font-display font-600 text-ink-100 mb-1">Cumulative Distribution — <span className="text-jade-400 font-mono">{xCol}</span></h3>
          <p className="text-ink-500 text-xs mb-5">Empirical cumulative distribution function (ECDF)</p>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={distData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="value" tick={{ fill: '#6B6B8A', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                tickFormatter={(v) => Number(v).toFixed(1)} />
              <YAxis tick={{ fill: '#6B6B8A', fontSize: 11 }} tickFormatter={(v) => v + '%'} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="cumulative" stroke="#00C98A" fill="rgba(0,201,138,0.12)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

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
                      <div className="text-jade-400 text-xs font-mono mb-1 truncate">{c1}</div>
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
