import { useState, useEffect } from 'react'
import { Plus, TrendingUp, TrendingDown, Briefcase, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useArbitrageurStore } from '../store/arbitrageurStore'
import { arbitrageurApi } from '../../../utils/api'

const EMPTY_TRADE = { symbol: '', side: 'buy', qty: '', price: '' }

function pnlColor(v) {
  if (v > 0) return 'text-green-400'
  if (v < 0) return 'text-rose-400'
  return 'text-ink-400'
}

export default function PortfolioSection() {
  const { portfolio, setPortfolio } = useArbitrageurStore()
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_TRADE)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    arbitrageurApi
      .getPortfolio()
      .then(({ data }) => setPortfolio(data))
      .catch(() => toast.error('Could not load portfolio'))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleTrade(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await arbitrageurApi.executeTrade({
        symbol: form.symbol.toUpperCase(),
        side: form.side,
        qty: Number(form.qty),
        price: Number(form.price),
      })
      toast.success(`${form.side === 'buy' ? 'Bought' : 'Sold'} ${form.qty} × ${form.symbol.toUpperCase()}`)
      const { data } = await arbitrageurApi.getPortfolio()
      setPortfolio(data)
      setForm(EMPTY_TRADE)
      setShowForm(false)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Trade failed')
    } finally {
      setSubmitting(false)
    }
  }

  // Totals
  const totalValue = portfolio.reduce((s, p) => s + (p.current_value ?? 0), 0)
  const totalPnl   = portfolio.reduce((s, p) => s + (p.pnl ?? 0), 0)
  const totalPct   = portfolio.reduce((s, p) => s + (p.pnl_pct ?? 0), 0) / (portfolio.length || 1)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-700 text-ink-50 text-xl mb-1">Portfolio</h2>
          <p className="text-ink-500 text-sm">Track your positions and P&amp;L in real time.</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="btn-ghost text-amber-400 hover:bg-amber-500/10 border border-amber-500/20">
          <Plus className="w-3.5 h-3.5" />
          Trade
        </button>
      </div>

      {/* Trade form */}
      {showForm && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-600 text-ink-100 text-sm">New Trade</h3>
            <button onClick={() => setShowForm(false)} className="text-ink-500 hover:text-ink-200">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleTrade} className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Symbol</label>
              <input className="input font-mono uppercase" placeholder="AAPL"
                value={form.symbol} onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Side</label>
              <select className="input" value={form.side} onChange={(e) => setForm((f) => ({ ...f, side: e.target.value }))}>
                <option value="buy">Buy</option>
                <option value="sell">Sell</option>
              </select>
            </div>
            <div>
              <label className="label">Quantity</label>
              <input className="input" type="number" min="0.0001" step="any" placeholder="10"
                value={form.qty} onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Price (USD)</label>
              <input className="input" type="number" min="0.01" step="any" placeholder="150.00"
                value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} required />
            </div>
            <button type="submit" disabled={submitting}
              className="col-span-2 btn-primary justify-center disabled:opacity-50">
              {submitting ? 'Submitting…' : `Confirm ${form.side}`}
            </button>
          </form>
        </div>
      )}

      {/* Summary cards */}
      {portfolio.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Value',   value: `$${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: 'text-ink-100' },
            { label: 'Total P&L',     value: `${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)}`, color: pnlColor(totalPnl) },
            { label: 'Avg Return',    value: `${totalPct >= 0 ? '+' : ''}${totalPct.toFixed(2)}%`, color: pnlColor(totalPct) },
          ].map(({ label, value, color }) => (
            <div key={label} className="card p-4">
              <p className="text-ink-500 text-xs mb-1">{label}</p>
              <p className={`font-mono font-700 text-lg ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Positions table */}
      {loading ? (
        <div className="flex items-center gap-2 text-ink-500 text-sm py-6">
          <span className="w-4 h-4 border-2 border-ink-700 border-t-amber-400 rounded-full animate-spin" />
          Loading positions…
        </div>
      ) : portfolio.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 card text-center">
          <Briefcase className="w-10 h-10 text-ink-700 mb-3" />
          <p className="text-ink-500 text-sm">No positions yet. Use the Trade button to record a buy or sell.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-800">
                {['Symbol', 'Qty', 'Avg Cost', 'Current', 'Value', 'P&L', 'P&L %'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs text-ink-500 font-display font-600 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-800">
              {portfolio.map((pos) => {
                const isUp = (pos.pnl ?? 0) >= 0
                return (
                  <tr key={pos.symbol} className="hover:bg-ink-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                          {isUp
                            ? <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                            : <TrendingDown className="w-3.5 h-3.5 text-rose-400" />}
                        </div>
                        <span className="font-mono font-600 text-ink-100">{pos.symbol}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-ink-300">{pos.qty}</td>
                    <td className="px-4 py-3 font-mono text-ink-300">${pos.avg_cost?.toFixed(2)}</td>
                    <td className="px-4 py-3 font-mono text-ink-100">${pos.current_price?.toFixed(2)}</td>
                    <td className="px-4 py-3 font-mono text-ink-100">${pos.current_value?.toFixed(2)}</td>
                    <td className={`px-4 py-3 font-mono ${pnlColor(pos.pnl)}`}>
                      {pos.pnl >= 0 ? '+' : ''}${pos.pnl?.toFixed(2)}
                    </td>
                    <td className={`px-4 py-3 font-mono ${pnlColor(pos.pnl_pct)}`}>
                      {pos.pnl_pct >= 0 ? '+' : ''}{pos.pnl_pct?.toFixed(2)}%
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
