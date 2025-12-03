import { Button } from '@/components/ui/button'
import { WizardHook } from '@/hooks/useWizard'
import { CROP_TYPES, CropType } from '@/types'
import { ArrowLeft, ArrowRight, User, UserCircle } from 'lucide-react'

interface CropStepProps {
  wizard: WizardHook
}

const cropLabels: Record<CropType, string> = {
  'headshot': 'Headshot',
  'half': 'Half Body',
  'full': 'Full Body',
}

const cropDescriptions: Record<CropType, string> = {
  'headshot': 'Face and shoulders',
  'half': 'Waist up',
  'full': 'Entire body',
}

export function CropStep({ wizard }: CropStepProps) {
  const { state, updateState, nextStep, prevStep } = wizard

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">
        Select body crop
      </h2>
      <p className="text-gray-400 text-center">
        How much of the body should be shown?
      </p>

      <div className="flex justify-center gap-4 flex-wrap">
        {CROP_TYPES.map((crop) => (
          <button
            key={crop}
            onClick={() => updateState({ cropType: crop })}
            className={`
              p-6 rounded-2xl border transition-all text-center w-32
              ${state.cropType === crop
                ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500'
                : 'bg-white/5 border-white/10 hover:border-white/30'
              }
            `}
          >
            <div className="flex justify-center mb-3">
              <div className={`
                rounded-xl p-3
                ${state.cropType === crop
                  ? 'bg-gradient-to-br from-purple-500 to-pink-500'
                  : 'bg-white/10'
                }
              `}>
                {crop === 'headshot' && <UserCircle className="w-8 h-8 text-white" />}
                {crop === 'half' && (
                  <div className="w-8 h-8 flex items-end justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                )}
                {crop === 'full' && <User className="w-8 h-8 text-white" />}
              </div>
            </div>
            <div className="text-white font-medium">{cropLabels[crop]}</div>
            <div className="text-gray-500 text-xs mt-1">{cropDescriptions[crop]}</div>
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
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
        >
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
