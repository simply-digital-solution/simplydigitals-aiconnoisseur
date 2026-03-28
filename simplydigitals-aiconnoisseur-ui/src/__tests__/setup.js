import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock localStorage globally — Zustand store reads it on module init
const _storage = {}
const localStorageMock = {
  getItem: vi.fn((k) => _storage[k] ?? null),
  setItem: vi.fn((k, v) => { _storage[k] = String(v) }),
  removeItem: vi.fn((k) => { delete _storage[k] }),
  clear: vi.fn(() => { Object.keys(_storage).forEach(k => delete _storage[k]) }),
  length: 0,
  key: vi.fn(() => null),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
  },
}))

// Mock lucide-react icons — return simple divs
vi.mock('lucide-react', () => ({
  Eye: () => null,
  EyeOff: () => null,
  Cpu: () => null,
  LayoutDashboard: () => null,
  Upload: () => null,
  BarChart2: () => null,
  Database: () => null,
  Brain: () => null,
  LogOut: () => null,
  ChevronDown: () => null,
  AlertCircle: () => null,
  CheckCircle: () => null,
  Loader: () => null,
  RefreshCw: () => null,
  Trash2: () => null,
  Download: () => null,
  Play: () => null,
}))
