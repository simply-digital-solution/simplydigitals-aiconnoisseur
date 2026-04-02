import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../store', () => ({ useStore: vi.fn() }))

vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual }
})

import Layout from '../components/layout/Layout'
import { useStore } from '../store'

const mockSetActiveSection = vi.fn()
const mockClearAuth = vi.fn()

function makeStore({ activeSection = 'upload', activeDataset = null, user = null } = {}) {
  const state = { activeSection, setActiveSection: mockSetActiveSection, clearAuth: mockClearAuth, activeDataset, user }
  return (selector) => (typeof selector === 'function' ? selector(state) : state)
}

function renderLayout(storeOpts = {}) {
  useStore.mockImplementation(makeStore(storeOpts))
  return render(
    <MemoryRouter>
      <Layout><div data-testid="child">Content</div></Layout>
    </MemoryRouter>
  )
}

describe('Layout sidebar nav', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all nav items', () => {
    renderLayout()
    expect(screen.getByText('Data Upload')).toBeInTheDocument()
    expect(screen.getByText('Data Explorer')).toBeInTheDocument()
    expect(screen.getByText('Visualisations')).toBeInTheDocument()
    expect(screen.getByText('Preprocessing')).toBeInTheDocument()
    expect(screen.getByText('A/B Testing')).toBeInTheDocument()
  })

  it('all nav items are visible (white text, not hidden)', () => {
    renderLayout()
    const items = ['Data Upload', 'Data Explorer', 'Visualisations', 'Preprocessing', 'A/B Testing']
    items.forEach((label) => {
      const el = screen.getByText(label)
      expect(el).toBeInTheDocument()
      expect(el).toBeVisible()
    })
  })

  it('locked nav items (no dataset) are still visible', () => {
    renderLayout({ activeDataset: null })
    // All items except upload are "locked" without a dataset
    expect(screen.getByText('Data Explorer')).toBeVisible()
    expect(screen.getByText('Visualisations')).toBeVisible()
    expect(screen.getByText('Preprocessing')).toBeVisible()
    expect(screen.getByText('A/B Testing')).toBeVisible()
  })

  it('active nav item has purple background class', () => {
    renderLayout({ activeSection: 'upload' })
    const uploadBtn = screen.getByText('Data Upload').closest('button')
    expect(uploadBtn.className).toContain('bg-purple-500')
  })

  it('inactive unlocked nav item does not have active purple background', () => {
    renderLayout({ activeSection: 'upload', activeDataset: { name: 'test.csv', row_count: 100, column_count: 5 } })
    const explorerBtn = screen.getByText('Data Explorer').closest('button')
    expect(explorerBtn.className).not.toContain('bg-purple-500/25')
  })

  it('clicking an unlocked nav item calls setActiveSection', async () => {
    renderLayout({ activeDataset: { name: 'test.csv', row_count: 100, column_count: 5 } })
    await userEvent.click(screen.getByText('Data Explorer').closest('button'))
    expect(mockSetActiveSection).toHaveBeenCalledWith('explorer')
  })

  it('clicking a locked nav item does NOT call setActiveSection', async () => {
    renderLayout({ activeDataset: null })
    await userEvent.click(screen.getByText('Data Explorer').closest('button'))
    expect(mockSetActiveSection).not.toHaveBeenCalled()
  })

  it('renders sign out button', () => {
    renderLayout()
    expect(screen.getByText('Sign out')).toBeInTheDocument()
  })

  it('clicking sign out calls clearAuth', async () => {
    renderLayout()
    await userEvent.click(screen.getByText('Sign out'))
    expect(mockClearAuth).toHaveBeenCalledOnce()
  })

  it('renders children in main area', () => {
    renderLayout()
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })
})

describe('Layout sidebar user display', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows user full name when user is set', () => {
    renderLayout({ user: { full_name: 'Jane Doe', email: 'jane@example.com' } })
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
  })

  it('shows user email when user is set', () => {
    renderLayout({ user: { full_name: 'Jane Doe', email: 'jane@example.com' } })
    expect(screen.getByText('jane@example.com')).toBeInTheDocument()
  })

  it('does not show user section when user is null', () => {
    renderLayout({ user: null })
    expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument()
  })

  it('shows active dataset name when dataset is set', () => {
    renderLayout({ activeDataset: { name: 'sales.csv', row_count: 1000, column_count: 10 } })
    expect(screen.getByText('sales.csv')).toBeInTheDocument()
  })

  it('does not show active dataset section when no dataset', () => {
    renderLayout({ activeDataset: null })
    expect(screen.queryByText('Active Dataset')).not.toBeInTheDocument()
  })
})
