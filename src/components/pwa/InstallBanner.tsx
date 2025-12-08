import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePWAInstall } from '@/hooks/usePWAInstall'

const STORAGE_KEY = 'pwa-banner-dismissed'

export function InstallBanner() {
  const { canInstall, install } = usePWAInstall()
  const [dismissed, setDismissed] = useState(true) // Start hidden to avoid flash
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    const wasDismissed = localStorage.getItem(STORAGE_KEY) === 'true'
    setDismissed(wasDismissed)
  }, [])

  if (!canInstall || dismissed) return null

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  const message = isMobile
    ? 'Add Avatarz to your homescreen for quick access'
    : 'Install Avatarz to your desktop for a native app experience'

  const handleInstall = async () => {
    setInstalling(true)
    const success = await install()
    setInstalling(false)
    if (success) {
      setDismissed(true)
    }
  }

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true')
    setDismissed(true)
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        className="bg-gradient-to-r from-purple-600/95 to-pink-600/95 backdrop-blur-sm"
      >
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Pulsing indicator dot */}
            <motion.span
              animate={{
                scale: [1, 1.3, 1],
                opacity: [1, 0.7, 1]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
              className="h-2.5 w-2.5 bg-white rounded-full flex-shrink-0"
            />
            <span className="text-white text-sm font-medium truncate">
              {message}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              size="sm"
              onClick={handleInstall}
              disabled={installing}
              className="bg-white text-purple-700 hover:bg-white/90 h-8 px-3 text-sm font-semibold"
            >
              <Download className="h-4 w-4 mr-1.5" />
              {installing ? 'Installing...' : 'Install'}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDismiss}
              className="text-white/80 hover:text-white hover:bg-white/10 h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
