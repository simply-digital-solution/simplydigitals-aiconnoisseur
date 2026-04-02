import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockSetActiveDataset = vi.fn()
const mockSetActiveSection = vi.fn()

vi.mock('../store', () => ({
  useStore: vi.fn((selector) => {
    const state = {
      setActiveDataset: mockSetActiveDataset,
      setActiveSection: mockSetActiveSection,
    }
    return typeof selector === 'function' ? selector(state) : state
  }),
}))

vi.mock('../utils/api', () => ({
  datasetApi: { history: vi.fn(), delete: vi.fn() },
}))

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

import HistorySection from '../components/upload/HistorySection'
import { datasetApi } from '../utils/api'
import toast from 'react-hot-toast'

const MOCK_DATASETS = [
  { id: '1', name: 'sales-2024', row_count: 1200, column_count: 8, file_size_bytes: 51200, created_at: '2024-06-15T10:00:00Z' },
  { id: '2', name: 'marketing-q1', row_count: 340, column_count: 5, file_size_bytes: 8192, created_at: '2024-06-10T08:30:00Z' },
]

function renderHistory() {
  return render(<HistorySection />)
}

describe('HistorySection', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders nothing while loading', () => {
    datasetApi.history.mockReturnValue(new Promise(() => {})) // never resolves
    const { container } = renderHistory()
    expect(container.querySelector('.animate-spin')).not.toBeNull()
  })

  it('renders nothing when history is empty', async () => {
    datasetApi.history.mockResolvedValue({ data: [] })
    const { container } = renderHistory()
    await waitFor(() => expect(datasetApi.history).toHaveBeenCalled())
    // no history card rows
    expect(container.querySelector('[class*="space-y-2"]')).toBeNull()
  })

  it('renders dataset names from history', async () => {
    datasetApi.history.mockResolvedValue({ data: MOCK_DATASETS })
    renderHistory()
    await waitFor(() => {
      expect(screen.getByText('sales-2024')).toBeInTheDocument()
      expect(screen.getByText('marketing-q1')).toBeInTheDocument()
    })
  })

  it('shows row and column counts', async () => {
    datasetApi.history.mockResolvedValue({ data: MOCK_DATASETS })
    renderHistory()
    await waitFor(() => {
      expect(screen.getByText(/1,200 rows · 8 cols/i)).toBeInTheDocument()
    })
  })

  it('shows the badge with dataset count', async () => {
    datasetApi.history.mockResolvedValue({ data: MOCK_DATASETS })
    renderHistory()
    await waitFor(() => {
      expect(screen.getByText('2 / 5')).toBeInTheDocument()
    })
  })

  it('renders a Use button for each dataset', async () => {
    datasetApi.history.mockResolvedValue({ data: MOCK_DATASETS })
    renderHistory()
    await waitFor(() => {
      expect(screen.getAllByText('Use')).toHaveLength(2)
    })
  })

  it('calls setActiveDataset and setActiveSection when Use is clicked', async () => {
    datasetApi.history.mockResolvedValue({ data: MOCK_DATASETS })
    renderHistory()
    await waitFor(() => screen.getAllByText('Use'))

    await act(async () => {
      await userEvent.click(screen.getAllByText('Use')[0])
    })

    expect(mockSetActiveDataset).toHaveBeenCalledWith(MOCK_DATASETS[0])
    expect(mockSetActiveSection).toHaveBeenCalledWith('explorer')
  })

  it('shows a success toast when Use is clicked', async () => {
    datasetApi.history.mockResolvedValue({ data: MOCK_DATASETS })
    renderHistory()
    await waitFor(() => screen.getAllByText('Use'))

    await act(async () => {
      await userEvent.click(screen.getAllByText('Use')[0])
    })

    expect(toast.success).toHaveBeenCalledWith(`Loaded "${MOCK_DATASETS[0].name}"`)
  })

  it('shows formatted file size in KB', async () => {
    datasetApi.history.mockResolvedValue({ data: MOCK_DATASETS })
    renderHistory()
    await waitFor(() => {
      expect(screen.getByText('50.0 KB')).toBeInTheDocument() // 51200 bytes
    })
  })

  it('shows an error toast when the API call fails', async () => {
    datasetApi.history.mockRejectedValue(new Error('network'))
    renderHistory()
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Could not load dataset history')
    })
  })

  // ── Delete ───────────────────────────────────────────────────────────────

  it('renders a delete button for each dataset', async () => {
    datasetApi.history.mockResolvedValue({ data: MOCK_DATASETS })
    renderHistory()
    await waitFor(() => screen.getAllByText('Use'))
    expect(screen.getAllByTestId(/^delete-/)).toHaveLength(2)
  })

  it('calls datasetApi.delete with the correct id', async () => {
    datasetApi.history.mockResolvedValue({ data: MOCK_DATASETS })
    datasetApi.delete.mockResolvedValue({})
    renderHistory()
    await waitFor(() => screen.getAllByText('Use'))

    await act(async () => {
      await userEvent.click(screen.getByTestId(`delete-${MOCK_DATASETS[0].id}`))
    })

    await waitFor(() => {
      expect(datasetApi.delete).toHaveBeenCalledWith(MOCK_DATASETS[0].id)
    })
  })

  it('removes the deleted dataset from the list', async () => {
    datasetApi.history.mockResolvedValue({ data: MOCK_DATASETS })
    datasetApi.delete.mockResolvedValue({})
    renderHistory()
    await waitFor(() => screen.getByText('sales-2024'))

    await act(async () => {
      await userEvent.click(screen.getByTestId(`delete-${MOCK_DATASETS[0].id}`))
    })

    await waitFor(() => {
      expect(screen.queryByText('sales-2024')).not.toBeInTheDocument()
      expect(screen.getByText('marketing-q1')).toBeInTheDocument()
    })
  })

  it('shows a success toast after deleting', async () => {
    datasetApi.history.mockResolvedValue({ data: MOCK_DATASETS })
    datasetApi.delete.mockResolvedValue({})
    renderHistory()
    await waitFor(() => screen.getAllByText('Use'))

    await act(async () => {
      await userEvent.click(screen.getByTestId(`delete-${MOCK_DATASETS[0].id}`))
    })

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(`Deleted "${MOCK_DATASETS[0].name}"`)
    })
  })

  it('shows an error toast when delete fails', async () => {
    datasetApi.history.mockResolvedValue({ data: MOCK_DATASETS })
    datasetApi.delete.mockRejectedValue(new Error('server error'))
    renderHistory()
    await waitFor(() => screen.getAllByText('Use'))

    await act(async () => {
      await userEvent.click(screen.getByTestId(`delete-${MOCK_DATASETS[0].id}`))
    })

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Could not delete dataset')
    })
  })
})
