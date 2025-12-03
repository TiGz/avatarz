import { motion, AnimatePresence } from 'framer-motion'
import { useWizard } from '@/hooks/useWizard'
import { StepIndicator } from './StepIndicator'
import { CaptureStep } from './steps/CaptureStep'
import { StyleStep } from './steps/StyleStep'
import { CropStep } from './steps/CropStep'
import { NameStep } from './steps/NameStep'
import { GenerateStep } from './steps/GenerateStep'
import { DownloadStep } from './steps/DownloadStep'

const steps = ['Capture', 'Style', 'Crop', 'Name', 'Generate', 'Download']

export function WizardContainer() {
  const wizard = useWizard()

  const renderStep = () => {
    switch (wizard.step) {
      case 0:
        return <CaptureStep wizard={wizard} />
      case 1:
        return <StyleStep wizard={wizard} />
      case 2:
        return <CropStep wizard={wizard} />
      case 3:
        return <NameStep wizard={wizard} />
      case 4:
        return <GenerateStep wizard={wizard} />
      case 5:
        return <DownloadStep wizard={wizard} />
      default:
        return null
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <StepIndicator steps={steps} currentStep={wizard.step} />

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
