import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../store', () => ({
  useStore: vi.fn(() => null),
}))

vi.mock('../components/layout/LoginPage', () => ({
  default: () => <div data-testid="login-page">Login Page</div>,
}))

vi.mock('../components/layout/Layout', () => ({
  default: ({ children }) => <div data-testid="layout">{children}</div>,
}))

vi.mock('../components/layout/Dashboard', () => ({
  default: () => <div data-testid="dashboard">Dashboard</div>,
}))

import App from '../App'
import { useStore } from '../store'

describe('App routing', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows login page at /login route when unauthenticated', () => {
    useStore.mockReturnValue(null)
    render(<MemoryRouter initialEntries={['/login']}><App /></MemoryRouter>)
    expect(screen.getByTestId('login-page')).toBeInTheDocument()
  })

  it('redirects to login when unauthenticated user visits protected route', () => {
    useStore.mockReturnValue(null)
    render(<MemoryRouter initialEntries={['/dashboard']}><App /></MemoryRouter>)
    expect(screen.queryByTestId('dashboard')).not.toBeInTheDocument()
  })

  it('shows dashboard when user is authenticated', () => {
    useStore.mockReturnValue('mock-jwt-token')
    render(<MemoryRouter initialEntries={['/']}><App /></MemoryRouter>)
    expect(screen.getByTestId('dashboard')).toBeInTheDocument()
  })
})
