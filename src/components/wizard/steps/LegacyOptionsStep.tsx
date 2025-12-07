import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { WizardHook } from '@/hooks/useWizard'
import { AvatarOptions } from '@/types'
import { ArrowLeft, ArrowRight, User, UserCircle, Circle, Sparkles, Clock, Palette, Wand2 } from 'lucide-react'

interface LegacyOptionsStepProps {
  wizard: WizardHook
  options: AvatarOptions | null
}

const cropIcons: Record<string, React.ReactNode> = {
  'floating-head': <Circle className="w-6 h-6 text-white" />,
  portrait: <UserCircle className="w-6 h-6 text-white" />,
  half: (
    <div className="w-6 h-6 flex items-end justify-center">
      <User className="w-5 h-5 text-white" />
    </div>
  ),
  full: <User className="w-6 h-6 text-white" />,
}

export function LegacyOptionsStep({ wizard, options }: LegacyOptionsStepProps) {
  const { state, updateState, nextStep, prevStep } = wizard
  const cropTypes = options?.cropTypes || []
  const namePlacements = options?.namePlacements || []

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">
        Customize your avatar
      </h2>
      <p className="text-gray-400 text-center">
        Set options for your generation
      </p>

      {/* Body Crop Section */}
      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
        <h3 className="text-white font-medium mb-3 flex items-center gap-2">
          <User className="w-4 h-4" />
          Body Crop
        </h3>
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {cropTypes.map((crop) => (
            <button
              key={crop.id}
              onClick={() => updateState({ cropType: crop.id })}
              className={`
                p-2 sm:p-3 rounded-xl border-2 transition-all text-center
                ${state.cropType === crop.id
                  ? 'bg-gradient-to-br from-purple-500/30 to-pink-500/30 border-purple-400 ring-2 ring-purple-400/50'
                  : 'bg-white/5 border-white/10 hover:border-white/30 hover:bg-white/10'
                }
              `}
            >
              <div className="flex justify-center mb-2">
                <div className={`
                  rounded-lg p-2
                  ${state.cropType === crop.id
                    ? 'bg-gradient-to-br from-purple-500 to-pink-500'
                    : 'bg-white/10'
                  }
                `}>
                  {cropIcons[crop.id] || <User className="w-6 h-6 text-white" />}
                </div>
              </div>
              <div className="text-white text-[10px] sm:text-sm font-medium">{crop.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Age Modification Section */}
      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
        <h3 className="text-white font-medium mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Age Modification
        </h3>
        <div className="flex justify-center gap-3">
          {(['younger', 'normal', 'older'] as const).map((age) => (
            <button
              key={age}
              onClick={() => updateState({ ageModification: age })}
              className={`
                px-4 py-2 rounded-xl border-2 transition-all text-center
                ${state.ageModification === age
                  ? 'bg-gradient-to-br from-purple-500/30 to-pink-500/30 border-purple-400 ring-2 ring-purple-400/50'
                  : 'bg-white/5 border-white/10 hover:border-white/30 hover:bg-white/10'
                }
              `}
            >
              <div className="text-white text-sm font-medium capitalize">{age}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Background Section */}
      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
        <div className="flex items-center gap-3">
          <Checkbox
            id="keepBackground"
            checked={state.keepBackground}
            onCheckedChange={(checked) => updateState({ keepBackground: !!checked })}
            className="border-white/30 data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500"
          />
          <label htmlFor="keepBackground" className="flex items-center gap-2 cursor-pointer">
            <Palette className="w-4 h-4 text-gray-400" />
            <span className="text-white">Keep original background</span>
          </label>
        </div>
      </div>

      {/* Name Overlay Section */}
      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
        <div className="flex items-center gap-3 mb-4">
          <Checkbox
            id="showName"
            checked={state.showName}
            onCheckedChange={(checked) => updateState({ showName: !!checked })}
            className="border-white/30 data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500"
          />
          <label htmlFor="showName" className="flex items-center gap-2 cursor-pointer">
            <Sparkles className="w-4 h-4 text-gray-400" />
            <span className="text-white">Add name overlay</span>
          </label>
        </div>

        {state.showName && (
          <div className="space-y-4 pl-8 border-l-2 border-purple-500/30">
            <div>
              <Label className="text-gray-300 text-sm mb-2 block">Name</Label>
              <Input
                value={state.name}
                onChange={(e) => updateState({ name: e.target.value })}
                placeholder="Enter name"
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
              />
            </div>

            <div>
              <Label className="text-gray-300 text-sm mb-2 block">Placement Style</Label>
              <div className="flex flex-wrap gap-2">
                {namePlacements.map((placement) => (
                  <button
                    key={placement.id}
                    onClick={() => updateState({ namePlacement: placement.id })}
                    className={`
                      px-3 py-1.5 rounded-lg border transition-all text-sm
                      ${state.namePlacement === placement.id
                        ? 'bg-purple-500/30 border-purple-400 text-purple-200'
                        : 'bg-white/5 border-white/10 text-gray-300 hover:border-white/30'
                      }
                    `}
                  >
                    {placement.label}
                  </button>
                ))}
              </div>
            </div>

            {state.namePlacement === 'custom' && (
              <div>
                <Label className="text-gray-300 text-sm mb-2 block">Custom Placement Description</Label>
                <Input
                  value={state.customPlacement}
                  onChange={(e) => updateState({ customPlacement: e.target.value })}
                  placeholder="e.g., tattoo on forearm, embroidered on shirt"
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Custom Text Section */}
      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
        <div className="flex items-center gap-3 mb-3">
          <Checkbox
            id="customise"
            checked={state.customTextEnabled}
            onCheckedChange={(checked) => updateState({ customTextEnabled: !!checked })}
            className="border-white/30 data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500"
          />
          <label htmlFor="customise" className="flex items-center gap-2 cursor-pointer">
            <Wand2 className="w-4 h-4 text-gray-400" />
            <span className="text-white">Add customisation</span>
          </label>
        </div>

        {state.customTextEnabled && (
          <div className="pl-8 border-l-2 border-purple-500/30">
            <Input
              placeholder="e.g., wearing red sunglasses, holding a coffee cup"
              value={state.customText}
              onChange={(e) => updateState({ customText: e.target.value })}
              maxLength={150}
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
            />
            <p className="text-xs text-gray-500 text-right mt-1">
              {state.customText.length}/150
            </p>
          </div>
        )}
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
