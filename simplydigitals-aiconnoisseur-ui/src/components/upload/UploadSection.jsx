import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import Papa from 'papaparse'
import toast from 'react-hot-toast'
import { Upload, FileText, CheckCircle2, Trash2, ChevronRight, Database, Hash } from 'lucide-react'
import { useStore } from '../../store'
import { datasetApi } from '../../utils/api'

export default function UploadSection() {
  const { setActiveDataset, setParsedData, setActiveSection, datasets, setDatasets } = useStore()
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(null)

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0]
    if (!file) return
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data, meta }) => {
        setPreview({ file, rows: data, columns: meta.fields })
      },
      error: () => toast.error('Could not parse CSV'),
    })
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 1,
  })

  async function handleUpload() {
    if (!preview) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('name', preview.file.name.replace('.csv', ''))
      fd.append('file', preview.file)
      const { data } = await datasetApi.upload(fd)
      setParsedData(preview.rows, preview.columns)
      setActiveDataset(data)
      setDatasets([data, ...datasets.filter((d) => d.id !== data.id)])
      toast.success(`Dataset "${data.name}" uploaded successfully`)
      setActiveSection('explorer')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-up">
      {/* Header */}
      <div>
        <h2 className="font-display text-2xl font-700 text-ink-50">Data Upload</h2>
        <p className="text-ink-200 text-sm mt-1">Upload a CSV file to begin analysis. Your data is processed securely.</p>
      </div>

      {/* Drop zone */}
      <div {...getRootProps()} className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300
        ${isDragActive
          ? 'border-purple-500 bg-purple-500/8 glow-purple'
          : preview
          ? 'border-purple-500/40 bg-purple-500/5'
          : 'border-ink-600/60 bg-ink-900/40 hover:border-ink-500 hover:bg-ink-800/30'
        }`}>
        <input {...getInputProps()} />

        {preview ? (
          <div className="animate-fade-in">
            <CheckCircle2 className="w-12 h-12 text-purple-400 mx-auto mb-3" />
            <p className="font-display font-600 text-ink-100 text-lg">{preview.file.name}</p>
            <p className="text-ink-200 text-sm mt-1">
              {preview.rows.length.toLocaleString()} rows · {preview.columns.length} columns · {(preview.file.size / 1024).toFixed(1)} KB
            </p>
            <button onClick={(e) => { e.stopPropagation(); setPreview(null) }}
              className="mt-3 btn-ghost text-rose-400 hover:text-rose-300 hover:bg-rose-500/8 mx-auto">
              <Trash2 className="w-3.5 h-3.5" /> Remove
            </button>
          </div>
        ) : (
          <>
            <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center transition-all
              ${isDragActive ? 'bg-purple-500/20 border border-purple-500/40' : 'bg-ink-800 border border-ink-700'}`}>
              <Upload className={`w-7 h-7 ${isDragActive ? 'text-purple-400' : 'text-ink-400'}`} />
            </div>
            <p className="font-display font-600 text-ink-200 text-lg">
              {isDragActive ? 'Drop your CSV here' : 'Drag & drop a CSV file'}
            </p>
            <p className="text-ink-500 text-sm mt-1">or <span className="text-purple-400 underline underline-offset-2">browse to upload</span></p>
            <p className="text-ink-600 text-xs mt-3">Supports .csv · up to 500,000 rows</p>
          </>
        )}
      </div>

      {/* Column preview */}
      {preview && (
        <div className="card p-6 animate-fade-up space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-600 text-ink-100">Column Preview</h3>
            <span className="badge-purple">{preview.columns.length} columns</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-700/60">
                  <th className="text-left py-2 px-3 text-ink-200 font-display font-500 text-xs uppercase tracking-wider">Column</th>
                  <th className="text-left py-2 px-3 text-ink-200 font-display font-500 text-xs uppercase tracking-wider">Sample Values</th>
                </tr>
              </thead>
              <tbody>
                {preview.columns.slice(0, 10).map((col) => (
                  <tr key={col} className="border-b border-ink-800/60 hover:bg-ink-800/30 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-purple-400 font-500 text-xs">{col}</td>
                    <td className="py-2.5 px-3 text-ink-300 text-xs">
                      {preview.rows.slice(0, 3).map((r) => r[col]).filter(Boolean).join(' · ') || '—'}
                    </td>
                  </tr>
                ))}
                {preview.columns.length > 10 && (
                  <tr><td colSpan={2} className="py-2 px-3 text-ink-600 text-xs italic">+ {preview.columns.length - 10} more columns</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <button onClick={handleUpload} disabled={uploading} className="btn-primary">
            {uploading ? (
              <><span className="w-4 h-4 border-2 border-ink-950/30 border-t-ink-950 rounded-full animate-spin" />Uploading…</>
            ) : (
              <>Upload & Analyse <ChevronRight className="w-4 h-4" /></>
            )}
          </button>
        </div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: FileText, label: 'CSV Support', value: 'UTF-8 · RFC 4180' },
          { icon: Database, label: 'Max Rows', value: '500,000' },
          { icon: Hash, label: 'Analysis', value: 'Client-side + API' },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="card p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-ink-800 flex items-center justify-center flex-shrink-0">
              <Icon className="w-4.5 h-4.5 text-ink-400" />
            </div>
            <div>
              <div className="text-xs text-ink-200 font-display">{label}</div>
              <div className="text-sm text-ink-200 font-mono">{value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
