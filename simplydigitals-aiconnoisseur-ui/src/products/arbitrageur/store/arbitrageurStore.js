import { create } from 'zustand'

export const useArbitrageurStore = create((set) => ({
  // Navigation
  activeSection: 'charts',
  setActiveSection: (s) => set({ activeSection: s }),

  // Watchlist
  watchlist: [],
  addToWatchlist: (ticker) =>
    set((state) => ({
      watchlist: state.watchlist.find((t) => t.symbol === ticker.symbol)
        ? state.watchlist
        : [...state.watchlist, ticker],
    })),
  removeFromWatchlist: (symbol) =>
    set((state) => ({
      watchlist: state.watchlist.filter((t) => t.symbol !== symbol),
      chartSymbols: state.chartSymbols.filter((s) => s !== symbol),
    })),

  // Chart
  chartSymbols: [],
  chartRange: '1Y',
  setChartRange: (r) => set({ chartRange: r }),
  addToChart: (symbol) =>
    set((state) => ({
      chartSymbols: state.chartSymbols.includes(symbol)
        ? state.chartSymbols
        : [...state.chartSymbols, symbol],
    })),
  removeFromChart: (symbol) =>
    set((state) => ({
      chartSymbols: state.chartSymbols.filter((s) => s !== symbol),
    })),

  // Price cache — { AAPL: { history: [...bars], intraday: [...bars] } }
  priceCache: {},
  setPriceCache: (symbol, type, data) =>
    set((state) => ({
      priceCache: {
        ...state.priceCache,
        [symbol]: { ...(state.priceCache[symbol] || {}), [type]: data },
      },
    })),

  // Portfolio
  portfolio: [],
  setPortfolio: (portfolio) => set({ portfolio }),

  // Triggers
  triggers: [],
  setTriggers: (triggers) => set({ triggers }),
  addTrigger: (trigger) =>
    set((state) => ({ triggers: [...state.triggers, trigger] })),
  removeTrigger: (id) =>
    set((state) => ({ triggers: state.triggers.filter((t) => t.id !== id) })),
  updateTrigger: (id, patch) =>
    set((state) => ({
      triggers: state.triggers.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    })),
}))
