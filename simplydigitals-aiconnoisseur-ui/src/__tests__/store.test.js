import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'

// localStorage is mocked globally in setup.js
// Import store after setup runs
import { useStore } from '../store'

describe('Zustand store', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.clearAllMocks()
    act(() => {
      useStore.setState({
        token: null,
        user: null,
        datasets: [],
        activeDataset: null,
      })
    })
  })

  it('initialises with no token when localStorage is empty', () => {
    const { result } = renderHook(() => useStore((s) => s.token))
    expect(result.current).toBeFalsy()
  })

  it('setToken stores the token', () => {
    const { result } = renderHook(() => useStore())
    act(() => { result.current.setToken('jwt-123') })
    expect(useStore.getState().token).toBe('jwt-123')
    expect(window.localStorage.setItem).toHaveBeenCalledWith('token', 'jwt-123')
  })

  it('clearAuth removes the token', () => {
    act(() => {
      useStore.setState({ token: 'some-token' })
      useStore.getState().clearAuth()
    })
    expect(useStore.getState().token).toBeNull()
    expect(window.localStorage.removeItem).toHaveBeenCalledWith('token')
  })

  it('setActiveSection updates the section', () => {
    const { result } = renderHook(() => useStore())
    act(() => { result.current.setActiveSection('explorer') })
    expect(useStore.getState().activeSection).toBe('explorer')
  })
})
