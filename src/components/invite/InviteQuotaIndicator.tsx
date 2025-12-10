import { motion } from 'framer-motion'
import { Gift, Sparkles } from 'lucide-react'

interface InviteQuotaIndicatorProps {
  remaining: number
  onClick: () => void
}

export function InviteQuotaIndicator({ remaining, onClick }: InviteQuotaIndicatorProps) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4, ease: 'easeOut' }}
      onClick={onClick}
      className="group relative inline-flex items-center gap-2 px-4 py-2.5 rounded-full
                 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-purple-500/10
                 border border-purple-400/20
                 text-gray-300 text-sm font-medium
                 hover:from-purple-500/20 hover:via-pink-500/20 hover:to-purple-500/20
                 hover:border-purple-400/40 hover:text-white
                 transition-all duration-300 ease-out
                 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50
                 shadow-[0_0_20px_rgba(168,85,247,0.15)]
                 hover:shadow-[0_0_30px_rgba(168,85,247,0.3)]"
    >
      {/* Animated shimmer effect */}
      <motion.div
        className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/10 to-transparent"
        initial={{ x: '-100%' }}
        animate={{ x: '100%' }}
        transition={{
          repeat: Infinity,
          repeatDelay: 3,
          duration: 1.5,
          ease: 'easeInOut',
        }}
        style={{ zIndex: 0 }}
      />

      {/* Pulsing glow ring */}
      <motion.span
        className="absolute inset-0 rounded-full border border-purple-400/30"
        animate={{
          scale: [1, 1.05, 1],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Gift icon with subtle bounce */}
      <motion.span
        animate={{
          y: [0, -2, 0],
          rotate: [0, -5, 5, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
          repeatDelay: 1,
        }}
        className="relative z-10"
      >
        <Gift className="w-4 h-4 text-purple-400 group-hover:text-purple-300 transition-colors duration-300" />
      </motion.span>

      <span className="relative z-10">
        <span className="font-bold text-purple-300">{remaining}</span> invite{remaining !== 1 ? 's' : ''} left today
      </span>

      {/* Sparkle icon */}
      <motion.span
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.6, 1, 0.6],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="relative z-10"
      >
        <Sparkles className="w-3.5 h-3.5 text-pink-400/80 group-hover:text-pink-300 transition-colors duration-300" />
      </motion.span>
    </motion.button>
  )
}
