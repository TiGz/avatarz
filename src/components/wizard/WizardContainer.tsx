import { motion, AnimatePresence } from 'framer-motion'
import { useWizard } from '@/hooks/useWizard'
import { useAvatarOptions } from '@/hooks/useAvatarOptions'
import { useStylesForCategory } from '@/hooks/useStylesForCategory'
import { StepIndicator } from './StepIndicator'
import { CaptureStep } from './steps/CaptureStep'
import { CategoryStep } from './steps/CategoryStep'
import { StyleStep } from './steps/StyleStep'
import { CropStep } from './steps/CropStep'
import { NameStep } from './steps/NameStep'
import { GenerateStep } from './steps/GenerateStep'
import { DownloadStep } from './steps/DownloadStep'
import { Loader2 } from 'lucide-react'

// Step labels for standard flow
const STANDARD_STEPS = ['Capture', 'Category', 'Style', 'Crop', 'Name', 'Generate', 'Download']
// Step labels for custom category flow (skip Style, Crop, Name)
const CUSTOM_STEPS = ['Capture', 'Category', 'Generate', 'Download']

export function WizardContainer() {
  const { options, loading } = useAvatarOptions()
  const wizard = useWizard(options)

  // Fetch styles for the selected category to pass to GenerateStep
  const { styles } = useStylesForCategory(wizard.state.category)
  const selectedStyle = styles.find(s => s.id === wizard.state.style) || null

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin mb-4" />
        <p className="text-gray-400">Loading options...</p>
      </div>
    )
  }

  // Use different step labels based on category
  const displaySteps = wizard.isCustomCategory ? CUSTOM_STEPS : STANDARD_STEPS

  // Map the current step to display step index (for step indicator)
  const getDisplayStepIndex = () => {
    if (!wizard.isCustomCategory) return wizard.step
    // For custom category: step 0→0, 1→1, 5→2, 6→3
    switch (wizard.step) {
      case 0: return 0  // Capture
      case 1: return 1  // Category
      case 5: return 2  // Generate
      case 6: return 3  // Download
      default: return wizard.step
    }
  }

  const renderStep = () => {
    switch (wizard.step) {
      case 0:
        return <CaptureStep wizard={wizard} />
      case 1:
        return <CategoryStep wizard={wizard} options={options} />
      case 2:
        return <StyleStep wizard={wizard} options={options} />
      case 3:
        return <CropStep wizard={wizard} options={options} />
      case 4:
        return <NameStep wizard={wizard} options={options} />
      case 5:
        return <GenerateStep wizard={wizard} selectedStyle={selectedStyle} />
      case 6:
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
