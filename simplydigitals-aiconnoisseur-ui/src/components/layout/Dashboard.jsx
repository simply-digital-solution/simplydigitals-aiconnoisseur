import { useStore } from '../../store'
import UploadSection from '../upload/UploadSection'
import ExplorerSection from '../explorer/ExplorerSection'
import PlotsSection from '../plots/PlotsSection'
import PreprocessingSection from '../preprocessing/PreprocessingSection'
import ABTestingSection from '../abtesting/ABTestingSection'
import TechShowcasePage from '../showcase/TechShowcasePage'

export default function Dashboard() {
  const activeSection = useStore((s) => s.activeSection)

  return (
    <div className="p-6 min-h-full">
      {activeSection === 'upload'        && <UploadSection />}
      {activeSection === 'explorer'      && <ExplorerSection />}
      {activeSection === 'plots'         && <PlotsSection />}
      {activeSection === 'preprocessing' && <PreprocessingSection />}
      {activeSection === 'abtesting'     && <ABTestingSection />}
      {activeSection === 'showcase'      && <TechShowcasePage />}
    </div>
  )
}
