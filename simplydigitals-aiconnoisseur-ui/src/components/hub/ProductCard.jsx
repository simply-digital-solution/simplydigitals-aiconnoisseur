import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

const COLOR = {
  purple: {
    iconBg: 'bg-purple-500/15 border-purple-500/30',
    icon:   'text-purple-400',
    hover:  'hover:border-purple-400/50',
    tag:    'text-purple-400',
    arrow:  'text-purple-400',
  },
  amber: {
    iconBg: 'bg-amber-500/15 border-amber-500/30',
    icon:   'text-amber-400',
    hover:  'hover:border-amber-400/50',
    tag:    'text-amber-400',
    arrow:  'text-amber-400',
  },
}

export default function ProductCard({ product }) {
  const navigate = useNavigate()
  const { name, tagline, description, Icon, color, path } = product
  const c = COLOR[color] || COLOR.purple

  return (
    <button
      onClick={() => navigate(path)}
      data-testid={`product-card-${product.id}`}
      className={`group w-full text-left card p-6 ${c.hover} transition-all duration-200 hover:-translate-y-0.5`}>
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-xl ${c.iconBg} border flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-6 h-6 ${c.icon}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1.5">
            <h2 className="font-display font-700 text-ink-50 text-lg leading-tight">{name}</h2>
            <span className={`text-xs font-display font-600 ${c.tag}`}>{tagline}</span>
          </div>
          <p className="text-ink-400 text-sm font-body leading-relaxed">{description}</p>
        </div>
        <ChevronRight className={`w-5 h-5 ${c.arrow} opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5`} />
      </div>
    </button>
  )
}
