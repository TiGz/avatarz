import { useState } from 'react'
import { WizardState, AvatarOptions } from '@/types'

// Total steps: Capture(0), Category(1), Style(2), Crop(3), Name(4), Generate(5), Download(6)
const MAX_STEP = 6

const createInitialState = (options?: AvatarOptions | null): WizardState => ({
  imageData: null,
  category: options?.categories[0]?.id || 'animated',
  style: '', // Will be set when category is selected (first style in that category)
  customStyle: '',
  cropType: options?.cropTypes[0]?.id || 'headshot',
  showName: false,
  name: '',
  namePlacement: options?.namePlacements[0]?.id || 'graffiti',
  customPlacement: '',
  generatedImage: null,
  isPublic: true,
})

export function useWizard(options?: AvatarOptions | null) {
  const [step, setStep] = useState(0)
  const [state, setState] = useState<WizardState>(() => createInitialState(options))

  // Check if current category is "custom" (skips style selection)
  const isCustomCategory = state.category === 'custom'

  const nextStep = () => {
    setStep((s) => {
      // If on Category step (1) and custom category, jump directly to Generate (5)
      if (s === 1 && isCustomCategory) {
        return 5
      }
      return Math.min(s + 1, MAX_STEP)
    })
  }

  const prevStep = () => {
    setStep((s) => {
      // If on Generate step (5) and custom category, go back to Category (1)
      if (s === 5 && isCustomCategory) {
        return 1
      }
      return Math.max(s - 1, 0)
    })
  }

  const goToStep = (s: number) => setStep(s)

  const updateState = (updates: Partial<WizardState>) => {
    setState((prev) => {
      const newState = { ...prev, ...updates }

      // When category changes, reset style (will be set when styles load)
      if (updates.category && updates.category !== prev.category) {
        if (updates.category === 'custom') {
          // Custom category - clear style, will use customStyle
          newState.style = ''
        } else {
          // Clear style - StyleStep will set it when styles load
          newState.style = ''
        }
        // Clear custom style when switching away from custom category
        if (prev.category === 'custom' && updates.category !== 'custom') {
          newState.customStyle = ''
        }
      }

      return newState
    })
  }

  const reset = () => {
    setStep(0)
    setState(createInitialState(options))
  }

  return {
    step,
    state,
    nextStep,
    prevStep,
    goToStep,
    updateState,
    reset,
    isCustomCategory,
  }
}

export type WizardHook = ReturnType<typeof useWizard>
