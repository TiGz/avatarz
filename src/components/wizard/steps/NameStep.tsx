import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { WizardHook } from '@/hooks/useWizard'
import { AvatarOptions } from '@/types'
import { ArrowLeft, ArrowRight } from 'lucide-react'

interface NameStepProps {
  wizard: WizardHook
  options: AvatarOptions | null
}

export function NameStep({ wizard, options }: NameStepProps) {
  const { state, updateState, nextStep, prevStep } = wizard
  const namePlacements = options?.namePlacements || []

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">
        Add your name?
      </h2>
      <p className="text-gray-400 text-center">
        Optionally overlay your name on the avatar
      </p>

      {/* Toggle */}
      <div className="flex justify-center gap-4">
        <Button
          variant={!state.showName ? 'default' : 'outline'}
          onClick={() => updateState({ showName: false })}
          className={!state.showName
            ? 'bg-gradient-to-r from-purple-500 to-pink-500'
            : 'border-white/20 text-white hover:bg-white/10'
          }
        >
          No thanks
        </Button>
        <Button
          variant={state.showName ? 'default' : 'outline'}
          onClick={() => updateState({ showName: true })}
          className={state.showName
            ? 'bg-gradient-to-r from-purple-500 to-pink-500'
            : 'border-white/20 text-white hover:bg-white/10'
          }
        >
          Yes, add name
        </Button>
      </div>

      {state.showName && (
        <div className="space-y-6 max-w-md mx-auto">
          {/* Name input */}
          <div>
            <Label className="text-white mb-2 block">Your name</Label>
            <Input
              placeholder="Enter your name"
              value={state.name}
              onChange={(e) => updateState({ name: e.target.value })}
              maxLength={30}
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
            />
            <p className="text-gray-500 text-xs mt-1 text-right">
              {state.name.length}/30
            </p>
          </div>

          {/* Placement selection */}
          <div>
            <Label className="text-white mb-3 block">Placement style</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {namePlacements.map((placement) => (
                <button
                  key={placement.id}
                  onClick={() => updateState({ namePlacement: placement.id })}
                  className={`
                    p-3 rounded-xl border-2 transition-all text-left
                    ${state.namePlacement === placement.id
                      ? 'bg-gradient-to-br from-purple-500/30 to-pink-500/30 border-purple-400 ring-2 ring-purple-400/50'
                      : 'bg-white/5 border-white/10 hover:border-white/30 hover:bg-white/10'
                    }
                  `}
                >
                  <div className="text-white text-sm font-medium">{placement.label}</div>
                  <div className="text-gray-500 text-xs mt-1">{placement.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom placement input */}
          {state.namePlacement === 'custom' && (
            <div>
              <Label className="text-white mb-2 block">Describe placement</Label>
              <Input
                placeholder="e.g., floating above the head"
                value={state.customPlacement}
                onChange={(e) => updateState({ customPlacement: e.target.value })}
                maxLength={100}
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
              />
            </div>
          )}
        </div>
      )}

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
          disabled={state.showName && !state.name.trim()}
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
        >
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
