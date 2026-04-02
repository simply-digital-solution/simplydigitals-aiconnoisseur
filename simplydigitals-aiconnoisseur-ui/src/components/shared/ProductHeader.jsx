import { useNavigate } from 'react-router-dom'
import { ChevronLeft, LayoutGrid } from 'lucide-react'

export default function ProductHeader() {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate('/app')}
      data-testid="product-header-back"
      className="flex items-center gap-1.5 text-ink-500 hover:text-ink-200 text-xs transition-colors group">
      <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
      <LayoutGrid className="w-3.5 h-3.5" />
      <span>All Products</span>
    </button>
  )
}
