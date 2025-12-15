import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Shield, User, Users, Loader2 } from 'lucide-react'

type AgeGroup = 'under_18' | '18_plus'

interface AgeVerificationModalProps {
  open: boolean
  onComplete: (ageGroup: AgeGroup) => Promise<void>
}

export function AgeVerificationModal({ open, onComplete }: AgeVerificationModalProps) {
  const [selected, setSelected] = useState<AgeGroup | null>(null)
  const [loading, setLoading] = useState(false)

  const handleContinue = async () => {
    if (!selected) return

    setLoading(true)
    try {
      await onComplete(selected)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="w-full max-w-md bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-white/10 p-6 shadow-xl"
          >
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Shield className="w-8 h-8 text-purple-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Welcome to Avatarz!</h2>
              <p className="text-gray-400">Before we get started, please confirm your age group.</p>
            </div>

            {/* Age Selection */}
            <div className="space-y-3 mb-6">
              <button
                onClick={() => setSelected('under_18')}
                disabled={loading}
                className={`w-full p-4 rounded-xl border-2 transition-all text-left flex items-center gap-4 ${
                  selected === 'under_18'
                    ? 'border-purple-500 bg-purple-500/20'
                    : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  selected === 'under_18' ? 'bg-purple-500' : 'bg-white/10'
                }`}>
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-white font-semibold">I'm under 18</div>
                  <div className="text-gray-400 text-sm">Enhanced privacy protection</div>
                </div>
              </button>

              <button
                onClick={() => setSelected('18_plus')}
                disabled={loading}
                className={`w-full p-4 rounded-xl border-2 transition-all text-left flex items-center gap-4 ${
                  selected === '18_plus'
                    ? 'border-purple-500 bg-purple-500/20'
                    : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  selected === '18_plus' ? 'bg-purple-500' : 'bg-white/10'
                }`}>
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-white font-semibold">I'm 18 or older</div>
                  <div className="text-gray-400 text-sm">Standard account</div>
                </div>
              </button>
            </div>

            {/* Info Message for Under 18 */}
            <AnimatePresence>
              {selected === 'under_18' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-6 overflow-hidden"
                >
                  <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <p className="text-blue-300 text-sm">
                      <strong>Privacy Protection:</strong> Your account will be set to private.
                      Your avatars won't appear in the public showcase or on the welcome screen.
                      You can change this in settings when you're older.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Continue Button */}
            <Button
              onClick={handleContinue}
              disabled={!selected || loading}
              className="w-full h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Setting up...
                </>
              ) : (
                'Continue'
              )}
            </Button>

            {/* Footer Note */}
            <p className="text-center text-gray-500 text-xs mt-4">
              This helps us provide age-appropriate features and privacy settings.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
