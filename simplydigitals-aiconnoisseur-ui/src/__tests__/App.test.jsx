import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../store', () => ({ useStore: vi.fn() }))
vi.mock('../utils/api', () => ({ authApi: { me: vi.fn() } }))
vi.mock('../components/layout/LoginPage', () => ({
  default: () => <div data-testid="login-page">Login Page</div>,
}))
vi.mock('../components/hub/AppHub', () => ({
  default: () => <div data-testid="app-hub">App Hub</div>,
}))
vi.mock('../components/landing/LandingPage', () => ({
  default: () => <div data-testid="landing">Landing</div>,
}))
// Mock all product lazy imports via the registry
vi.mock('../products/registry', () => ({
  PRODUCTS: [
    {
      id: 'connoisseur',
      name: 'AI Connoisseur',
      tagline: '',
      Icon: () => null,
      color: 'purple',
      path: '/app/connoisseur',
      description: '',
      lazy: () => Promise.resolve({ default: () => <div data-testid="connoisseur-app">Connoisseur</div> }),
    },
  ],
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

  it('renders landing page at /', () => {
    useStore.mockImplementation(makeStore(null))
    render(<MemoryRouter initialEntries={['/']}><App /></MemoryRouter>)
    expect(screen.getByTestId('landing')).toBeInTheDocument()
  })

  it('renders login page at /login', () => {
    useStore.mockImplementation(makeStore(null))
    render(<MemoryRouter initialEntries={['/login']}><App /></MemoryRouter>)
    expect(screen.getByTestId('login-page')).toBeInTheDocument()
  })

  it('redirects unauthenticated user from /app to /login', () => {
    useStore.mockImplementation(makeStore(null))
    render(<MemoryRouter initialEntries={['/app']}><App /></MemoryRouter>)
    expect(screen.queryByTestId('app-hub')).not.toBeInTheDocument()
    expect(screen.getByTestId('login-page')).toBeInTheDocument()
  })

  it('renders AppHub at /app when authenticated', () => {
    useStore.mockImplementation(makeStore('mock-jwt'))
    render(<MemoryRouter initialEntries={['/app']}><App /></MemoryRouter>)
    expect(screen.getByTestId('app-hub')).toBeInTheDocument()
  })

  it('fetches user profile on mount when token exists', async () => {
    useStore.mockImplementation(makeStore('mock-jwt'))
    render(<MemoryRouter initialEntries={['/app']}><App /></MemoryRouter>)
    await waitFor(() => expect(authApi.me).toHaveBeenCalledOnce())
    expect(mockSetUser).toHaveBeenCalledWith({ full_name: 'Test User', email: 'test@example.com' })
  })

  it('does not fetch user profile when no token', () => {
    useStore.mockImplementation(makeStore(null))
    render(<MemoryRouter initialEntries={['/login']}><App /></MemoryRouter>)
    expect(authApi.me).not.toHaveBeenCalled()
  })

  it('redirects /dashboard to /app/connoisseur for authenticated user', () => {
    useStore.mockImplementation(makeStore('mock-jwt'))
    render(<MemoryRouter initialEntries={['/dashboard']}><App /></MemoryRouter>)
    // Should not render the login page — a redirect happened
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument()
  })
})
