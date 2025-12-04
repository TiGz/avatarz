import { useState, useEffect, useCallback } from 'react'

export interface StyleExample {
  id: string
  thumbnailUrl: string
  style: string
}

interface UsePublicAvatarsByStyleResult {
  examples: StyleExample[]
  loading: boolean
  error: string | null
}

export function usePublicAvatarsByStyle(
  styleId: string | null,
  count: number = 3
): UsePublicAvatarsByStyleResult {
  const [examples, setExamples] = useState<StyleExample[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchExamples = useCallback(async () => {
    if (!styleId) {
      setExamples([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-avatars?count=${count}&style_id=${encodeURIComponent(styleId)}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch examples')
      }

      const data = await response.json()
      setExamples(data.avatars || [])
    } catch (err) {
      console.error('Error fetching style examples:', err)
      setError(err instanceof Error ? err.message : 'Failed to load examples')
      setExamples([])
    } finally {
      setLoading(false)
    }
  }, [styleId, count])

  useEffect(() => {
    fetchExamples()
  }, [fetchExamples])

  return {
    examples,
    loading,
    error,
  }
}
