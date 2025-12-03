import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { WizardHook } from '@/hooks/useWizard'
import { STYLES, Style } from '@/types'
import { ArrowLeft, ArrowRight } from 'lucide-react'

interface StyleStepProps {
  wizard: WizardHook
}

const styleLabels: Record<Style, string> = {
  'cartoon': 'Cartoon',
  'realistic': 'Realistic',
  'anime': 'Anime',
  'pixel-art': 'Pixel Art',
  'watercolor': 'Watercolor',
  'oil-painting': 'Oil Painting',
  'cyberpunk': 'Cyberpunk',
  'vintage': 'Vintage',
  'pop-art': 'Pop Art',
  'custom': 'Custom',
}

const styleEmojis: Record<Style, string> = {
  'cartoon': '🎨',
  'realistic': '📸',
  'anime': '🌸',
  'pixel-art': '👾',
  'watercolor': '🖌️',
  'oil-painting': '🖼️',
  'cyberpunk': '🤖',
  'vintage': '📻',
  'pop-art': '💥',
  'custom': '✨',
}

export function StyleStep({ wizard }: StyleStepProps) {
  const { state, updateState, nextStep, prevStep } = wizard

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">
        Choose your style
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {STYLES.map((style) => (
          <button
            key={style}
            onClick={() => updateState({ style })}
            className={`
              p-4 rounded-xl border transition-all text-center
              ${state.style === style
                ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500'
                : 'bg-white/5 border-white/10 hover:border-white/30'
              }
            `}
          >
            <div className="text-2xl mb-2">{styleEmojis[style]}</div>
            <div className="text-white text-sm font-medium">{styleLabels[style]}</div>
          </button>
        ))}
      </div>

      {state.style === 'custom' && (
        <div className="max-w-md mx-auto">
          <Input
            placeholder="Describe your custom style..."
            value={state.customStyle}
            onChange={(e) => updateState({ customStyle: e.target.value })}
            maxLength={100}
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
          />
          <p className="text-gray-500 text-xs mt-2 text-right">
            {state.customStyle.length}/100
          </p>
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
          disabled={state.style === 'custom' && !state.customStyle.trim()}
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
        >
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
