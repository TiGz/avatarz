import { motion } from 'framer-motion'
import { Check } from 'lucide-react'

interface StepIndicatorProps {
  steps: string[]
  currentStep: number
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep
        const isCurrent = index === currentStep

        return (
          <div key={step} className="flex items-center">
            <motion.div
              className={`
                w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium
                transition-colors duration-200
                ${isCompleted
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                  : isCurrent
                    ? 'bg-white/20 text-white border-2 border-purple-500'
                    : 'bg-white/5 text-gray-500 border border-white/10'
                }
              `}
              animate={isCurrent ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 0.3 }}
            >
              {isCompleted ? (
                <Check className="w-4 h-4" />
              ) : (
                index + 1
              )}
            </motion.div>
            {index < steps.length - 1 && (
              <div
                className={`
                  w-8 h-0.5 mx-1
                  ${isCompleted ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-white/10'}
                `}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
