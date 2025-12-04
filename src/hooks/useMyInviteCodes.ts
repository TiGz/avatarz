import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { InviteCode } from '@/types'

export function useMyInviteCodes() {
  const { user } = useAuth()
  const [invites, setInvites] = useState<InviteCode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!user) {
      setInvites([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error: rpcError } = await supabase.rpc('get_my_invite_codes')

      if (rpcError) throw rpcError

      setInvites((data as InviteCode[]) || [])
    } catch (err) {
      console.error('Error fetching invite codes:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch invites')
      setInvites([])
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { invites, loading, error, refresh }
}
