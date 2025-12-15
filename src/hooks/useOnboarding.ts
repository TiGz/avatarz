import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useUserSettings } from './useUserSettings'

type AgeGroup = 'under_18' | '18_plus'

interface UseOnboardingResult {
  needsOnboarding: boolean
  loading: boolean
  completeOnboarding: (ageGroup: AgeGroup) => Promise<boolean>
}

export function useOnboarding(): UseOnboardingResult {
  const { settings, loading: settingsLoading, refetch } = useUserSettings()
  const [completing, setCompleting] = useState(false)

  const needsOnboarding = !settingsLoading && settings !== null && !settings.onboardingCompleted

  const completeOnboarding = useCallback(async (ageGroup: AgeGroup): Promise<boolean> => {
    try {
      setCompleting(true)

      const { data, error } = await supabase.rpc('complete_onboarding', {
        p_age_group: ageGroup,
      })

      if (error) {
        throw error
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to complete onboarding')
      }

      // Refetch settings to update state
      await refetch()

      return true
    } catch (err) {
      console.error('Failed to complete onboarding:', err)
      return false
    } finally {
      setCompleting(false)
    }
  }, [refetch])

  return {
    needsOnboarding,
    loading: settingsLoading || completing,
    completeOnboarding,
  }
}
