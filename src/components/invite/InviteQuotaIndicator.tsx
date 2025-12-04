import { motion } from 'framer-motion'
import { Gift } from 'lucide-react'

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
      className="group relative inline-flex items-center gap-2 px-4 py-2 rounded-full
                 bg-white/[0.03] border border-white/[0.08] backdrop-blur-sm
                 text-gray-500 text-sm font-medium
                 hover:bg-white/[0.06] hover:border-white/[0.15] hover:text-gray-300
                 transition-all duration-300 ease-out
                 cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-purple-500/50"
    >
      <Gift className="w-3.5 h-3.5 text-purple-400/60 group-hover:text-purple-400 transition-colors duration-300" />
      <span>
        {remaining} invite{remaining !== 1 ? 's' : ''} left today
      </span>
      <motion.span
        className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ zIndex: -1 }}
      />
    </motion.button>
  )
}
