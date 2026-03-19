import { useState, useMemo } from 'react'
import { useStore, computeCorrelation } from '../../store'
import { Table2, Hash, Type, AlertCircle, Link2, Search, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const TABS = ['Overview', 'Data Types', 'Null Analysis', 'Correlation']

function corColor(v) {
  const abs = Math.abs(v)
  if (abs > 0.8) return v > 0 ? '#00C98A' : '#F43F5E'
  if (abs > 0.5) return v > 0 ? '#1DDBA0' : '#FB7185'
  if (abs > 0.2) return v > 0 ? '#5EEABC' : '#FDA4AF'
  return '#3D3D55'
}

function corBg(v) {
  const abs = Math.abs(v)
  const alpha = Math.round(abs * 80 + 10)
  if (v > 0) return `rgba(0,201,138,${abs * 0.5})`
  return `rgba(244,63,94,${abs * 0.5})`
}

export default function ExplorerSection() {
  const { columnStats, columns, activeDataset, parsedData } = useStore()
  const [tab, setTab] = useState('Overview')
  const [search, setSearch] = useState('')

  const filteredCols = useMemo(() =>
    columns.filter((c) => c.toLowerCase().includes(search.toLowerCase())),
    [columns, search]
  )

  const { matrix, columns: numericCols } = useMemo(() =>
    computeCorrelation(columnStats, columns),
    [columnStats, columns]
  )

  const totalNulls = useMemo(() =>
    Object.values(columnStats).reduce((s, c) => s + c.nullCount, 0),
    [columnStats]
  )

  // Summary cards
  const numericCount = columns.filter((c) => columnStats[c]?.isNumeric).length
  const categoricalCount = columns.length - numericCount
  const nullyCols = columns.filter((c) => columnStats[c]?.nullCount > 0).length

  if (!activeDataset) return null

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-700 text-ink-50">Data Explorer</h2>
          <p className="text-ink-400 text-sm mt-0.5">
            Exploring <span className="text-jade-400 font-mono">{activeDataset.name}</span>
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search columns…"
            className="input pl-9 w-56 text-sm py-2" />
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Rows', value: (parsedData?.length || activeDataset.row_count)?.toLocaleString(), color: 'jade' },
          { label: 'Columns', value: columns.length, color: 'violet' },
          { label: 'Numeric', value: numericCount, color: 'amber' },
          { label: 'Null Values', value: totalNulls.toLocaleString(), color: totalNulls > 0 ? 'rose' : 'jade' },
        ].map(({ label, value, color }) => (
          <div key={label} className="stat-card">
            <span className="text-xs font-display font-500 text-ink-500 uppercase tracking-wider">{label}</span>
            <span className={`text-2xl font-display font-700 text-${color}-400`}>{value}</span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-ink-800/60 rounded-xl w-fit">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`tab-item ${tab === t ? 'active' : ''}`}>{t}</button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === 'Overview' && (
        <div className="card overflow-hidden animate-fade-in">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-ink-800/60 border-b border-ink-700/50">
                  {['Column', 'Type', 'Count', 'Unique', 'Nulls', 'Min', 'Max', 'Mean'].map((h) => (
                    <th key={h} className="text-left py-3 px-4 text-ink-400 font-display font-500 text-xs uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredCols.map((col, i) => {
                  const s = columnStats[col]
                  if (!s) return null
                  return (
                    <tr key={col} className={`border-b border-ink-800/60 hover:bg-ink-800/30 transition-colors ${i % 2 === 0 ? '' : 'bg-ink-900/30'}`}>
                      <td className="py-2.5 px-4 font-mono text-jade-400 font-500 text-xs whitespace-nowrap">{col}</td>
                      <td className="py-2.5 px-4">
                        <span className={s.isNumeric ? 'badge-amber' : 'badge-violet'}>{s.dtype}</span>
                      </td>
                      <td className="py-2.5 px-4 text-ink-300 font-mono text-xs">{s.count?.toLocaleString()}</td>
                      <td className="py-2.5 px-4 text-ink-300 font-mono text-xs">{s.unique?.toLocaleString()}</td>
                      <td className="py-2.5 px-4">
                        {s.nullCount > 0
                          ? <span className="badge-rose">{s.nullCount} ({s.nullPct}%)</span>
                          : <span className="text-jade-500 text-xs font-mono">✓ None</span>
                        }
                      </td>
                      <td className="py-2.5 px-4 text-ink-400 font-mono text-xs">{s.isNumeric ? s.min?.toFixed(2) : '—'}</td>
                      <td className="py-2.5 px-4 text-ink-400 font-mono text-xs">{s.isNumeric ? s.max?.toFixed(2) : '—'}</td>
                      <td className="py-2.5 px-4 text-ink-400 font-mono text-xs">{s.isNumeric ? s.mean?.toFixed(2) : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Data Types ── */}
      {tab === 'Data Types' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-in">
          <div className="card p-5 space-y-3">
            <h3 className="font-display font-600 text-ink-100 flex items-center gap-2">
              <Hash className="w-4 h-4 text-amber-400" /> Numeric Columns
            </h3>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {columns.filter((c) => columnStats[c]?.isNumeric).map((col) => {
                const s = columnStats[col]
                return (
                  <div key={col} className="flex items-center gap-3 py-2 px-3 bg-ink-800/50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-amber-400 text-xs font-500 truncate">{col}</div>
                      <div className="text-ink-500 text-xs mt-0.5">
                        μ={s.mean?.toFixed(2)} · σ={s.std?.toFixed(2)} · [{s.min?.toFixed(1)}, {s.max?.toFixed(1)}]
                      </div>
                    </div>
                    <span className="badge-amber flex-shrink-0">float64</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="card p-5 space-y-3">
            <h3 className="font-display font-600 text-ink-100 flex items-center gap-2">
              <Type className="w-4 h-4 text-violet-400" /> Categorical Columns
            </h3>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {columns.filter((c) => !columnStats[c]?.isNumeric).map((col) => {
                const s = columnStats[col]
                return (
                  <div key={col} className="flex items-center gap-3 py-2 px-3 bg-ink-800/50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-violet-400 text-xs font-500 truncate">{col}</div>
                      <div className="text-ink-500 text-xs mt-0.5">
                        {s.unique} unique · samples: {s.sample?.slice(0,3).join(', ')}
                      </div>
                    </div>
                    <span className="badge-violet flex-shrink-0">string</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Type distribution bar */}
          <div className="card p-5 lg:col-span-2">
            <h3 className="font-display font-600 text-ink-100 mb-4">Type Distribution</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={filteredCols.slice(0, 20).map((c) => ({
                name: c.length > 12 ? c.slice(0, 12) + '…' : c,
                unique: columnStats[c]?.unique || 0,
                type: columnStats[c]?.isNumeric ? 1 : 0,
              }))}>
                <XAxis dataKey="name" tick={{ fill: '#6B6B8A', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                <YAxis tick={{ fill: '#6B6B8A', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#1A1A24', border: '1px solid #2E2E42', borderRadius: 8, fontFamily: 'DM Sans' }} />
                <Bar dataKey="unique" radius={[4, 4, 0, 0]}>
                  {filteredCols.slice(0, 20).map((c) => (
                    <Cell key={c} fill={columnStats[c]?.isNumeric ? '#F59E0B' : '#8B5CF6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Null Analysis ── */}
      {tab === 'Null Analysis' && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-3 gap-4">
            <div className="stat-card">
              <span className="text-xs font-display text-ink-500 uppercase tracking-wider">Columns with Nulls</span>
              <span className="text-2xl font-display font-700 text-rose-400">{nullyCols}</span>
            </div>
            <div className="stat-card">
              <span className="text-xs font-display text-ink-500 uppercase tracking-wider">Total Null Cells</span>
              <span className="text-2xl font-display font-700 text-amber-400">{totalNulls.toLocaleString()}</span>
            </div>
            <div className="stat-card">
              <span className="text-xs font-display text-ink-500 uppercase tracking-wider">Complete Columns</span>
              <span className="text-2xl font-display font-700 text-jade-400">{columns.length - nullyCols}</span>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="font-display font-600 text-ink-100 mb-4">Null % per Column</h3>
            <div className="space-y-2.5">
              {filteredCols.map((col) => {
                const s = columnStats[col]
                const pct = parseFloat(s?.nullPct || 0)
                return (
                  <div key={col} className="flex items-center gap-3">
                    <div className="font-mono text-xs text-ink-400 w-32 truncate flex-shrink-0">{col}</div>
                    <div className="flex-1 bg-ink-800 rounded-full h-2">
                      <div className="h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          background: pct > 30 ? '#F43F5E' : pct > 10 ? '#F59E0B' : '#00C98A',
                        }} />
                    </div>
                    <div className={`text-xs font-mono w-16 text-right flex-shrink-0
                      ${pct > 30 ? 'text-rose-400' : pct > 10 ? 'text-amber-400' : 'text-jade-400'}`}>
                      {s?.nullCount || 0} ({pct}%)
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Correlation ── */}
      {tab === 'Correlation' && (
        <div className="space-y-4 animate-fade-in">
          <div className="card p-2 overflow-auto">
            <table className="text-xs font-mono">
              <thead>
                <tr>
                  <th className="p-2 text-left text-ink-500 w-32"></th>
                  {numericCols.map((c) => (
                    <th key={c} className="p-2 text-ink-400 whitespace-nowrap" style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)', height: 100 }}>
                      {c.length > 14 ? c.slice(0, 14) + '…' : c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {numericCols.map((r) => (
                  <tr key={r}>
                    <td className="p-2 text-ink-400 whitespace-nowrap font-mono text-xs pr-4">{r.length > 14 ? r.slice(0, 14) + '…' : r}</td>
                    {numericCols.map((c) => {
                      const v = matrix[r]?.[c] ?? 0
                      return (
                        <td key={c} title={`${r} × ${c}: ${v}`}
                          className="p-0 text-center"
                          style={{ background: corBg(v), width: 48, height: 48 }}>
                          <div className="w-12 h-12 flex items-center justify-center text-xs font-mono"
                            style={{ color: Math.abs(v) > 0.5 ? '#fff' : '#9494B0' }}>
                            {v.toFixed(2)}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Top correlations */}
          <div className="card p-5">
            <h3 className="font-display font-600 text-ink-100 mb-4">Strongest Correlations</h3>
            <div className="space-y-2">
              {(() => {
                const pairs = []
                numericCols.forEach((r, i) => {
                  numericCols.forEach((c, j) => {
                    if (j <= i) return
                    pairs.push({ r, c, v: matrix[r]?.[c] ?? 0 })
                  })
                })
                return pairs
                  .sort((a, b) => Math.abs(b.v) - Math.abs(a.v))
                  .slice(0, 8)
                  .map(({ r, c, v }) => (
                    <div key={`${r}-${c}`} className="flex items-center gap-3">
                      <span className="font-mono text-xs text-ink-400 flex-1 truncate">{r} × {c}</span>
                      <div className="flex items-center gap-1.5">
                        {v > 0.2 ? <TrendingUp className="w-3.5 h-3.5 text-jade-400" /> :
                         v < -0.2 ? <TrendingDown className="w-3.5 h-3.5 text-rose-400" /> :
                         <Minus className="w-3.5 h-3.5 text-ink-500" />}
                        <span className="font-mono text-sm font-500" style={{ color: corColor(v) }}>{v.toFixed(3)}</span>
                      </div>
                    </div>
                  ))
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
