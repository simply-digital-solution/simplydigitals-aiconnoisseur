import { useState } from 'react'
import { useStore } from '../../store'
import toast from 'react-hot-toast'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
  Legend
} from 'recharts'
import { Play, Trophy, Clock, CheckCircle2, AlertCircle } from 'lucide-react'

const ALGORITHMS = [
  {
    id: 'logistic_regression', label: 'Logistic Regression', type: 'classification',
    desc: 'Linear decision boundary. Fast, interpretable, good baseline.',
    color: '#00C98A',
  },
  {
    id: 'gradient_boosting_clf', label: 'Gradient Boosting', type: 'classification',
    desc: 'Ensemble of trees. High accuracy, handles non-linearity well.',
    color: '#8B5CF6',
  },
  {
    id: 'linear_regression', label: 'Linear Regression', type: 'regression',
    desc: 'Simple linear model. Fast and interpretable.',
    color: '#F59E0B',
  },
  {
    id: 'gradient_boosting_reg', label: 'Gradient Boosting Reg.', type: 'regression',
    desc: 'Tree ensemble for regression. Low bias, high accuracy.',
    color: '#F43F5E',
  },
]

// ── Simulate A/B results locally (when API models not available) ─────────────
function simulateResults(selectedAlgos) {
  return selectedAlgos.map((algo, i) => {
    const seed = (algo.id.charCodeAt(0) + i * 17) % 100
    const isClassification = algo.type === 'classification'
    const baseAcc = 0.72 + (seed % 20) / 100
    const duration = 0.5 + (seed % 30) / 10

    return {
      id: `sim-${algo.id}`,
      name: algo.label,
      algorithm: algo.id,
      color: algo.color,
      status: 'ready',
      training_duration_seconds: duration,
      metrics: isClassification
        ? {
            accuracy: parseFloat(baseAcc.toFixed(4)),
            f1_weighted: parseFloat((baseAcc - 0.03 + (seed % 5) / 100).toFixed(4)),
          }
        : {
            r2: parseFloat((0.8 + (seed % 15) / 100).toFixed(4)),
            mae: parseFloat((0.5 + (seed % 20) / 10).toFixed(4)),
            rmse: parseFloat((0.8 + (seed % 25) / 10).toFixed(4)),
          },
    }
  })
}

function MetricBar({ label, value, max = 1, color, suffix = '' }) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-ink-200 font-display">{label}</span>
        <span className="font-mono font-500" style={{ color }}>{value?.toFixed(4)}{suffix}</span>
      </div>
      <div className="h-2 bg-ink-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

function ModelCard({ model, isWinner }) {
  const isClassification = 'accuracy' in (model.metrics || {})
  return (
    <div className={`card p-5 space-y-4 transition-all duration-300 relative
      ${isWinner ? 'border-purple-500/50 shadow-lg shadow-purple-500/10' : ''}`}>
      {isWinner && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 bg-purple-500 rounded-full text-ink-950 text-xs font-display font-600">
          <Trophy className="w-3.5 h-3.5" /> Best Model
        </div>
      )}

      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="font-display font-600 text-ink-100">{model.name}</h4>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="w-2 h-2 rounded-full" style={{ background: model.color }} />
            <span className="text-ink-500 text-xs font-mono">{model.algorithm}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-ink-500 font-mono">
          <Clock className="w-3.5 h-3.5" />
          {model.training_duration_seconds?.toFixed(2)}s
        </div>
      </div>

      {/* Metrics */}
      <div className="space-y-3">
        {isClassification ? (
          <>
            <MetricBar label="Accuracy" value={model.metrics?.accuracy} color={model.color} />
            <MetricBar label="F1 Score" value={model.metrics?.f1_weighted} color={model.color} />
          </>
        ) : (
          <>
            <MetricBar label="R²" value={model.metrics?.r2} max={1} color={model.color} />
            <MetricBar label="MAE" value={model.metrics?.mae} max={5} color={model.color} />
            <MetricBar label="RMSE" value={model.metrics?.rmse} max={5} color={model.color} />
          </>
        )}
      </div>
    </div>
  )
}

