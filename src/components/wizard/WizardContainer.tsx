import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWizard, WIZARD_STEPS } from '@/hooks/useWizard'
import { useAvatarOptions } from '@/hooks/useAvatarOptions'
import { useStylesForCategory } from '@/hooks/useStylesForCategory'
import { StepIndicator } from './StepIndicator'
import { CaptureStep } from './steps/CaptureStep'
import { CategoryStep } from './steps/CategoryStep'
import { StyleStep } from './steps/StyleStep'
import { LegacyOptionsStep } from './steps/LegacyOptionsStep'
import { DynamicInputsStep } from './steps/DynamicInputsStep'
import { GenerateStep } from './steps/GenerateStep'
import { DownloadStep } from './steps/DownloadStep'
import { Loader2 } from 'lucide-react'

// New step flow: Category → Style → Capture → Options → Generate → Download
// Step labels for standard flow (legacy options: Crop + Name)
const LEGACY_STEPS = ['Category', 'Style', 'Photo', 'Options', 'Generate', 'Download']
// Step labels for special styles (dynamic inputs or no options)
const SPECIAL_STEPS = ['Category', 'Style', 'Photo', 'Customize', 'Generate', 'Download']
// Step labels for custom category flow (skip Style)
const CUSTOM_STEPS = ['Category', 'Photo', 'Generate', 'Download']

export function WizardContainer() {
  const { options, loading } = useAvatarOptions()
  const wizard = useWizard(options)

  // Only fetch styles when on Style step (1) or later
  const shouldFetchStyles = wizard.step >= WIZARD_STEPS.STYLE
  const { styles } = useStylesForCategory(shouldFetchStyles ? wizard.state.category : null)
  const selectedStyle = styles.find(s => s.id === wizard.state.style) || null

  // Check if OPTIONS step should be skipped (must be before early return for hooks consistency)
  const shouldSkipOptions = selectedStyle &&
    !selectedStyle.useLegacyOptions &&
    (!selectedStyle.inputSchema || selectedStyle.inputSchema.fields.length === 0)

  // Auto-skip OPTIONS step for special styles with no inputs
  // This useEffect must be called before any early returns (Rules of Hooks)
  useEffect(() => {
    if (!loading && wizard.step === WIZARD_STEPS.OPTIONS && shouldSkipOptions) {
      wizard.nextStep()
    }
  }, [loading, wizard.step, shouldSkipOptions])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin mb-4" />
        <p className="text-gray-400">Loading options...</p>
      </div>
    )
  }

  // Determine display steps based on category and style
  const getDisplaySteps = () => {
    if (wizard.isCustomCategory) return CUSTOM_STEPS
    if (selectedStyle && !selectedStyle.useLegacyOptions) return SPECIAL_STEPS
    return LEGACY_STEPS
  }
  const displaySteps = getDisplaySteps()

  // Map the current step to display step index (for step indicator)
  const getDisplayStepIndex = () => {
    if (wizard.isCustomCategory) {
      // For custom category: Category(0)→0, Capture(2)→1, Generate(4)→2, Download(5)→3
      switch (wizard.step) {
        case WIZARD_STEPS.CATEGORY: return 0
        case WIZARD_STEPS.CAPTURE: return 1
        case WIZARD_STEPS.GENERATE: return 2
        case WIZARD_STEPS.DOWNLOAD: return 3
        default: return wizard.step
      }
    }
    return wizard.step
  }

  // Render the Options step based on style configuration
  const renderOptionsStep = () => {
    if (!selectedStyle) {
      // Fallback to legacy options
      return <LegacyOptionsStep wizard={wizard} options={options} />
    }

    if (selectedStyle.inputSchema && selectedStyle.inputSchema.fields.length > 0) {
      // Dynamic inputs for special styles
      return <DynamicInputsStep wizard={wizard} schema={selectedStyle.inputSchema} />
    }

    if (selectedStyle.useLegacyOptions) {
      // Legacy flow: show combined options (crop, age, background, name)
      return <LegacyOptionsStep wizard={wizard} options={options} />
    }

    // This shouldn't be reached if shouldSkipOptions is working,
    // but fallback to legacy options just in case
    return <LegacyOptionsStep wizard={wizard} options={options} />
  }

  const renderStep = () => {
    switch (wizard.step) {
      case WIZARD_STEPS.CATEGORY:
        return <CategoryStep wizard={wizard} options={options} />
      case WIZARD_STEPS.STYLE:
        return <StyleStep wizard={wizard} options={options} />
      case WIZARD_STEPS.CAPTURE:
        return (
          <CaptureStep
            wizard={wizard}
            minPhotos={selectedStyle?.minPhotos ?? 1}
            maxPhotos={selectedStyle?.maxPhotos ?? 1}
          />
        )
      case WIZARD_STEPS.OPTIONS:
        return renderOptionsStep()
      case WIZARD_STEPS.GENERATE:
        return <GenerateStep wizard={wizard} selectedStyle={selectedStyle} />
      case WIZARD_STEPS.DOWNLOAD:
        return <DownloadStep wizard={wizard} />
      default:
        return null
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <StepIndicator steps={displaySteps} currentStep={getDisplayStepIndex()} />

      <AnimatePresence mode="wait">
        <motion.div
          key={wizard.step}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3 }}
          className="mt-8"
        >
          {renderStep()}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
