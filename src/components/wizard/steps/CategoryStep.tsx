import { Button } from '@/components/ui/button'
import { WizardHook } from '@/hooks/useWizard'
import { AvatarOptions } from '@/types'
import { ArrowLeft, ArrowRight } from 'lucide-react'

interface CategoryStepProps {
  wizard: WizardHook
  options: AvatarOptions | null
}

export function CategoryStep({ wizard, options }: CategoryStepProps) {
  const { state, updateState, nextStep, prevStep } = wizard
  const categories = options?.categories || []

  const canContinue = !!state.category

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">
          Choose a category
        </h2>
        <p className="text-gray-400 mt-2">
          What type of avatar would you like?
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => updateState({ category: category.id })}
            className={`
              p-5 rounded-xl border-2 transition-all text-left
              ${state.category === category.id
                ? 'bg-gradient-to-br from-purple-500/30 to-pink-500/30 border-purple-400 ring-2 ring-purple-400/50 scale-105'
                : 'bg-white/5 border-white/10 hover:border-white/30 hover:bg-white/10'
              }
            `}
          >
            <div className="text-3xl mb-2">{category.emoji}</div>
            <div className="text-white font-semibold">{category.label}</div>
            <div className="text-gray-400 text-sm mt-1">{category.description}</div>
          </button>
        ))}
      </div>

      <div className="flex justify-center gap-4 pt-4">
        <Button
          variant="outline"
          onClick={prevStep}
          className="border-white/20 text-white hover:bg-white/10"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={nextStep}
          disabled={!canContinue}
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
        >
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
