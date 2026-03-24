import { create } from 'zustand'

export const useStore = create((set) => ({
  // ── Auth ─────────────────────────────────────────────────────────────────
  token: localStorage.getItem('token') || null,
  user: null,
  setToken: (token) => {
    localStorage.setItem('token', token)
    set({ token })
  },
  clearAuth: () => {
    localStorage.removeItem('token')
    set({ token: null, user: null })
  },

  // ── Active section ───────────────────────────────────────────────────────
  activeSection: 'upload',
  setActiveSection: (s) => set({ activeSection: s }),

  // ── Dataset ──────────────────────────────────────────────────────────────
  datasets: [],
  activeDataset: null,
  parsedData: null,          // raw parsed CSV rows
  columns: [],               // column names
  columnStats: {},           // per-column stats computed client-side

  setDatasets: (datasets) => set({ datasets }),
  setActiveDataset: (dataset) => set({ activeDataset: dataset }),

  setParsedData: (rows, columns) => {
    const stats = computeColumnStats(rows, columns)
    set({ parsedData: rows, columns, columnStats: stats })
  },

  // ── Preprocessing config ─────────────────────────────────────────────────
  imputeMethod: 'mean',
  scaleMethod: 'standard',
  selectedFeatures: [],
  targetColumn: '',

  setImputeMethod: (m) => set({ imputeMethod: m }),
  setScaleMethod: (m) => set({ scaleMethod: m }),
  setSelectedFeatures: (f) => set({ selectedFeatures: f }),
  setTargetColumn: (c) => set({ targetColumn: c }),

  // ── Models / A-B testing ─────────────────────────────────────────────────
  trainedModels: [],
  abResults: null,
  setTrainedModels: (m) => set({ trainedModels: m }),
  setAbResults: (r) => set({ abResults: r }),
}))

// ── Client-side column statistics ────────────────────────────────────────────
function computeColumnStats(rows, columns) {
  if (!rows || rows.length === 0) return {}
  const stats = {}

  columns.forEach((col) => {
    const values = rows.map((r) => r[col])
    const nullCount = values.filter((v) => v === null || v === undefined || v === '').length
    const nonNull = values.filter((v) => v !== null && v !== undefined && v !== '')
    const numeric = nonNull.map(Number).filter((n) => !isNaN(n))
    const isNumeric = numeric.length / Math.max(nonNull.length, 1) > 0.8
    const unique = new Set(nonNull.map(String)).size

    let dtype = 'string'
    let min, max, mean, std, median, q1, q3

    if (isNumeric) {
      dtype = 'float64'
      min = Math.min(...numeric)
      max = Math.max(...numeric)
      mean = numeric.reduce((a, b) => a + b, 0) / numeric.length
      const sorted = [...numeric].sort((a, b) => a - b)
      median = sorted[Math.floor(sorted.length / 2)]
      q1 = sorted[Math.floor(sorted.length * 0.25)]
      q3 = sorted[Math.floor(sorted.length * 0.75)]
      std = Math.sqrt(numeric.reduce((a, b) => a + (b - mean) ** 2, 0) / numeric.length)
    }

    stats[col] = {
      dtype,
      count: nonNull.length,
      nullCount,
      nullPct: ((nullCount / values.length) * 100).toFixed(1),
      unique,
      isNumeric,
      min, max, mean, std, median, q1, q3,
      values: numeric.length > 0 ? numeric : nonNull.slice(0, 200).map(String),
      sample: nonNull.slice(0, 5),
    }
  })

  return stats
}

// ── Compute correlation matrix ────────────────────────────────────────────────
export function computeCorrelation(columnStats, columns) {
  const numericCols = columns.filter((c) => columnStats[c]?.isNumeric)
  const matrix = {}

  numericCols.forEach((c1) => {
    matrix[c1] = {}
    numericCols.forEach((c2) => {
      const v1 = columnStats[c1].values
      const v2 = columnStats[c2].values
      const n = Math.min(v1.length, v2.length)
      if (n < 2) { matrix[c1][c2] = 0; return }
      const m1 = v1.slice(0, n).reduce((a, b) => a + b, 0) / n
      const m2 = v2.slice(0, n).reduce((a, b) => a + b, 0) / n
      let num = 0, d1 = 0, d2 = 0
      for (let i = 0; i < n; i++) {
        const a = v1[i] - m1, b = v2[i] - m2
        num += a * b; d1 += a * a; d2 += b * b
      }
      matrix[c1][c2] = d1 && d2 ? parseFloat((num / Math.sqrt(d1 * d2)).toFixed(3)) : 0
    })
  })
  return { matrix, columns: numericCols }
}
