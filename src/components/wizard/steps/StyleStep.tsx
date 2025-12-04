import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { WizardHook } from '@/hooks/useWizard'
import { useStylesForCategory } from '@/hooks/useStylesForCategory'
import { AvatarOptions } from '@/types'
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'

interface StyleStepProps {
  wizard: WizardHook
  options: AvatarOptions | null
}

export function StyleStep({ wizard, options }: StyleStepProps) {
  const { state, updateState, nextStep, prevStep } = wizard

  // Lazy-load styles for the selected category
  const { styles: categoryStyles, loading, error } = useStylesForCategory(state.category)

  // Get current category label for display
  const currentCategory = options?.categories.find(c => c.id === state.category)

  // Auto-select first style when styles load and none selected
  useEffect(() => {
    if (categoryStyles.length > 0 && !state.style) {
      updateState({ style: categoryStyles[0].id })
    }
  }, [categoryStyles, state.style, updateState])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin mb-4" />
        <p className="text-gray-400">Loading styles...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 mb-4">{error}</p>
        <Button
          variant="outline"
          onClick={prevStep}
          className="border-white/20 text-white hover:bg-white/10"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">
          Choose your style
        </h2>
        {currentCategory && (
          <p className="text-gray-400 mt-2">
            {currentCategory.emoji} {currentCategory.label} styles
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {categoryStyles.map((style) => (
          <button
            key={style.id}
            onClick={() => updateState({ style: style.id })}
            className={`
              p-4 rounded-xl border-2 transition-all text-center
              ${state.style === style.id
                ? 'bg-gradient-to-br from-purple-500/30 to-pink-500/30 border-purple-400 ring-2 ring-purple-400/50 scale-105'
                : 'bg-white/5 border-white/10 hover:border-white/30 hover:bg-white/10'
              }
            `}
          >
            <div className="text-2xl mb-2">{style.emoji}</div>
            <div className="text-white text-sm font-medium">{style.label}</div>
          </button>
        ))}
      </div>

      {categoryStyles.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-400">No styles available for this category</p>
        </div>
      )}

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
          disabled={!state.style && categoryStyles.length > 0}
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
        >
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
