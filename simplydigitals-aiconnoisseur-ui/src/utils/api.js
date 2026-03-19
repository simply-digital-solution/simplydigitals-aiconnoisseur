import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 60000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  refresh: (token) => api.post('/auth/refresh', { refresh_token: token }),
}

// ── Datasets ─────────────────────────────────────────────────────────────────
export const datasetApi = {
  list: () => api.get('/datasets/'),
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

export default api
