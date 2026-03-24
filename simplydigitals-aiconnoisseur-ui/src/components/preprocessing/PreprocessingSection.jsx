import { useState } from 'react'
import { useStore } from '../../store'
import { Filter, ChevronRight, Check, Info } from 'lucide-react'
import toast from 'react-hot-toast'

const IMPUTE_OPTIONS = [
  { value: 'mean',    label: 'Mean',    desc: 'Replace nulls with column mean. Best for normally distributed data.' },
  { value: 'median',  label: 'Median',  desc: 'Replace nulls with median. Robust to outliers.' },
  { value: 'mode',    label: 'Mode',    desc: 'Replace with most frequent value. Good for categorical.' },
  { value: 'zero',    label: 'Zero',    desc: 'Fill with 0. Use when absence means zero.' },
  { value: 'drop',    label: 'Drop Rows', desc: 'Remove rows containing null values.' },
  { value: 'knn',     label: 'KNN',     desc: 'K-nearest neighbours imputation. Preserves relationships.' },
]

const SCALE_OPTIONS = [
  { value: 'standard', label: 'Standard (Z-score)', desc: 'μ=0, σ=1. Best for algorithms that assume normal distribution.' },
  { value: 'minmax',   label: 'Min-Max',            desc: 'Scale to [0, 1]. Good for neural networks and distance-based models.' },
  { value: 'robust',   label: 'Robust',             desc: 'Uses median/IQR. Resistant to outliers.' },
  { value: 'log',      label: 'Log Transform',      desc: 'Natural log. Reduces right skew in data.' },
  { value: 'none',     label: 'None',               desc: 'Do not scale features.' },
]

const FEATURE_METHODS = [
  { value: 'manual',       label: 'Manual Selection', desc: 'Hand-pick the features you want to include.' },
  { value: 'variance',     label: 'Variance Threshold', desc: 'Remove low-variance features. Removes near-constant columns.' },
  { value: 'correlation',  label: 'Correlation Filter', desc: 'Drop highly correlated features to reduce redundancy.' },
  { value: 'importance',   label: 'Feature Importance', desc: 'Use a tree model to rank and select top features.' },
]

