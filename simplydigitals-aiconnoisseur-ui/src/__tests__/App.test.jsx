import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../store', () => ({ useStore: vi.fn() }))
vi.mock('../utils/api', () => ({ authApi: { me: vi.fn() } }))
vi.mock('../components/layout/LoginPage', () => ({
  default: () => <div data-testid="login-page">Login Page</div>,
}))
vi.mock('../components/layout/Layout', () => ({
  default: ({ children }) => <div data-testid="layout">{children}</div>,
}))
vi.mock('../components/layout/Dashboard', () => ({
  default: () => <div data-testid="dashboard">Dashboard</div>,
}))
vi.mock('../components/landing/LandingPage', () => ({
  default: () => <div data-testid="landing">Landing</div>,
}))

import App from '../App'
import { useStore } from '../store'
import { authApi } from '../utils/api'

const mockSetUser = vi.fn()

function makeStore(token) {
  const state = { token, setUser: mockSetUser }
  return (selector) => (typeof selector === 'function' ? selector(state) : state)
}

describe('App routing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authApi.me.mockResolvedValue({ data: { full_name: 'Test User', email: 'test@example.com' } })
  })

  it('shows login page at /login route when unauthenticated', () => {
    useStore.mockImplementation(makeStore(null))
    render(<MemoryRouter initialEntries={['/login']}><App /></MemoryRouter>)
    expect(screen.getByTestId('login-page')).toBeInTheDocument()
  })

  it('redirects to login when unauthenticated user visits protected route', () => {
    useStore.mockImplementation(makeStore(null))
    render(<MemoryRouter initialEntries={['/dashboard']}><App /></MemoryRouter>)
    expect(screen.queryByTestId('dashboard')).not.toBeInTheDocument()
  })

  it('shows dashboard when user is authenticated', () => {
    useStore.mockImplementation(makeStore('mock-jwt-token'))
    render(<MemoryRouter initialEntries={['/dashboard']}><App /></MemoryRouter>)
    expect(screen.getByTestId('dashboard')).toBeInTheDocument()
  })

  it('fetches user profile on mount when token exists', async () => {
    useStore.mockImplementation(makeStore('mock-jwt-token'))
    render(<MemoryRouter initialEntries={['/dashboard']}><App /></MemoryRouter>)
    await waitFor(() => expect(authApi.me).toHaveBeenCalledOnce())
    expect(mockSetUser).toHaveBeenCalledWith({ full_name: 'Test User', email: 'test@example.com' })
  })

  it('does not fetch user profile when no token', () => {
    useStore.mockImplementation(makeStore(null))
    render(<MemoryRouter initialEntries={['/login']}><App /></MemoryRouter>)
    expect(authApi.me).not.toHaveBeenCalled()
  })
})
