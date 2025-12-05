import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { WizardState } from '@/types'

// Prompt constants (must match edge function)
const AGE_PROMPTS: Record<string, string> = {
  normal: '',
  younger: 'Make the person appear younger with youthful features.',
  older: 'Make the person appear older with mature features.',
}

const BACKGROUND_PROMPTS = {
  remove: 'Replace the background with something neutral or style-appropriate that complements the overall aesthetic.',
  keep: 'Keep the original background scene but transform it to match the art style.',
}

const CROP_PROMPTS: Record<string, string> = {
  'floating-head': 'Show only the disembodied floating head with no neck, shoulders, or body visible. The head should appear to float against the background. Apply stylistic effects appropriate to the chosen art style (glow, shadow, fade, or clean cut depending on style).',
  portrait: 'Show only the head and shoulders, tightly cropped portrait composition.',
  half: 'Show from the waist up, medium shot composition.',
  full: 'Show the entire body in frame, full length portrait.',
}

const NAME_PLACEMENT_PROMPTS: Record<string, string> = {
  graffiti: 'written in bold graffiti style on a wall behind them, spray paint aesthetic with drips and highlights',
  necklace: 'displayed on a thick gold chain necklace around their neck, clearly readable gold lettering',
  headband: 'embroidered on a stylish headband they are wearing, clearly visible text',
  jersey: 'printed on the front of a sports jersey they are wearing, athletic style lettering',
  floating: 'as glowing holographic text floating near them, futuristic neon effect',
  badge: 'on a professional name badge or lanyard they are wearing, clearly readable',
  tattoo: 'as a stylish tattoo visible on their forearm, artistic lettering style',
  banner: 'on an elegant decorative banner or ribbon below them, ornate vintage style',
}

interface GeneratePromptPreviewProps {
  isOpen: boolean
  onClose: () => void
  state: WizardState
  stylePrompt?: string
}

function buildPrompt(state: WizardState, stylePrompt: string): string {
  const parts: string[] = []

  // Style prompt first
  parts.push(stylePrompt)

  // Age modification
  const agePrompt = AGE_PROMPTS[state.ageModification || 'normal']
  if (agePrompt) parts.push(agePrompt)

  // Background (always add)
  const bgPrompt = state.keepBackground ? BACKGROUND_PROMPTS.keep : BACKGROUND_PROMPTS.remove
  parts.push(bgPrompt)

  // Custom text
  if (state.customTextEnabled && state.customText.trim()) {
    parts.push(state.customText.trim())
  }

  // Crop
  const cropPrompt = CROP_PROMPTS[state.cropType] || ''
  if (cropPrompt) parts.push(cropPrompt)

  // Name
  if (state.showName && state.name && state.namePlacement) {
    const placementPrompt = state.namePlacement === 'custom' && state.customPlacement
      ? state.customPlacement.trim()
      : NAME_PLACEMENT_PROMPTS[state.namePlacement] || ''
    parts.push(`Include the name "${state.name}" ${placementPrompt}.`)
  }

  // System suffix
  parts.push('Keep the original face recognizable and maintain their identity. High quality output.')

  return parts.join(' ').trim()
}

export function GeneratePromptPreview({ isOpen, onClose, state, stylePrompt }: GeneratePromptPreviewProps) {
  const [copied, setCopied] = useState(false)

  // Reset copied state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setCopied(false)
    }
  }, [isOpen])

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  const prompt = buildPrompt(state, stylePrompt || '')

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopied(true)
      toast.success('Prompt copied to clipboard')
      setTimeout(() => setCopied(false), 3000)
    } catch (err) {
      console.error('Failed to copy:', err)
      toast.error('Failed to copy. Try selecting the text manually.')
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative max-w-lg w-full bg-gray-900 rounded-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <h2 className="text-lg font-semibold text-white">
              Full Generation Prompt
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 max-h-[60vh] overflow-y-auto">
            <div className="bg-white/5 rounded-lg p-4">
              <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
                {prompt}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-white/10">
            <Button
              onClick={handleCopy}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy to Clipboard
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