function OptionCard({ item, selected, onClick }) {
  return (
    <button onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border transition-all duration-200
        ${selected
          ? 'bg-jade-500/12 border-jade-500/40 shadow-sm'
          : 'bg-ink-800/40 border-ink-700/40 hover:border-ink-600 hover:bg-ink-800/70'
        }`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className={`font-display font-500 text-sm ${selected ? 'text-jade-300' : 'text-ink-200'}`}>{item.label}</div>
          <div className="text-ink-500 text-xs mt-0.5 leading-relaxed">{item.desc}</div>
        </div>
        {selected && (
          <div className="w-5 h-5 rounded-full bg-jade-500 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Check className="w-3 h-3 text-ink-950" />
          </div>
        )}
      </div>
    </button>
  )
}

export default function PreprocessingSection() {
  const {
    columns, columnStats,
    imputeMethod, setImputeMethod,
    scaleMethod, setScaleMethod,
    selectedFeatures, setSelectedFeatures,
    targetColumn, setTargetColumn,
  } = useStore()

  const [featureMethod, setFeatureMethod] = useState('manual')
  const [step, setStep] = useState(1)
  const [saved, setSaved] = useState(false)

  const numericCols = columns.filter((c) => columnStats[c]?.isNumeric)
  const nullyCols = columns.filter((c) => columnStats[c]?.nullCount > 0)

  function toggleFeature(col) {
    setSelectedFeatures(
      selectedFeatures.includes(col)
        ? selectedFeatures.filter((c) => c !== col)
        : [...selectedFeatures, col]
    )
  }

  function selectAll() { setSelectedFeatures(numericCols.filter((c) => c !== targetColumn)) }
  function clearAll() { setSelectedFeatures([]) }

  function save() {
    if (!targetColumn) { toast.error('Please select a target column'); return }
    if (selectedFeatures.length === 0) { toast.error('Please select at least one feature'); return }
    setSaved(true)
    toast.success('Preprocessing config saved — ready for A/B testing')
  }

  const STEPS = ['Imputation', 'Scaling', 'Features & Target', 'Summary']

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-up">
      <div>
        <h2 className="font-display text-2xl font-700 text-ink-50">Preprocessing</h2>
        <p className="text-ink-400 text-sm mt-0.5">Configure how to prepare your data before model training.</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-0">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center flex-1">
            <button onClick={() => setStep(i + 1)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm font-display font-500
                ${step === i + 1 ? 'text-jade-400' : i + 1 < step ? 'text-ink-400' : 'text-ink-600'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0
                ${step === i + 1 ? 'bg-jade-500 text-ink-950' :
                  i + 1 < step ? 'bg-jade-500/20 text-jade-400' :
                  'bg-ink-700 text-ink-500'}`}>
                {i + 1 < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className="hidden sm:block">{s}</span>
            </button>
            {i < STEPS.length - 1 && <div className="flex-1 h-px bg-ink-700/60 mx-1" />}
          </div>
        ))}
      </div>

      {/* ── Step 1: Imputation ── */}
      {step === 1 && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center gap-2 p-3.5 bg-amber-500/8 border border-amber-500/20 rounded-xl">
            <Info className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <p className="text-amber-300/80 text-sm">
              {nullyCols.length > 0
                ? `${nullyCols.length} columns contain null values: ${nullyCols.join(', ')}`
                : 'No null values detected — imputation optional.'}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {IMPUTE_OPTIONS.map((opt) => (
              <OptionCard key={opt.value} item={opt}
                selected={imputeMethod === opt.value}
                onClick={() => setImputeMethod(opt.value)} />
            ))}
          </div>
          <div className="flex justify-end">
            <button onClick={() => setStep(2)} className="btn-primary">
              Next: Scaling <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Scaling ── */}
      {step === 2 && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SCALE_OPTIONS.map((opt) => (
              <OptionCard key={opt.value} item={opt}
                selected={scaleMethod === opt.value}
                onClick={() => setScaleMethod(opt.value)} />
            ))}
          </div>
          <div className="flex justify-between">
            <button onClick={() => setStep(1)} className="btn-secondary">Back</button>
            <button onClick={() => setStep(3)} className="btn-primary">
              Next: Features <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Features & Target ── */}
      {step === 3 && (
        <div className="space-y-5 animate-fade-in">
          {/* Target column */}
          <div className="card p-5 space-y-3">
            <h3 className="font-display font-600 text-ink-100 flex items-center gap-2">
              <Filter className="w-4 h-4 text-rose-400" /> Target Column
            </h3>
            <select className="select" value={targetColumn} onChange={(e) => setTargetColumn(e.target.value)}>
              <option value="">— Select target —</option>
              {columns.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Feature selection method */}
          <div className="card p-5 space-y-3">
            <h3 className="font-display font-600 text-ink-100">Feature Selection Method</h3>
            <div className="grid grid-cols-2 gap-2">
              {FEATURE_METHODS.map((m) => (
                <OptionCard key={m.value} item={m}
                  selected={featureMethod === m.value}
                  onClick={() => setFeatureMethod(m.value)} />
              ))}
            </div>
          </div>

          {/* Manual feature toggle */}
          {featureMethod === 'manual' && (
            <div className="card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-600 text-ink-100">Select Features</h3>
                <div className="flex gap-2">
                  <button onClick={selectAll} className="btn-ghost text-xs">Select all</button>
                  <button onClick={clearAll} className="btn-ghost text-xs text-rose-400">Clear</button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                {numericCols.filter((c) => c !== targetColumn).map((col) => {
                  const sel = selectedFeatures.includes(col)
                  return (
                    <button key={col} onClick={() => toggleFeature(col)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-mono transition-all
                        ${sel
                          ? 'bg-jade-500/12 border-jade-500/40 text-jade-300'
                          : 'bg-ink-800/40 border-ink-700/40 text-ink-400 hover:border-ink-600'
                        }`}>
                      <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0
                        ${sel ? 'bg-jade-500 border-jade-500' : 'border-ink-600'}`}>
                        {sel && <Check className="w-2.5 h-2.5 text-ink-950" />}
                      </div>
                      <span className="truncate">{col}</span>
                    </button>
                  )
                })}
              </div>
              <div className="text-ink-500 text-xs">{selectedFeatures.length} of {numericCols.length - 1} selected</div>
            </div>
          )}

          <div className="flex justify-between">
            <button onClick={() => setStep(2)} className="btn-secondary">Back</button>
            <button onClick={() => setStep(4)} className="btn-primary">
              Review Summary <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: Summary ── */}
      {step === 4 && (
        <div className="space-y-4 animate-fade-in">
          <div className="card p-5 space-y-4">
            <h3 className="font-display font-600 text-ink-100">Configuration Summary</h3>
            {[
              { label: 'Imputation', value: IMPUTE_OPTIONS.find((o) => o.value === imputeMethod)?.label, color: 'amber' },
              { label: 'Scaling', value: SCALE_OPTIONS.find((o) => o.value === scaleMethod)?.label, color: 'violet' },
              { label: 'Target Column', value: targetColumn || 'Not set', color: 'rose' },
              { label: 'Features', value: `${selectedFeatures.length} selected`, color: 'jade' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-ink-800/60 last:border-0">
                <span className="text-ink-400 text-sm font-display">{label}</span>
                <span className={`badge-${color} text-sm`}>{value}</span>
              </div>
            ))}
          </div>

          {selectedFeatures.length > 0 && (
            <div className="card p-5">
              <div className="text-xs font-display text-ink-500 uppercase tracking-wider mb-3">Selected Features</div>
              <div className="flex flex-wrap gap-2">
                {selectedFeatures.map((f) => (
                  <span key={f} className="badge-jade">{f}</span>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <button onClick={() => setStep(3)} className="btn-secondary">Back</button>
            <button onClick={save} className="btn-primary">
              {saved ? <><Check className="w-4 h-4" /> Saved</> : <>Save Config</>}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
