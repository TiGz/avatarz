import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { WizardContainer } from '@/components/wizard/WizardContainer'
import { ArrowLeft, Sparkles } from 'lucide-react'

export function WizardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black">
      {/* Header */}
      <header className="p-4 flex items-center gap-4">
        <Link to="/">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white">Avatarz</span>
        </div>
      </header>

      {/* Wizard */}
      <main className="px-4 py-8">
        <WizardContainer />
      </main>
    </div>
  )
}
