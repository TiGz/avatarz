import { useQuota } from '@/hooks/useQuota'
import { Sparkles, Infinity } from 'lucide-react'

interface QuotaDisplayProps {
  compact?: boolean
}

export function QuotaDisplay({ compact = false }: QuotaDisplayProps) {
  const { quota, loading } = useQuota()

  if (loading || !quota) {
    return null
  }

  // Admin has unlimited
  if (quota.is_admin) {
    if (compact) {
      return (
        <div className="flex items-center gap-1 text-purple-400 text-sm">
          <Infinity className="h-4 w-4" />
          <span>Unlimited</span>
        </div>
      )
    }

    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-full">
        <Infinity className="h-4 w-4 text-purple-400" />
        <span className="text-purple-300 text-sm font-medium">Unlimited generations</span>
      </div>
    )
  }

  const percentage = (quota.used / quota.limit) * 100
  const isLow = quota.remaining <= 5
  const isEmpty = quota.remaining === 0

  if (compact) {
    return (
      <div className={`flex items-center gap-1 text-sm ${
        isEmpty ? 'text-red-400' : isLow ? 'text-yellow-400' : 'text-gray-400'
      }`}>
        <Sparkles className="h-4 w-4" />
        <span>{quota.remaining}/{quota.limit}</span>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-3 px-3 py-1.5 rounded-full border ${
      isEmpty
        ? 'bg-red-500/10 border-red-500/20'
        : isLow
          ? 'bg-yellow-500/10 border-yellow-500/20'
          : 'bg-white/5 border-white/10'
    }`}>
      <div className="flex items-center gap-2">
        <Sparkles className={`h-4 w-4 ${
          isEmpty ? 'text-red-400' : isLow ? 'text-yellow-400' : 'text-purple-400'
        }`} />
        <span className={`text-sm font-medium ${
          isEmpty ? 'text-red-300' : isLow ? 'text-yellow-300' : 'text-gray-300'
        }`}>
          {quota.remaining} left today
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            isEmpty
              ? 'bg-red-500'
              : isLow
                ? 'bg-yellow-500'
                : 'bg-gradient-to-r from-purple-500 to-pink-500'
          }`}
          style={{ width: `${100 - percentage}%` }}
        />
      </div>
    </div>
  )
}
