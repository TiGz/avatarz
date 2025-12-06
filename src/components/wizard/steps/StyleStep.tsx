import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { WizardHook } from '@/hooks/useWizard'
import { useStylesForCategory } from '@/hooks/useStylesForCategory'
import { usePublicAvatarsByStyle } from '@/hooks/usePublicAvatarsByStyle'
import { AvatarOptions, StyleOption } from '@/types'
import { ArrowLeft, ArrowRight, Loader2, Info, Sparkles } from 'lucide-react'
import { PromptModal } from '../PromptModal'

interface StyleStepProps {
  wizard: WizardHook
  options: AvatarOptions | null
}

export function StyleStep({ wizard, options }: StyleStepProps) {
  const { state, updateState, nextStep, prevStep, initializeInputDefaults } = wizard
  const [promptModalStyle, setPromptModalStyle] = useState<StyleOption | null>(null)

  // Lazy-load styles for the selected category
  const { styles: categoryStyles, loading, error } = useStylesForCategory(state.category)

  // Get current category label for display
  const currentCategory = options?.categories.find(c => c.id === state.category)

  // Get the currently selected style object
  const selectedStyle = categoryStyles.find(s => s.id === state.style) || null

  // Fetch examples for the selected style
  const { examples, loading: examplesLoading } = usePublicAvatarsByStyle(state.style)

  // Handler for selecting a style - also initializes defaults
  const handleStyleSelect = (style: StyleOption) => {
    updateState({ style: style.id })
    if (style.inputSchema) {
      initializeInputDefaults(style.inputSchema)
    }
  }

  // Auto-select first style when styles load and none selected
  useEffect(() => {
    if (categoryStyles.length > 0 && !state.style) {
      const firstStyle = categoryStyles[0]
      updateState({ style: firstStyle.id })
      if (firstStyle.inputSchema) {
        initializeInputDefaults(firstStyle.inputSchema)
      }
    }
  }, [categoryStyles, state.style, updateState, initializeInputDefaults])

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
          className="bg-transparent border-white/20 text-white hover:bg-white/10"
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
        {categoryStyles.map((style) => {
          const isSpecial = !style.useLegacyOptions
          const isSelected = state.style === style.id

          return (
            <button
              key={style.id}
              onClick={() => handleStyleSelect(style)}
              className={`
                relative p-4 rounded-xl border-2 transition-all text-center
                ${isSelected
                  ? 'bg-gradient-to-br from-purple-500/30 to-pink-500/30 border-purple-400 ring-2 ring-purple-400/50 scale-105'
                  : isSpecial
                    ? 'bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30 hover:border-purple-400/50 hover:bg-purple-500/20'
                    : 'bg-white/5 border-white/10 hover:border-white/30 hover:bg-white/10'
                }
              `}
            >
              {/* Special badge */}
              {isSpecial && (
                <div className="absolute -top-2 -right-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-lg">
                  <Sparkles className="w-3 h-3" />
                  Special
                </div>
              )}
              <div className="text-2xl mb-2">{style.emoji}</div>
              <div className="text-white text-sm font-medium">{style.label}</div>
              {/* Multi-photo indicator */}
              {style.maxPhotos > 1 && (
                <div className="text-[10px] text-purple-300 mt-1">
                  {style.minPhotos}-{style.maxPhotos} photos
                </div>
              )}
            </button>
          )
        })}
      </div>

      {categoryStyles.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-400">No styles available for this category</p>
        </div>
      )}

      {/* Examples Preview Section */}
      {selectedStyle && (
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-medium flex items-center gap-2">
              <span className="text-xl">{selectedStyle.emoji}</span>
              {selectedStyle.label} Examples
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPromptModalStyle(selectedStyle)}
              className="text-gray-400 hover:text-white hover:bg-white/10"
            >
              <Info className="h-4 w-4 mr-1" />
              View Prompt
            </Button>
          </div>

          {examplesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
            </div>
          ) : examples.length > 0 ? (
            <div className="flex gap-2 sm:gap-3 justify-center flex-wrap">
              {examples.map((example) => (
                <div
                  key={example.id}
                  className="w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-lg overflow-hidden bg-black/20 flex-shrink-0"
                >
                  <img
                    src={example.thumbnailUrl}
                    alt={`${selectedStyle.label} example`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-6 text-sm">
              No examples yet for this style
            </p>
          )}
        </div>
      )}

      {/* Prompt Modal */}
      <PromptModal
        isOpen={promptModalStyle !== null}
        onClose={() => setPromptModalStyle(null)}
        styleName={promptModalStyle?.label || ''}
        prompt={promptModalStyle?.prompt || ''}
      />

      <div className="flex justify-center gap-4 pt-4">
        <Button
          variant="outline"
          onClick={prevStep}
          className="bg-transparent border-white/20 text-white hover:bg-white/10"
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
