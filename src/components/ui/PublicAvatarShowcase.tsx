import { usePublicAvatars } from '@/hooks/usePublicAvatars'
import { RefreshCw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface PublicAvatarShowcaseProps {
  count?: number
  showRefresh?: boolean
  title?: string
  size?: 'small' | 'large'
}

export function PublicAvatarShowcase({
  count = 3,
  showRefresh = true,
  title = 'Community Creations',
  size = 'small',
}: PublicAvatarShowcaseProps) {
  // Responsive sizes: large is smaller on mobile (w-24) and full size on sm+ (w-32)
  const sizeClasses = size === 'large' ? 'w-24 h-24 sm:w-32 sm:h-32 rounded-2xl' : 'w-20 h-20 rounded-xl'
  const gapClass = size === 'large' ? 'gap-2 sm:gap-4' : 'gap-3'
  const { avatars, loading, refetch } = usePublicAvatars(count)

  // Don't render anything if no avatars and not loading
  if (!loading && avatars.length === 0) {
    return null
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-400">{title}</h3>
        {showRefresh && avatars.length > 0 && (
          <button
            onClick={refetch}
            disabled={loading}
            className="text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50"
            aria-label="Refresh avatars"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      <div className={`flex ${gapClass} justify-center`}>
        <AnimatePresence mode="popLayout">
          {loading && avatars.length === 0 ? (
            // Loading placeholders
            <>
              {Array.from({ length: count }).map((_, i) => (
                <motion.div
                  key={`placeholder-${i}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className={`${sizeClasses} bg-white/5 animate-pulse`}
                />
              ))}
            </>
          ) : (
            // Actual avatars
            avatars.map((avatar, index) => (
              <motion.div
                key={avatar.id}
                initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.8, rotate: 5 }}
                transition={{
                  delay: index * 0.1,
                  type: 'spring',
                  stiffness: 300,
                  damping: 20,
                }}
                className="relative group"
              >
                <div className={`${sizeClasses} overflow-hidden ring-2 ring-white/10 group-hover:ring-purple-500/50 transition-all`}>
                  <img
                    src={avatar.thumbnailUrl}
                    alt={`${avatar.style} avatar`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className={`absolute inset-0 ${size === 'large' ? 'rounded-2xl' : 'rounded-xl'} bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-2`}>
                  <span className={`${size === 'large' ? 'text-xs' : 'text-[10px]'} text-white/80 capitalize`}>
                    {avatar.style.replace('-', ' ')}
                  </span>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
