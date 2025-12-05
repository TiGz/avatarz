import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { WizardHook } from '@/hooks/useWizard'
import { InputSchema } from '@/types'
import { ArrowLeft, ArrowRight } from 'lucide-react'

interface DynamicInputsStepProps {
  wizard: WizardHook
  schema: InputSchema
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

      <div className="space-y-4 max-w-md mx-auto">
        {schema.fields.map(field => (
          <div key={field.id}>
            <Label className="text-white mb-2 block">
              {field.label}
              {field.required && <span className="text-red-400 ml-1">*</span>}
            </Label>
            <Input
              value={state.inputValues[field.id] || ''}
              onChange={(e) => setInputValue(field.id, e.target.value)}
              placeholder={field.placeholder}
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
            />
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