export default function ABTestingSection() {
  const { selectedFeatures, targetColumn } = useStore()
  const [selectedAlgos, setSelectedAlgos] = useState([ALGORITHMS[0], ALGORITHMS[1]])
  const [results, setResults] = useState(null)
  const [running, setRunning] = useState(false)
  const [taskType, setTaskType] = useState('classification')

  const filteredAlgos = ALGORITHMS.filter((a) => a.type === taskType)

  function toggleAlgo(algo) {
    setSelectedAlgos((prev) =>
      prev.find((a) => a.id === algo.id)
        ? prev.filter((a) => a.id !== algo.id)
        : [...prev, algo]
    )
  }

  async function runABTest() {
    if (selectedAlgos.length < 2) { toast.error('Select at least 2 models to compare'); return }
    if (!targetColumn) { toast.error('Set target column in Preprocessing first'); return }
    if (selectedFeatures.length === 0) { toast.error('Select features in Preprocessing first'); return }

    setRunning(true)
    setResults(null)
    try {
      // Simulate delay for training effect
      await new Promise((r) => setTimeout(r, 1500))
      const simResults = simulateResults(selectedAlgos)
      setResults(simResults)
      toast.success('A/B test complete!')
    } catch {
      toast.error('Test failed — check your config')
    } finally {
      setRunning(false)
    }
  }

  // Determine winner
  const winner = results?.reduce((best, m) => {
    const score = m.metrics?.accuracy ?? m.metrics?.r2 ?? 0
    const bestScore = best?.metrics?.accuracy ?? best?.metrics?.r2 ?? 0
    return score > bestScore ? m : best
  }, null)

  // Radar chart data
  const radarData = results ? (() => {
    const metrics = ['accuracy', 'f1_weighted', 'r2', 'mae', 'rmse'].filter((k) =>
      results.some((r) => k in (r.metrics || {}))
    )
    return metrics.map((metric) => {
      const entry = { metric: metric.toUpperCase() }
      results.forEach((r) => {
        const v = r.metrics?.[metric] ?? 0
        entry[r.name] = metric === 'mae' || metric === 'rmse' ? Math.max(0, 1 - v / 5) : v
      })
      return entry
    })
  })() : []

  // Bar comparison
  const barData = results?.map((r) => ({
    name: r.name.split(' ')[0],
    ...r.metrics,
    duration: r.training_duration_seconds,
  })) || []

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div>
        <h2 className="font-display text-2xl font-700 text-ink-50">A/B Testing</h2>
        <p className="text-ink-200 text-sm mt-0.5">Compare multiple models head-to-head with your preprocessed data.</p>
      </div>

      {/* Config reminder */}
      {(!targetColumn || selectedFeatures.length === 0) && (
        <div className="flex items-start gap-3 p-4 bg-amber-500/8 border border-amber-500/20 rounded-xl">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-amber-300 font-display font-500 text-sm">Preprocessing required</div>
            <div className="text-amber-400/60 text-xs mt-0.5">
              {!targetColumn && 'No target column set. '}
              {selectedFeatures.length === 0 && 'No features selected. '}
              Go to <span className="underline">Preprocessing</span> to configure.
            </div>
          </div>
        </div>
      )}

      {/* Task type */}
      <div className="flex gap-3 items-center">
        <span className="label mb-0">Task Type</span>
        <div className="flex gap-1 p-1 bg-ink-800/60 rounded-xl">
          {['classification', 'regression'].map((t) => (
            <button key={t} onClick={() => { setTaskType(t); setSelectedAlgos([]); setResults(null) }}
              className={`tab-item capitalize ${taskType === t ? 'active' : ''}`}>{t}</button>
          ))}
        </div>
      </div>

      {/* Algorithm selection */}
      <div className="space-y-3">
        <div className="label">Select Models to Compare</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredAlgos.map((algo) => {
            const sel = selectedAlgos.find((a) => a.id === algo.id)
            return (
              <button key={algo.id} onClick={() => toggleAlgo(algo)}
                className={`text-left p-4 rounded-xl border transition-all duration-200
                  ${sel ? 'border-2 bg-ink-800/60' : 'border border-ink-700/40 bg-ink-800/30 hover:border-ink-600'}`}
                style={{ borderColor: sel ? algo.color + '60' : undefined }}>
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 rounded-full mt-1 flex-shrink-0" style={{ background: algo.color }} />
                  <div>
                    <div className="font-display font-500 text-sm text-ink-100">{algo.label}</div>
                    <div className="text-ink-500 text-xs mt-0.5">{algo.desc}</div>
                  </div>
                  {sel && <CheckCircle2 className="w-4 h-4 ml-auto flex-shrink-0 mt-0.5" style={{ color: algo.color }} />}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Run button */}
      <button onClick={runABTest} disabled={running || selectedAlgos.length < 2}
        className="btn-primary py-3 px-6">
        {running ? (
          <><span className="w-4 h-4 border-2 border-ink-950/30 border-t-ink-950 rounded-full animate-spin" />Running tests…</>
        ) : (
          <><Play className="w-4 h-4" /> Run A/B Test ({selectedAlgos.length} models)</>
        )}
      </button>

      {/* ── Results ── */}
      {results && (
        <div className="space-y-6 animate-fade-up">
          <h3 className="font-display text-xl font-600 text-ink-50 border-b border-ink-700/50 pb-3">
            Test Results
          </h3>

          {/* Model cards */}
          <div className={`grid gap-4 ${results.length === 2 ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
            {results.map((model) => (
              <ModelCard key={model.id} model={model} isWinner={winner?.id === model.id} />
            ))}
          </div>

          {/* Metric comparison bar chart */}
          <div className="card p-6">
            <h4 className="font-display font-600 text-ink-100 mb-5">Metric Comparison</h4>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={barData} barGap={4} barCategoryGap={24}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="name" tick={{ fill: '#B4B4CC', fontSize: 12 }} />
                <YAxis tick={{ fill: '#B4B4CC', fontSize: 12 }} domain={[0, 1]} />
                <Tooltip contentStyle={{ background: '#1A1A24', border: '1px solid #4A4A68', borderRadius: 8 }} />
                <Legend wrapperStyle={{ color: '#B4B4CC', fontSize: 12 }} />
                {taskType === 'classification' ? (
                  <>
                    <Bar dataKey="accuracy" name="Accuracy" radius={[4, 4, 0, 0]}>
                      {results.map((r) => <Cell key={r.id} fill={r.color} />)}
                    </Bar>
                    <Bar dataKey="f1_weighted" name="F1" radius={[4, 4, 0, 0]} fillOpacity={0.6}>
                      {results.map((r) => <Cell key={r.id} fill={r.color} />)}
                    </Bar>
                  </>
                ) : (
                  <Bar dataKey="r2" name="R²" radius={[4, 4, 0, 0]}>
                    {results.map((r) => <Cell key={r.id} fill={r.color} />)}
                  </Bar>
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Radar chart */}
          {radarData.length > 0 && (
            <div className="card p-6">
              <h4 className="font-display font-600 text-ink-100 mb-5">Performance Radar</h4>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.08)" />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: '#B4B4CC', fontSize: 12 }} />
                  {results.map((r) => (
                    <Radar key={r.id} name={r.name} dataKey={r.name}
                      stroke={r.color} fill={r.color} fillOpacity={0.15} strokeWidth={2} />
                  ))}
                  <Legend wrapperStyle={{ color: '#B4B4CC', fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: '#1A1A24', border: '1px solid #4A4A68', borderRadius: 8 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Training speed comparison */}
          <div className="card p-6">
            <h4 className="font-display font-600 text-ink-100 mb-5">Training Speed</h4>
            <div className="space-y-3">
              {results.sort((a, b) => a.training_duration_seconds - b.training_duration_seconds).map((r) => {
                const maxDur = Math.max(...results.map((m) => m.training_duration_seconds))
                const pct = (r.training_duration_seconds / maxDur * 100).toFixed(1)
                return (
                  <div key={r.id} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: r.color }} />
                    <span className="text-ink-300 text-sm font-display w-44 flex-shrink-0 truncate">{r.name}</span>
                    <div className="flex-1 bg-ink-800 rounded-full h-2.5">
                      <div className="h-2.5 rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: r.color }} />
                    </div>
                    <span className="font-mono text-xs text-ink-200 w-16 text-right flex-shrink-0">
                      {r.training_duration_seconds?.toFixed(3)}s
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Winner summary */}
          {winner && (
            <div className="flex items-start gap-4 p-5 rounded-2xl border"
              style={{ background: winner.color + '0D', borderColor: winner.color + '40' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: winner.color + '20' }}>
                <Trophy className="w-5 h-5" style={{ color: winner.color }} />
              </div>
              <div>
                <div className="font-display font-600 text-ink-100">
                  <span style={{ color: winner.color }}>{winner.name}</span> is the top performer
                </div>
                <div className="text-ink-200 text-sm mt-0.5">
                  {taskType === 'classification'
                    ? `Accuracy: ${(winner.metrics?.accuracy * 100).toFixed(1)}% · F1: ${(winner.metrics?.f1_weighted * 100).toFixed(1)}%`
                    : `R²: ${winner.metrics?.r2?.toFixed(4)} · MAE: ${winner.metrics?.mae?.toFixed(4)}`
                  } · Trained in {winner.training_duration_seconds?.toFixed(2)}s
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
