/**
 * Product Registry — single source of truth for all SimplyDigital products.
 *
 * To add a new product:
 *   1. Add one object to PRODUCTS below.
 *   2. Create src/products/<id>/<Id>App.jsx.
 *   Done — AppHub and routing are generated automatically.
 */

import { Cpu, TrendingUp } from 'lucide-react'

export const PRODUCTS = [
  {
    id: 'connoisseur',
    name: 'AI Connoisseur',
    tagline: 'ML Analytics Platform',
    Icon: Cpu,
    color: 'purple',
    path: '/app/connoisseur',
    description:
      'Upload datasets, explore columns, visualise distributions, preprocess features, and run A/B model comparisons.',
    lazy: () => import('./connoisseur/ConnoisseurApp'),
  },
  {
    id: 'arbitrageur',
    name: 'AI Arbitrageur',
    tagline: 'Intelligent Trading Analytics',
    Icon: TrendingUp,
    color: 'amber',
    path: '/app/arbitrageur',
    description:
      'Track tickers, chart historical & intraday prices, manage your portfolio P&L, and automate trade triggers.',
    lazy: () => import('./arbitrageur/ArbitrageurApp'),
  },
]
