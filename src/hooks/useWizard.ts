import { useState } from 'react'
import { WizardState, AvatarOptions } from '@/types'

// Step enumeration - photos come AFTER style selection (style defines how many photos needed)
// Category(0) → Style(1) → Capture(2) → Options(3) → Generate(4) → Download(5)
export const WIZARD_STEPS = {
  CATEGORY: 0,
  STYLE: 1,
  CAPTURE: 2,
  OPTIONS: 3,    // Dynamic inputs OR legacy options based on style.inputSchema
  GENERATE: 4,
  DOWNLOAD: 5,
} as const

const MAX_STEP = 5

const createInitialState = (options?: AvatarOptions | null): WizardState => ({
  imageData: null,
  category: options?.categories[0]?.id || 'animated',
  style: '', // Will be set when category is selected (first style in that category)
  customStyle: '',
  cropType: options?.cropTypes.find(c => c.id === 'portrait')?.id || 'portrait',
  showName: false,
  name: '',
  namePlacement: options?.namePlacements[0]?.id || 'graffiti',
  customPlacement: '',
  generatedImage: null,
  isPublic: true,
  shareUrl: null,
  // Generation options (standard mode only - when use_legacy_options=true)
  keepBackground: false,
  ageModification: 'normal',
  customTextEnabled: false,
  customText: '',
  // Multi-photo support
  selectedPhotoIds: [],
  // Dynamic inputs (for styles with input_schema)
  inputValues: {},
})

export function useWizard(options?: AvatarOptions | null) {
  const [step, setStep] = useState(0)
  const [state, setState] = useState<WizardState>(() => createInitialState(options))
  const [shouldAutoGenerate, setShouldAutoGenerate] = useState(false)

  // Check if current category is "custom" (skips style selection)
  const isCustomCategory = state.category === 'custom'

  const nextStep = () => {
    setStep((s) => {
      // If on Category step and custom category, jump to Capture (skip Style)
      if (s === WIZARD_STEPS.CATEGORY && isCustomCategory) {
        return WIZARD_STEPS.CAPTURE
      }
      return Math.min(s + 1, MAX_STEP)
    })
  }

  const prevStep = () => {
    setStep((s) => {
      // If on Capture step and custom category, go back to Category (skip Style)
      if (s === WIZARD_STEPS.CAPTURE && isCustomCategory) {
        return WIZARD_STEPS.CATEGORY
      }
      return Math.max(s - 1, 0)
    })
  }

  const goToStep = (s: number) => setStep(s)

  const updateState = (updates: Partial<WizardState>) => {
    setState((prev) => {
      const newState = { ...prev, ...updates }

      // When category changes, reset downstream state
      if (updates.category && updates.category !== prev.category) {
        newState.style = ''
        newState.inputValues = {}
        newState.selectedPhotoIds = []
        // Clear custom style when switching away from custom category
        if (prev.category === 'custom' && updates.category !== 'custom') {
          newState.customStyle = ''
        }
      }

      // When style changes, reset inputs and photos
      if (updates.style && updates.style !== prev.style) {
        newState.inputValues = {}
        newState.selectedPhotoIds = []
      }

      return newState
    })
  }

  // Set a single input value (for dynamic inputs)
  const setInputValue = (key: string, value: string) => {
    setState((prev) => ({
      ...prev,
      inputValues: { ...prev.inputValues, [key]: value }
    }))
  }

  // Toggle photo selection for multi-photo styles
  const togglePhotoSelection = (photoId: string) => {
    setState((prev) => {
      const isSelected = prev.selectedPhotoIds.includes(photoId)
      return {
        ...prev,
        selectedPhotoIds: isSelected
          ? prev.selectedPhotoIds.filter(id => id !== photoId)
          : [...prev.selectedPhotoIds, photoId]
      }
    })
  }

  // Set photo selection (replace entire array)
  const setSelectedPhotoIds = (photoIds: string[]) => {
    setState((prev) => ({ ...prev, selectedPhotoIds: photoIds }))
  }

  const reset = () => {
    setStep(0)
    setState(createInitialState(options))
  }

  // Go back to Generate step to regenerate with same settings
  const regenerate = () => {
    // Clear the previous generated image and go to Generate step
    setState((prev) => ({ ...prev, generatedImage: null }))
    setShouldAutoGenerate(true)
    setStep(WIZARD_STEPS.GENERATE)
  }

  // Go back to Generate step to edit options (no auto-generate)
  const goBackFromDownload = () => {
    setState((prev) => ({ ...prev, generatedImage: null }))
    setStep(WIZARD_STEPS.GENERATE)
  }

  // Clear the auto-generate flag after it's been consumed
  const clearAutoGenerate = () => {
    setShouldAutoGenerate(false)
  }

  return {
    step,
    state,
    nextStep,
    prevStep,
    goToStep,
    updateState,
    setInputValue,
    togglePhotoSelection,
    setSelectedPhotoIds,
    reset,
    regenerate,
    goBackFromDownload,
    shouldAutoGenerate,
    clearAutoGenerate,
    isCustomCategory,
  }
}

export type WizardHook = ReturnType<typeof useWizard>
