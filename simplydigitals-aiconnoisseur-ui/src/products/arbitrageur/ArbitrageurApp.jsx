import { useArbitrageurStore } from './store/arbitrageurStore'
import ArbitrageurLayout from './layout/ArbitrageurLayout'
import ChartSection from './sections/ChartSection'
import WatchlistSection from './sections/WatchlistSection'
import PortfolioSection from './sections/PortfolioSection'
import TriggersSection from './sections/TriggersSection'

export default function ArbitrageurApp() {
  const activeSection = useArbitrageurStore((s) => s.activeSection)

  return (
    <ArbitrageurLayout>
      <div className="p-6 min-h-full">
        {activeSection === 'charts'    && <ChartSection />}
        {activeSection === 'watchlist' && <WatchlistSection />}
        {activeSection === 'portfolio' && <PortfolioSection />}
        {activeSection === 'triggers'  && <TriggersSection />}
      </div>
    </ArbitrageurLayout>
  )
}
