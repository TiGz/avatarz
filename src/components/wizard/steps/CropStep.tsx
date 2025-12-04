import { Button } from '@/components/ui/button'
import { WizardHook } from '@/hooks/useWizard'
import { AvatarOptions } from '@/types'
import { ArrowLeft, ArrowRight, User, UserCircle } from 'lucide-react'

interface CropStepProps {
  wizard: WizardHook
  options: AvatarOptions | null
}

const cropIcons: Record<string, React.ReactNode> = {
  headshot: <UserCircle className="w-8 h-8 text-white" />,
  half: (
    <div className="w-8 h-8 flex items-end justify-center">
      <User className="w-6 h-6 text-white" />
    </div>
  ),
  full: <User className="w-8 h-8 text-white" />,
}

export function CropStep({ wizard, options }: CropStepProps) {
  const { state, updateState, nextStep, prevStep } = wizard
  const cropTypes = options?.cropTypes || []

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">
        Select body crop
      </h2>
      <p className="text-gray-400 text-center">
        How much of the body should be shown?
      </p>

      <div className="flex justify-center gap-4 flex-wrap">
        {cropTypes.map((crop) => (
          <button
            key={crop.id}
            onClick={() => updateState({ cropType: crop.id })}
            className={`
              p-6 rounded-2xl border-2 transition-all text-center w-32
              ${state.cropType === crop.id
                ? 'bg-gradient-to-br from-purple-500/30 to-pink-500/30 border-purple-400 ring-2 ring-purple-400/50 scale-105'
                : 'bg-white/5 border-white/10 hover:border-white/30 hover:bg-white/10'
              }
            `}
          >
            <div className="flex justify-center mb-3">
              <div className={`
                rounded-xl p-3
                ${state.cropType === crop.id
                  ? 'bg-gradient-to-br from-purple-500 to-pink-500'
                  : 'bg-white/10'
                }
              `}>
                {cropIcons[crop.id] || <User className="w-8 h-8 text-white" />}
              </div>
            </div>
            <div className="text-white font-medium">{crop.label}</div>
            <div className="text-gray-500 text-xs mt-1">{crop.description}</div>
          </button>
        ))}
      </div>

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
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
        >
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
