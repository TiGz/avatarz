import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, X, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePWAInstall } from '@/hooks/usePWAInstall'

export function InstallButton() {
  const { canInstall, install } = usePWAInstall()
  const [showModal, setShowModal] = useState(false)
  const [installing, setInstalling] = useState(false)

  if (!canInstall) return null

  const handleInstall = async () => {
    setInstalling(true)
    const success = await install()
    setInstalling(false)
    if (success) {
      setShowModal(false)
    }
  }

  return (
    <>
      {/* Flashing install button */}
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          opacity: [1, 0.7, 1]
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowModal(true)}
          className="text-white hover:bg-white/10 relative"
        >
          <Download className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 h-2 w-2 bg-pink-500 rounded-full" />
        </Button>
      </motion.div>

      {/* Install confirmation modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-br from-purple-900 to-blue-900 border border-white/20 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 rounded-xl">
                    <Smartphone className="h-6 w-6 text-purple-300" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Install Avatarz</h2>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-white hover:bg-white/10 h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <p className="text-gray-300 mb-6">
                Install Avatarz on your device for quick access and a native app experience.
              </p>

              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  onClick={() => setShowModal(false)}
                  className="flex-1 border border-white/20 text-white hover:bg-white/10"
                >
                  Not now
                </Button>
                <Button
                  onClick={handleInstall}
                  disabled={installing}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  {installing ? 'Installing...' : 'Install'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
