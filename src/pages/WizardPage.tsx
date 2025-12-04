import { WizardContainer } from '@/components/wizard/WizardContainer'
import { Header } from '@/components/ui/Header'

export function WizardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black">
      <Header showBack />

      {/* Wizard */}
      <main className="px-4 py-8">
        <WizardContainer />
      </main>
    </div>
  )
}
