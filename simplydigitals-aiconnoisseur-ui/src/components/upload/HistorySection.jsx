import { useEffect, useState } from 'react'
import { Clock, RotateCcw, Database, Hash, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { datasetApi } from '../../utils/api'
import { useStore } from '../../store'

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

function formatSize(bytes) {
  if (!bytes) return null
  return `${(bytes / 1024).toFixed(1)} KB`
}

export default function HistorySection() {
  const { setActiveDataset, setActiveSection } = useStore()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    datasetApi.history()
      .then(({ data }) => setHistory(data))
      .catch(() => toast.error('Could not load dataset history'))
      .finally(() => setLoading(false))
  }, [])

  function handleUse(dataset) {
    setActiveDataset(dataset)
    setActiveSection('explorer')
    toast.success(`Loaded "${dataset.name}"`)
  }

  async function handleDelete(ds) {
    setDeleting(ds.id)
    try {
      await datasetApi.delete(ds.id)
      setHistory((prev) => prev.filter((d) => d.id !== ds.id))
      toast.success(`Deleted "${ds.name}"`)
    } catch {
      toast.error('Could not delete dataset')
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-ink-500 text-sm py-4">
        <span className="w-4 h-4 border-2 border-ink-700 border-t-purple-500 rounded-full animate-spin" />
        Loading history…
      </div>
    )
  }

  if (history.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-ink-400" />
        <h3 className="font-display font-600 text-ink-100 text-sm">Recent Datasets</h3>
        <span className="badge-purple ml-auto">{history.length} / 5</span>
      </div>

      <div className="space-y-2">
        {history.map((ds) => (
          <div key={ds.id}
            className="card p-4 flex items-center gap-4 hover:border-purple-500/30 transition-colors">
            {/* Icon */}
            <div className="w-9 h-9 rounded-lg bg-ink-800 border border-ink-700 flex items-center justify-center flex-shrink-0">
              <Database className="w-4 h-4 text-ink-400" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="font-display font-600 text-ink-100 text-sm truncate">{ds.name}</p>
              <div className="flex items-center gap-3 mt-0.5 text-ink-500 text-xs">
                <span className="flex items-center gap-1">
                  <Hash className="w-3 h-3" />
                  {ds.row_count.toLocaleString()} rows · {ds.column_count} cols
                </span>
                {formatSize(ds.file_size_bytes) && (
                  <span>{formatSize(ds.file_size_bytes)}</span>
                )}
                <span>{formatDate(ds.created_at)}</span>
              </div>
            </div>

            {/* Use button */}
            <button
              onClick={() => handleUse(ds)}
              className="btn-ghost text-purple-400 hover:text-purple-300 hover:bg-purple-500/8 flex-shrink-0">
              <RotateCcw className="w-3.5 h-3.5" />
              Use
            </button>

            {/* Delete button */}
            <button
              onClick={() => handleDelete(ds)}
              disabled={deleting === ds.id}
              data-testid={`delete-${ds.id}`}
              className="btn-ghost text-ink-500 hover:text-rose-400 hover:bg-rose-500/8 flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed">
              {deleting === ds.id
                ? <span className="w-3.5 h-3.5 border-2 border-ink-600 border-t-rose-400 rounded-full animate-spin" />
                : <Trash2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
