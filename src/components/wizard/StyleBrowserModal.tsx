import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles, ChevronRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAvatarOptions } from '@/hooks/useAvatarOptions'
import { useStylesForCategory } from '@/hooks/useStylesForCategory'
import { StyleOption } from '@/types'

interface StyleBrowserModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectPrompt: (prompt: string, styleName: string) => void
  currentPrompt: string // To check if we need confirmation
}

export function StyleBrowserModal({ isOpen, onClose, onSelectPrompt, currentPrompt }: StyleBrowserModalProps) {
  const { options } = useAvatarOptions()
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [selectedStyle, setSelectedStyle] = useState<StyleOption | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [pendingPrompt, setPendingPrompt] = useState<{ prompt: string; styleName: string } | null>(null)

  // Fetch styles for selected category
  const { styles, loading: stylesLoading } = useStylesForCategory(selectedCategoryId)

  // Filter out 'custom' category
  const categories = options?.categories.filter(c => c.id !== 'custom') || []

  // Auto-select first category when modal opens
  useEffect(() => {
    if (isOpen && categories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(categories[0].id)
    }
  }, [isOpen, categories, selectedCategoryId])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedStyle(null)
      setShowConfirmation(false)
      setPendingPrompt(null)
    }
  }, [isOpen])

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (showConfirmation) {
          setShowConfirmation(false)
          setPendingPrompt(null)
        } else {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose, showConfirmation])

  const handleUsePrompt = () => {
    if (!selectedStyle?.prompt) return

    const hasExistingPrompt = currentPrompt.trim().length > 0

    if (hasExistingPrompt) {
      // Show confirmation
      setPendingPrompt({ prompt: selectedStyle.prompt, styleName: selectedStyle.label })
      setShowConfirmation(true)
    } else {
      // Directly use the prompt
      onSelectPrompt(selectedStyle.prompt, selectedStyle.label)
      onClose()
    }
  }

  const handleConfirmReplace = () => {
    if (pendingPrompt) {
      onSelectPrompt(pendingPrompt.prompt, pendingPrompt.styleName)
      onClose()
    }
  }

  const handleCancelReplace = () => {
    setShowConfirmation(false)
    setPendingPrompt(null)
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
          className="relative w-full max-w-3xl max-h-[85vh] bg-gray-900 rounded-2xl overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Confirmation Overlay */}
          <AnimatePresence>
            {showConfirmation && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 backdrop-blur-sm"
              >
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.9 }}
                  className="bg-gray-800 rounded-xl p-6 max-w-sm mx-4 text-center"
                >
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Replace current prompt?
                  </h3>
                  <p className="text-gray-400 text-sm mb-4">
                    Your current custom prompt will be replaced with the {pendingPrompt?.styleName} prompt.
                  </p>
                  <div className="flex gap-3 justify-center">
                    <Button
                      variant="outline"
                      onClick={handleCancelReplace}
                      className="bg-transparent border-white/20 text-white hover:bg-white/10"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleConfirmReplace}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                    >
                      Replace
                    </Button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
            <h2 className="text-lg font-semibold text-white">
              Browse Styles for Inspiration
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Category Tabs */}
          <div className="flex gap-2 p-4 overflow-x-auto border-b border-white/10 flex-shrink-0">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => {
                  setSelectedCategoryId(category.id)
                  setSelectedStyle(null)
                }}
                className={`
                  px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all
                  ${selectedCategoryId === category.id
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                  }
                `}
              >
                {category.emoji} {category.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {stylesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Style Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {styles.map((style) => {
                    const isSpecial = !style.useLegacyOptions
                    const isSelected = selectedStyle?.id === style.id

                    return (
                      <button
                        key={style.id}
                        onClick={() => setSelectedStyle(style)}
                        className={`
                          relative p-4 rounded-xl border-2 transition-all text-center
                          ${isSelected
                            ? 'bg-gradient-to-br from-purple-500/30 to-pink-500/30 border-purple-400 ring-2 ring-purple-400/50'
                            : isSpecial
                              ? 'bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30 hover:border-purple-400/50 hover:bg-purple-500/20'
                              : 'bg-white/5 border-white/10 hover:border-white/30 hover:bg-white/10'
                          }
                        `}
                      >
                        {isSpecial && (
                          <div className="absolute -top-2 -right-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-lg">
                            <Sparkles className="w-3 h-3" />
                            Special
                          </div>
                        )}
                        <div className="text-2xl mb-2">{style.emoji}</div>
                        <div className="text-white text-sm font-medium">{style.label}</div>
                        {style.maxPhotos > 1 && (
                          <div className="text-[10px] text-purple-300 mt-1">
                            {style.minPhotos}-{style.maxPhotos} photos
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>

                {/* Selected Style Prompt Preview */}
                {selectedStyle && (
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xl">{selectedStyle.emoji}</span>
                      <h3 className="text-white font-medium">{selectedStyle.label}</h3>
                      {!selectedStyle.useLegacyOptions && (
                        <span className="bg-purple-500/20 text-purple-300 text-xs px-2 py-0.5 rounded-full">
                          Special
                        </span>
                      )}
                    </div>
                    <div className="bg-black/30 rounded-lg p-3 max-h-40 overflow-y-auto">
                      <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
                        {selectedStyle.prompt || 'No prompt available for this style.'}
                      </p>
                    </div>
                    {selectedStyle.inputSchema && selectedStyle.inputSchema.fields.length > 0 && (
                      <p className="text-yellow-400/80 text-xs mt-2">
                        Note: This style has dynamic options (like {selectedStyle.inputSchema.fields.map(f => f.label).join(', ')}).
                        The prompt template uses placeholders that you can customize.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-white/10 flex-shrink-0">
            <Button
              onClick={handleUsePrompt}
              disabled={!selectedStyle?.prompt}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Use This Prompt
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
