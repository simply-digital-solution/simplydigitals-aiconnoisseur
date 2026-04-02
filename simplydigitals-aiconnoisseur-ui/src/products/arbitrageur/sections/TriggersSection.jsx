import { useState, useEffect } from 'react'
import { Plus, Bell, Trash2, Pause, Play, Zap, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useArbitrageurStore } from '../store/arbitrageurStore'
import { arbitrageurApi } from '../../../utils/api'

const CONDITION_LABELS = {
  price_gte: 'Price ≥',
  price_lte: 'Price ≤',
  change_pct_gte: '% Change ≥',
  change_pct_lte: '% Change ≤',
}

const ACTION_LABELS = {
  alert:  'Alert only',
  buy:    'Buy',
  sell:   'Sell',
}

const STATUS_STYLE = {
  active:  'bg-green-500/10 text-green-400 border-green-500/20',
  paused:  'bg-ink-700/50 text-ink-400 border-ink-600',
  fired:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
}

const EMPTY_FORM = { symbol: '', condition_type: 'price_gte', threshold: '', action: 'alert', qty: '' }

export default function TriggersSection() {
  const { triggers, setTriggers, addTrigger, removeTrigger, updateTrigger } = useArbitrageurStore()
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    arbitrageurApi
      .getTriggers()
      .then(({ data }) => setTriggers(data))
      .catch(() => toast.error('Could not load triggers'))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleCreate(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const { data } = await arbitrageurApi.createTrigger({
        symbol: form.symbol.toUpperCase(),
        condition_type: form.condition_type,
        threshold: Number(form.threshold),
        action: form.action,
        qty: form.qty ? Number(form.qty) : null,
      })
      addTrigger(data)
      toast.success('Trigger created')
      setForm(EMPTY_FORM)
      setShowForm(false)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not create trigger')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id) {
    try {
      await arbitrageurApi.deleteTrigger(id)
      removeTrigger(id)
      toast.success('Trigger removed')
    } catch {
      toast.error('Could not delete trigger')
    }
  }

  async function handleTogglePause(trigger) {
    const newStatus = trigger.status === 'paused' ? 'active' : 'paused'
    try {
      await arbitrageurApi.updateTrigger(trigger.id, { status: newStatus })
      updateTrigger(trigger.id, { status: newStatus })
    } catch {
      toast.error('Could not update trigger')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-700 text-ink-50 text-xl mb-1">Triggers</h2>
          <p className="text-ink-500 text-sm">Automate alerts and trades based on price conditions.</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="btn-ghost text-amber-400 hover:bg-amber-500/10 border border-amber-500/20">
          <Plus className="w-3.5 h-3.5" />
          New Trigger
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-600 text-ink-100 text-sm">New Trigger</h3>
            <button onClick={() => setShowForm(false)} className="text-ink-500 hover:text-ink-200">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Symbol</label>
              <input className="input font-mono uppercase" placeholder="TSLA"
                value={form.symbol} onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Condition</label>
              <select className="input" value={form.condition_type}
                onChange={(e) => setForm((f) => ({ ...f, condition_type: e.target.value }))}>
                {Object.entries(CONDITION_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Threshold</label>
              <input className="input" type="number" step="any" placeholder="200.00"
                value={form.threshold} onChange={(e) => setForm((f) => ({ ...f, threshold: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Action</label>
              <select className="input" value={form.action}
                onChange={(e) => setForm((f) => ({ ...f, action: e.target.value }))}>
                {Object.entries(ACTION_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            {(form.action === 'buy' || form.action === 'sell') && (
              <div className="col-span-2">
                <label className="label">Quantity</label>
                <input className="input" type="number" min="0.0001" step="any" placeholder="5"
                  value={form.qty} onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))} required />
              </div>
            )}
            <button type="submit" disabled={submitting}
              className="col-span-2 btn-primary justify-center disabled:opacity-50">
              {submitting ? 'Creating…' : 'Create Trigger'}
            </button>
          </form>
        </div>
      )}

      {/* Trigger list */}
      {loading ? (
        <div className="flex items-center gap-2 text-ink-500 text-sm py-6">
          <span className="w-4 h-4 border-2 border-ink-700 border-t-amber-400 rounded-full animate-spin" />
          Loading triggers…
        </div>
      ) : triggers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 card text-center">
          <Bell className="w-10 h-10 text-ink-700 mb-3" />
          <p className="text-ink-500 text-sm">No triggers yet. Create one to automate alerts or trades.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {triggers.map((trigger) => (
            <div key={trigger.id} className="card p-4 flex items-center gap-4">
              {/* Icon */}
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 text-amber-400" />
              </div>

              {/* Description */}
              <div className="flex-1 min-w-0">
                <p className="font-mono font-600 text-ink-100 text-sm">
                  {trigger.symbol}
                  <span className="text-ink-400 font-400 ml-2">
                    {CONDITION_LABELS[trigger.condition_type]} {trigger.threshold}
                  </span>
                </p>
                <p className="text-ink-500 text-xs mt-0.5">
                  Action: <span className="text-ink-300">{ACTION_LABELS[trigger.action]}</span>
                  {trigger.qty && <span className="text-ink-500 ml-1">× {trigger.qty}</span>}
                  {trigger.fired_at && (
                    <span className="ml-2 text-amber-400">
                      Fired {new Date(trigger.fired_at).toLocaleDateString()}
                    </span>
                  )}
                </p>
              </div>

              {/* Status badge */}
              <span className={`text-xs font-display font-600 px-2 py-0.5 rounded-lg border ${STATUS_STYLE[trigger.status] || STATUS_STYLE.active}`}>
                {trigger.status}
              </span>

              {/* Pause / resume */}
              {trigger.status !== 'fired' && (
                <button
                  onClick={() => handleTogglePause(trigger)}
                  className="btn-ghost text-ink-500 hover:text-ink-200 flex-shrink-0"
                  title={trigger.status === 'paused' ? 'Resume' : 'Pause'}>
                  {trigger.status === 'paused'
                    ? <Play className="w-3.5 h-3.5" />
                    : <Pause className="w-3.5 h-3.5" />}
                </button>
              )}

              {/* Delete */}
              <button
                onClick={() => handleDelete(trigger.id)}
                className="btn-ghost text-ink-500 hover:text-rose-400 hover:bg-rose-500/8 flex-shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
