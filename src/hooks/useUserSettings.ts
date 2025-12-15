import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'

export interface UserSettings {
  defaultName: string | null
  isPrivateAccount: boolean
  ageGroup: 'under_18' | '18_plus' | null
  onboardingCompleted: boolean
  tier: string
}

interface UseUserSettingsResult {
  settings: UserSettings | null
  loading: boolean
  error: string | null
  updateSettings: (updates: { defaultName?: string; isPrivateAccount?: boolean }) => Promise<boolean>
  upgradeToAdult: () => Promise<boolean>
  refetch: () => Promise<void>
}

export function useUserSettings(): UseUserSettingsResult {
  const { user } = useAuth()
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSettings = useCallback(async () => {
    if (!user) {
      setSettings(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data, error: rpcError } = await supabase.rpc('get_user_settings')

      if (rpcError) {
        throw rpcError
      }

      if (data?.error) {
        throw new Error(data.error)
      }

      setSettings({
        defaultName: data.default_name,
        isPrivateAccount: data.is_private_account,
        ageGroup: data.age_group,
        onboardingCompleted: data.onboarding_completed,
        tier: data.tier,
      })
    } catch (err) {
      console.error('Failed to fetch user settings:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch settings')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const updateSettings = useCallback(async (updates: { defaultName?: string; isPrivateAccount?: boolean }): Promise<boolean> => {
    if (!user) return false

    try {
      setError(null)

      const { data, error: rpcError } = await supabase.rpc('update_user_settings', {
        p_default_name: updates.defaultName ?? null,
        p_is_private_account: updates.isPrivateAccount ?? null,
      })

      if (rpcError) {
        throw rpcError
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to update settings')
      }

      // Update local state optimistically
      setSettings(prev => prev ? {
        ...prev,
        defaultName: updates.defaultName !== undefined ? updates.defaultName : prev.defaultName,
        isPrivateAccount: updates.isPrivateAccount !== undefined ? updates.isPrivateAccount : prev.isPrivateAccount,
      } : null)

      return true
    } catch (err) {
      console.error('Failed to update settings:', err)
      setError(err instanceof Error ? err.message : 'Failed to update settings')
      return false
    }
  }, [user])

  const upgradeToAdult = useCallback(async (): Promise<boolean> => {
    if (!user) return false

    try {
      setError(null)

      const { data, error: rpcError } = await supabase.rpc('upgrade_to_adult')

      if (rpcError) {
        throw rpcError
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to upgrade age group')
      }

      // Update local state
      setSettings(prev => prev ? {
        ...prev,
        ageGroup: '18_plus',
      } : null)

      return true
    } catch (err) {
      console.error('Failed to upgrade age group:', err)
      setError(err instanceof Error ? err.message : 'Failed to upgrade age group')
      return false
    }
  }, [user])

  return {
    settings,
    loading,
    error,
    updateSettings,
    upgradeToAdult,
    refetch: fetchSettings,
  }
}
