import { useState } from 'react'
import { WizardState } from '@/types'

const initialState: WizardState = {
  imageData: null,
  style: 'cartoon',
  customStyle: '',
  cropType: 'headshot',
  showName: false,
  name: '',
  namePlacement: 'graffiti',
  customPlacement: '',
  generatedImage: null,
}

export function useWizard() {
  const [step, setStep] = useState(0)
  const [state, setState] = useState<WizardState>(initialState)

  const nextStep = () => setStep((s) => Math.min(s + 1, 5))
  const prevStep = () => setStep((s) => Math.max(s - 1, 0))
  const goToStep = (s: number) => setStep(s)

  const updateState = (updates: Partial<WizardState>) => {
    setState((prev) => ({ ...prev, ...updates }))
  }

  const reset = () => {
    setStep(0)
    setState(initialState)
  }

  return {
    step,
    state,
    nextStep,
    prevStep,
    goToStep,
    updateState,
    reset,
  }
}

export type WizardHook = ReturnType<typeof useWizard>
