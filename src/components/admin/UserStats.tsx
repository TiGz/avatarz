import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw, Crown, User, Star, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { UserStats as UserStatsType, UserTier } from '@/types'
import { useAuth } from '@/hooks/useAuth'

const tierConfig: Record<UserTier, { label: string; color: string; icon: React.ReactNode }> = {
  admin: { label: 'Admin', color: 'text-amber-400', icon: <Crown className="h-3 w-3" /> },
  premium: { label: 'Premium', color: 'text-purple-400', icon: <Star className="h-3 w-3" /> },
  standard: { label: 'Standard', color: 'text-gray-400', icon: <User className="h-3 w-3" /> },
}

export function UserStats() {
  const { user } = useAuth()
  const [stats, setStats] = useState<UserStatsType[]>([])
  const [loading, setLoading] = useState(true)
  const [changingTier, setChangingTier] = useState<string | null>(null)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    setLoading(true)
    const { data, error } = await supabase.rpc('admin_get_user_stats')

    if (error) {
      toast.error('Failed to load user stats')
      console.error(error)
    } else {
      setStats(data || [])
    }
    setLoading(false)
  }

  const formatCost = (cost: number) => {
    if (cost === 0) return '$0.00'
    return `$${cost.toFixed(4)}`
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never'
    const date = new Date(dateStr)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const handleTierChange = async (userId: string, newTier: UserTier) => {
    setChangingTier(userId)
    setOpenDropdown(null)

    try {
      const { data, error } = await supabase.rpc('admin_set_user_tier', {
        target_user_id: userId,
        new_tier_id: newTier
      })

      if (error) throw error

      if (data?.success) {
        toast.success(`User tier changed to ${tierConfig[newTier].label}`)
        fetchStats() // Refresh the list
      } else {
        throw new Error(data?.error || 'Failed to change tier')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to change tier')
    } finally {
      setChangingTier(null)
    }
  }

  // Calculate totals
  const totals = stats.reduce(
    (acc, user) => ({
      generations: acc.generations + user.stat_total_generations,
      cost: acc.cost + user.stat_total_cost,
      today: acc.today + user.stat_generations_today,
    }),
    { generations: 0, cost: 0, today: 0 }
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-white">User Statistics</h3>
          <p className="text-gray-400 text-sm">Per-user generation counts and costs</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={fetchStats}
          disabled={loading}
          className="text-white hover:bg-white/10"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
          <div className="text-2xl font-bold text-purple-300">{totals.generations}</div>
          <div className="text-xs text-gray-400">Total Generations</div>
        </div>
        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
          <div className="text-2xl font-bold text-green-300">{formatCost(totals.cost)}</div>
          <div className="text-xs text-gray-400">Total Cost</div>
        </div>
        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <div className="text-2xl font-bold text-blue-300">{totals.today}</div>
          <div className="text-xs text-gray-400">Today</div>
        </div>
      </div>

      {loading && stats.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : stats.length === 0 ? (
        <p className="text-gray-500 text-sm py-4 text-center">
          No users yet
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-2 px-3 text-gray-400 font-medium">User</th>
                <th className="text-left py-2 px-3 text-gray-400 font-medium">Tier</th>
                <th className="text-right py-2 px-3 text-gray-400 font-medium">Total</th>
                <th className="text-right py-2 px-3 text-gray-400 font-medium">Today</th>
                <th className="text-right py-2 px-3 text-gray-400 font-medium">Cost</th>
                <th className="text-right py-2 px-3 text-gray-400 font-medium">Last Gen</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((statUser) => {
                const tier = (statUser.stat_tier as UserTier) || 'standard'
                const tierInfo = tierConfig[tier]
                const isCurrentUser = user?.id === statUser.stat_user_id

                return (
                  <tr
                    key={statUser.stat_user_id}
                    className="border-b border-white/5 hover:bg-white/5"
                  >
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <span className={tierInfo.color}>
                          {tierInfo.icon}
                        </span>
                        <span className="text-gray-300 truncate max-w-[150px]">
                          {statUser.stat_email}
                        </span>
                        {isCurrentUser && (
                          <span className="text-xs text-gray-500">(you)</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3 relative">
                      {isCurrentUser ? (
                        <span className={`flex items-center gap-1.5 px-2 py-1 text-xs font-medium ${tierInfo.color}`}>
                          {tierInfo.label}
                        </span>
                      ) : changingTier === statUser.stat_user_id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                      ) : (
                        <div className="relative">
                          <button
                            onClick={() => setOpenDropdown(
                              openDropdown === statUser.stat_user_id ? null : statUser.stat_user_id
                            )}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${tierInfo.color} hover:bg-white/10`}
                          >
                            {tierInfo.label}
                            <ChevronDown className="h-3 w-3" />
                          </button>

                          {openDropdown === statUser.stat_user_id && (
                            <div className="absolute top-full left-0 mt-1 bg-gray-900 border border-white/10 rounded-lg shadow-lg z-10 min-w-[120px]">
                              {(['admin', 'premium', 'standard'] as UserTier[]).map((tierOption) => (
                                <button
                                  key={tierOption}
                                  onClick={() => handleTierChange(statUser.stat_user_id, tierOption)}
                                  disabled={tier === tierOption}
                                  className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-white/10 first:rounded-t-lg last:rounded-b-lg ${
                                    tier === tierOption ? 'opacity-50' : ''
                                  } ${tierConfig[tierOption].color}`}
                                >
                                  {tierConfig[tierOption].icon}
                                  {tierConfig[tierOption].label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-3 text-gray-300 text-right">
                      {statUser.stat_total_generations}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <span className={statUser.stat_generations_today > 0 ? 'text-blue-400' : 'text-gray-500'}>
                        {statUser.stat_generations_today}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <span className={statUser.stat_total_cost > 0 ? 'text-green-400' : 'text-gray-500'}>
                        {formatCost(statUser.stat_total_cost)}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-gray-400 text-right whitespace-nowrap">
                      {formatDate(statUser.stat_last_generation_at)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
