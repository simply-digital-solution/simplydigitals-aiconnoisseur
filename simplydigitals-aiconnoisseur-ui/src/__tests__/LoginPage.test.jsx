import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn(), loading: vi.fn() },
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => vi.fn() }
})

vi.mock('../store', () => ({
  useStore: vi.fn((selector) => {
    const state = { setToken: vi.fn(), token: null, clearAuth: vi.fn() }
    return typeof selector === 'function' ? selector(state) : state
  }),
}))

vi.mock('../utils/api', () => ({
  authApi: { login: vi.fn(), register: vi.fn() },
}))

vi.mock('../hooks/useOAuth', () => ({
  useOAuth: () => ({
    loginWithGoogle: vi.fn(),
    loginWithFacebook: vi.fn(),
    loadingProvider: null,
  }),
}))

import LoginPage from '../components/layout/LoginPage'
import { authApi } from '../utils/api'

function renderLogin() {
  return render(<MemoryRouter><LoginPage /></MemoryRouter>)
}

describe('LoginPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders the page', () => {
    const { container } = renderLogin()
    expect(container.innerHTML.length).toBeGreaterThan(100)
  })

  it('renders ML Analytics Platform text', () => {
    const { container } = renderLogin()
    expect(container.innerHTML).toContain('ML Analytics Platform')
  })

  it('renders email input', () => {
    renderLogin()
    expect(screen.getByPlaceholderText(/you@example.com/i)).toBeInTheDocument()
  })

  it('renders password input', () => {
    renderLogin()
    expect(document.querySelector('input[type="password"]')).not.toBeNull()
  })

  it('renders login tab', () => {
    renderLogin()
    expect(screen.getByText('login')).toBeInTheDocument()
  })

  it('renders register tab', () => {
    renderLogin()
    expect(screen.getByText('register')).toBeInTheDocument()
  })

  it('renders a submit button', () => {
    renderLogin()
    expect(document.querySelector('button[type="submit"]')).not.toBeNull()
  })

  it('switches to register mode when register tab clicked', async () => {
    renderLogin()
    const registerTab = screen.getByText('register')
    await userEvent.click(registerTab)
    expect(document.querySelector('input[placeholder="Jane Smith"]')).not.toBeNull()
  })

  it('toggles password visibility', async () => {
    renderLogin()
    const passwordInput = document.querySelector('input[type="password"]')
    const toggleBtn = passwordInput.parentElement.querySelector('button')
    await userEvent.click(toggleBtn)
    expect(document.querySelector('input[type="text"]')).not.toBeNull()
  })

  it('calls login API when form submitted', async () => {
    authApi.login.mockResolvedValue({ data: { access_token: 'tok' } })
    renderLogin()

    await userEvent.type(screen.getByPlaceholderText(/you@example.com/i), 'a@b.com')
    await userEvent.type(document.querySelector('input[type="password"]'), 'pass1234')

    const submitBtn = document.querySelector('button[type="submit"]')
    await act(async () => { await userEvent.click(submitBtn) })

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith({
        email: 'a@b.com',
        password: 'pass1234',
      })
    }, { timeout: 3000 })
  })
})
