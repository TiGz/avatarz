import { useState, useEffect, useCallback } from 'react'

export interface PublicAvatar {
  id: string
  thumbnailUrl: string
  style: string
}

interface UsePublicAvatarsResult {
  avatars: PublicAvatar[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function usePublicAvatars(count: number = 3): UsePublicAvatarsResult {
  const [avatars, setAvatars] = useState<PublicAvatar[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAvatars = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-avatars?count=${count}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch avatars')
      }

      const data = await response.json()
      setAvatars(data.avatars || [])
    } catch (err) {
      console.error('Error fetching public avatars:', err)
      setError(err instanceof Error ? err.message : 'Failed to load avatars')
      setAvatars([])
    } finally {
      setLoading(false)
    }
  }, [count])

  useEffect(() => {
    fetchAvatars()
  }, [fetchAvatars])

  return {
    avatars,
    loading,
    error,
    refetch: fetchAvatars,
  }
}
