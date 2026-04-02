import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../store', () => ({ useStore: vi.fn() }))
vi.mock('../products/registry', () => ({
  PRODUCTS: [
    {
      id: 'connoisseur',
      name: 'AI Connoisseur',
      tagline: 'ML Analytics Platform',
      Icon: () => null,
      color: 'purple',
      path: '/app/connoisseur',
      description: 'ML description',
    },
    {
      id: 'arbitrageur',
      name: 'AI Arbitrageur',
      tagline: 'Trading Analytics',
      Icon: () => null,
      color: 'amber',
      path: '/app/arbitrageur',
      description: 'Trading description',
    },
  ],
}))

import AppHub from '../components/hub/AppHub'
import { useStore } from '../store'

const mockClearAuth = vi.fn()
const mockNavigate = vi.fn()

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useNavigate: () => mockNavigate }
})

function renderHub(user = null) {
  useStore.mockImplementation((selector) => {
    const state = { user, clearAuth: mockClearAuth }
    return typeof selector === 'function' ? selector(state) : state
  })
  return render(<MemoryRouter><AppHub /></MemoryRouter>)
}

describe('AppHub', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders a product card for each registered product', () => {
    renderHub()
    expect(screen.getByTestId('product-card-connoisseur')).toBeInTheDocument()
    expect(screen.getByTestId('product-card-arbitrageur')).toBeInTheDocument()
  })

  it('shows product names', () => {
    renderHub()
    expect(screen.getByText('AI Connoisseur')).toBeInTheDocument()
    expect(screen.getByText('AI Arbitrageur')).toBeInTheDocument()
  })

  it('shows taglines', () => {
    renderHub()
    expect(screen.getByText('ML Analytics Platform')).toBeInTheDocument()
    expect(screen.getByText('Trading Analytics')).toBeInTheDocument()
  })

  it('shows descriptions', () => {
    renderHub()
    expect(screen.getByText('ML description')).toBeInTheDocument()
    expect(screen.getByText('Trading description')).toBeInTheDocument()
  })

  it('navigates to the correct path when a product card is clicked', async () => {
    renderHub()
    await userEvent.click(screen.getByTestId('product-card-arbitrageur'))
    expect(mockNavigate).toHaveBeenCalledWith('/app/arbitrageur')
  })

  it('shows user name when logged in', () => {
    renderHub({ full_name: 'Jane Smith', email: 'jane@example.com' })
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
  })

  it('calls clearAuth when sign out is clicked', async () => {
    renderHub()
    await userEvent.click(screen.getByText('Sign out'))
    expect(mockClearAuth).toHaveBeenCalled()
  })

  it('shows product count in footer', () => {
    renderHub()
    expect(screen.getByText(/2 products/)).toBeInTheDocument()
  })
})
