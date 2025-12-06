import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { WizardHook } from '@/hooks/useWizard'
import { useInviteQuota } from '@/hooks/useInviteQuota'
import { InputSchema, InputField } from '@/types'
import { ArrowLeft, ArrowRight, Gift, Loader2 } from 'lucide-react'

interface DynamicInputsStepProps {
  wizard: WizardHook
  schema: InputSchema
}

function RadioField({ field, value, onChange }: {
  field: InputField
  value: string
  onChange: (value: string) => void
}) {
  if (!field.options) return null

  return (
    <div className="space-y-2">
      {field.options.map(option => (
        <label
          key={option.value}
          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
            value === option.value
              ? 'bg-purple-500/20 border border-purple-500/50'
              : 'bg-white/5 border border-white/10 hover:bg-white/10'
          }`}
        >
          <input
            type="radio"
            name={field.id}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="sr-only"
          />
          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
            value === option.value
              ? 'border-purple-500 bg-purple-500'
              : 'border-white/40'
          }`}>
            {value === option.value && (
              <div className="w-2 h-2 rounded-full bg-white" />
            )}
          </div>
          <span className="text-white">{option.label}</span>
        </label>
      ))}
    </div>
  )
}

function InviteCodeField({ field, value, onChange }: {
  field: InputField
  value: string
  onChange: (value: string) => void
}) {
  const { quota, loading } = useInviteQuota()

  // Don't show if user can't create invites
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Checking invite availability...</span>
      </div>
    )
  }

  if (!quota?.can_create || (quota.remaining !== undefined && quota.remaining <= 0)) {
    return null
  }

  const isChecked = value === 'true'

  return (
    <div className="space-y-2">
      <label
        className={`flex items-center gap-3 p-4 rounded-lg cursor-pointer transition-all ${
          isChecked
            ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/50'
            : 'bg-white/5 border border-white/10 hover:bg-white/10'
        }`}
      >
        <input
          type="checkbox"
          checked={isChecked}
          onChange={(e) => onChange(e.target.checked ? 'true' : '')}
          className="sr-only"
        />
        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
          isChecked
            ? 'border-purple-500 bg-purple-500'
            : 'border-white/40'
        }`}>
          {isChecked && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-purple-400" />
          <span className="text-white font-medium">{field.label}</span>
        </div>
      </label>
      {field.description && (
        <p className="text-sm text-gray-400 ml-1">{field.description}</p>
      )}
      {isChecked && quota.remaining !== undefined && (
        <p className="text-sm text-purple-400 ml-1">
          You have {quota.remaining} invite{quota.remaining !== 1 ? 's' : ''} remaining today
        </p>
      )}
    </div>
  )
}

export function DynamicInputsStep({ wizard, schema }: DynamicInputsStepProps) {
  const { state, setInputValue, nextStep, prevStep } = wizard

  // Check if all required fields are filled
  const allRequiredFilled = schema.fields
    .filter(field => field.required)
    .every(field => (state.inputValues[field.id] || '').trim().length > 0)

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">
        Customize your style
      </h2>
      <p className="text-gray-400 text-center">
        Fill in the details for your avatar
      </p>

      <div className="space-y-6 max-w-md mx-auto">
        {schema.fields.map(field => (
          <div key={field.id}>
            {/* invite_code type handles its own label */}
            {field.type !== 'invite_code' && (
              <Label className="text-white mb-2 block">
                {field.label}
                {field.required && <span className="text-red-400 ml-1">*</span>}
              </Label>
            )}

            {/* Text input (default) */}
            {(!field.type || field.type === 'text') && (
              <Input
                value={state.inputValues[field.id] || ''}
                onChange={(e) => setInputValue(field.id, e.target.value)}
                placeholder={field.placeholder}
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
              />
            )}

            {/* Radio buttons */}
            {field.type === 'radio' && (
              <RadioField
                field={field}
                value={state.inputValues[field.id] || ''}
                onChange={(value) => setInputValue(field.id, value)}
              />
            )}

            {/* Invite code checkbox */}
            {field.type === 'invite_code' && (
              <InviteCodeField
                field={field}
                value={state.inputValues[field.id] || ''}
                onChange={(value) => setInputValue(field.id, value)}
              />
            )}
          </div>
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
          disabled={!allRequiredFilled}
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
        >
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
