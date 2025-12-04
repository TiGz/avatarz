import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { InviteQuota } from '@/types'

export function useInviteQuota() {
  const { user } = useAuth()
  const [quota, setQuota] = useState<InviteQuota | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!user) {
      setQuota(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error: rpcError } = await supabase.rpc('get_invite_quota')

      if (rpcError) throw rpcError

      setQuota(data as InviteQuota)
    } catch (err) {
      console.error('Error fetching invite quota:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch quota')
      // Set a default "no permission" quota on error
      setQuota({
        can_create: false,
        tier: 'standard',
        reason: 'Failed to fetch quota'
      })
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { quota, loading, error, refresh }
}
