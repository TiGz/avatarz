import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { UserQuota } from '@/types'

export function useQuota() {
  const { user } = useAuth()
  const [quota, setQuota] = useState<UserQuota | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchQuota = useCallback(async () => {
    if (!user) {
      setQuota(null)
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase.rpc('get_user_quota')

      if (error) throw error

      setQuota(data as UserQuota)
    } catch (error) {
      console.error('Error fetching quota:', error)
      // Set a default quota on error
      setQuota({
        limit: 20,
        used: 0,
        remaining: 20,
        is_admin: false,
      })
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchQuota()
  }, [fetchQuota])

  const updateQuota = (newQuota: Partial<UserQuota>) => {
    setQuota((prev) => prev ? { ...prev, ...newQuota } : null)
  }

  return {
    quota,
    loading,
    refresh: fetchQuota,
    updateQuota,
  }
}
