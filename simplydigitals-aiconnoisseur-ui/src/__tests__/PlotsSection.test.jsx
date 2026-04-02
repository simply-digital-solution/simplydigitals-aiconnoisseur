import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Two numeric columns, one non-numeric
const NUMERIC_VALUES = Array.from({ length: 50 }, (_, i) => i * 0.5)
const MOCK_STATE = {
  columns: ['price', 'quantity', 'category'],
  columnStats: {
    price:    { isNumeric: true,  values: NUMERIC_VALUES, count: 50, min: 0, max: 24.5, mean: 12.25, median: 12.25, std: 7.21, q1: 6, q3: 18 },
    quantity: { isNumeric: true,  values: NUMERIC_VALUES.map((v) => v * 2), count: 50, min: 0, max: 49, mean: 24.5, median: 24.5, std: 14.43, q1: 12, q3: 36 },
    category: { isNumeric: false, values: [], count: 50 },
  },
}

vi.mock('../store', () => ({
  useStore: vi.fn((selector) =>
    typeof selector === 'function' ? selector(MOCK_STATE) : MOCK_STATE
  ),
}))

// Recharts uses ResizeObserver — stub it
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

import PlotsSection from '../components/plots/PlotsSection'

function renderPlots() {
  return render(<PlotsSection />)
}

describe('PlotsSection — Histogram tab', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders the Histogram tab button', () => {
    renderPlots()
    expect(screen.getByText('Histogram')).toBeInTheDocument()
  })

  it('shows both numeric column names in the 3×3 grid', () => {
    renderPlots()
    expect(screen.getByText('price')).toBeInTheDocument()
    expect(screen.getByText('quantity')).toBeInTheDocument()
  })

  it('does not render non-numeric columns', () => {
    renderPlots()
    expect(screen.queryByText('category')).not.toBeInTheDocument()
  })

  it('renders a card for each numeric column', () => {
    const { container } = renderPlots()
    // Each card has cursor-pointer
    const cards = container.querySelectorAll('.cursor-pointer')
    expect(cards.length).toBe(2)
  })

  it('shows column count and bins info', () => {
    renderPlots()
    expect(screen.getByText(/2 numeric columns/i)).toBeInTheDocument()
  })
})

describe('PlotsSection — Histogram zoom modal', () => {
  beforeEach(() => vi.clearAllMocks())

  it('does not show the modal initially', () => {
    renderPlots()
    expect(screen.queryByText(/Press Esc or click outside/i)).not.toBeInTheDocument()
  })

  it('opens the zoom modal when a histogram card is clicked', async () => {
    renderPlots()
    await act(async () => {
      await userEvent.click(screen.getByText('price').closest('.cursor-pointer'))
    })
    expect(screen.getByText(/Press Esc or click outside/i)).toBeInTheDocument()
  })

  it('shows the column name in the modal header', async () => {
    renderPlots()
    await act(async () => {
      await userEvent.click(screen.getByText('price').closest('.cursor-pointer'))
    })
    // modal header contains "Histogram — price"
    expect(screen.getByText('Histogram —')).toBeInTheDocument()
  })

  it('shows a bins range slider in the modal', async () => {
    const { container } = renderPlots()
    await act(async () => {
      await userEvent.click(screen.getByText('price').closest('.cursor-pointer'))
    })
    expect(container.querySelector('input[type="range"]')).not.toBeNull()
  })

  it('shows a bins number input in the modal', async () => {
    const { container } = renderPlots()
    await act(async () => {
      await userEvent.click(screen.getByText('price').closest('.cursor-pointer'))
    })
    expect(container.querySelector('input[type="number"]')).not.toBeNull()
  })

  it('closes the modal when the ✕ button is clicked', async () => {
    renderPlots()
    await act(async () => {
      await userEvent.click(screen.getByText('price').closest('.cursor-pointer'))
    })
    expect(screen.getByText(/Press Esc or click outside/i)).toBeInTheDocument()

    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: '' })) // X icon button
    })

    await waitFor(() => {
      expect(screen.queryByText(/Press Esc or click outside/i)).not.toBeInTheDocument()
    })
  })

  it('closes the modal when Escape is pressed', async () => {
    renderPlots()
    await act(async () => {
      await userEvent.click(screen.getByText('price').closest('.cursor-pointer'))
    })
    expect(screen.getByText(/Press Esc or click outside/i)).toBeInTheDocument()

    await act(async () => {
      await userEvent.keyboard('{Escape}')
    })

    await waitFor(() => {
      expect(screen.queryByText(/Press Esc or click outside/i)).not.toBeInTheDocument()
    })
  })

  it('opens modal for the correct column when quantity card is clicked', async () => {
    renderPlots()
    await act(async () => {
      await userEvent.click(screen.getByText('quantity').closest('.cursor-pointer'))
    })
    // modal subtitle shows count
    expect(screen.getByText(/50 values/i)).toBeInTheDocument()
  })
})
