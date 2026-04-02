import axios from 'axios'

// __API_BASE_URL__ is injected by Vite at build time from VITE_API_BASE_URL env var.
// In production it becomes the API Gateway origin; in dev it is '' so Vite's proxy handles /api/*.
const _base = (typeof __API_BASE_URL__ !== 'undefined' && __API_BASE_URL__)
  ? `${__API_BASE_URL__}/api/v1`
  : '/api/v1'

const api = axios.create({
  baseURL: _base,
  timeout: 60000,
})

// Arbitrageur backend — separate service, separate URL.
// VITE_ARBITRAGEUR_API_URL must be set for production; falls through to proxy in dev.
const _arbBase = (typeof __ARBITRAGEUR_API_BASE_URL__ !== 'undefined' && __ARBITRAGEUR_API_BASE_URL__)
  ? `${__ARBITRAGEUR_API_BASE_URL__}/api/v1`
  : '/arb/v1'

const arbApi = axios.create({
  baseURL: _arbBase,
  timeout: 60000,
})

// Attach JWT + 401 redirect to both instances
;[api, arbApi].forEach((instance) => {
  instance.interceptors.request.use((config) => {
    const token = localStorage.getItem('token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  })
  instance.interceptors.response.use(
    (res) => res,
    (err) => {
      if (err.response?.status === 401) {
        localStorage.removeItem('token')
        window.location.href = '/login'
      }
      return Promise.reject(err)
    }
  )
})

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  refresh: (token) => api.post('/auth/refresh', { refresh_token: token }),
  me: () => api.get('/auth/me'),
  googleLogin: (token) => api.post('/auth/google', { id_token: token }),
}

// ── Datasets ─────────────────────────────────────────────────────────────────
export const datasetApi = {
  list: () => api.get('/datasets/'),
  history: () => api.get('/datasets/history'),
  upload: (formData) => api.post('/datasets/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => e.onUploadProgress?.(e),
  }),
  get: (id) => api.get(`/datasets/${id}`),
  profile: (id) => api.get(`/datasets/${id}/profile`),
  delete: (id) => api.delete(`/datasets/${id}`),
}

// ── Models ────────────────────────────────────────────────────────────────────
export const modelApi = {
  list: () => api.get('/models/'),
  train: (data) => api.post('/models/train', data),
  get: (id) => api.get(`/models/${id}`),
  predict: (id, data) => api.post(`/models/${id}/predict`, data),
  delete: (id) => api.delete(`/models/${id}`),
}

// ── Analytics ─────────────────────────────────────────────────────────────────
export const analyticsApi = {
  describe: (dataset_id, columns) => api.post('/analytics/describe', { dataset_id, columns }),
  correlation: (dataset_id, columns) => api.post('/analytics/correlation', { dataset_id, columns }),
  forecast: (data) => api.post('/analytics/forecast', data),
}

// ── Arbitrageur ───────────────────────────────────────────────────────────────
export const arbitrageurApi = {
  // Tickers
  searchTickers: (q)               => arbApi.get('/tickers/search', { params: { q } }),
  getTicker: (symbol)              => arbApi.get(`/tickers/${symbol}`),

  // Watchlist
  getWatchlist: ()                 => arbApi.get('/watchlist'),
  addToWatchlist: (symbol)         => arbApi.post(`/watchlist/${symbol}`),
  removeFromWatchlist: (symbol)    => arbApi.delete(`/watchlist/${symbol}`),

  // Prices
  getHistory: (symbol, range)      => arbApi.get(`/prices/${symbol}/history`, { params: { range } }),
  getIntraday: (symbol)            => arbApi.get(`/prices/${symbol}/intraday`),
  getQuotes: (symbols)             => arbApi.get('/prices/quotes', { params: { symbols: symbols.join(',') } }),

  // Portfolio
  getPortfolio: ()                 => arbApi.get('/portfolio'),
  executeTrade: (data)             => arbApi.post('/portfolio/trade', data),

  // Triggers
  getTriggers: ()                  => arbApi.get('/triggers'),
  createTrigger: (data)            => arbApi.post('/triggers', data),
  updateTrigger: (id, data)        => arbApi.patch(`/triggers/${id}`, data),
  deleteTrigger: (id)              => arbApi.delete(`/triggers/${id}`),
}

export default api
