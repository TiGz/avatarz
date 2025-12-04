import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { StyleOption } from '@/types'

interface UseStylesForCategoryResult {
  styles: StyleOption[]
  loading: boolean
  error: string | null
}

// Cache styles by category to avoid refetching
const stylesCache = new Map<string, StyleOption[]>()

export function useStylesForCategory(categoryId: string | null): UseStylesForCategoryResult {
  const [styles, setStyles] = useState<StyleOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Don't fetch for custom category or if no category selected
    if (!categoryId || categoryId === 'custom') {
      setStyles([])
      setLoading(false)
      return
    }

    // Check cache first
    const cached = stylesCache.get(categoryId)
    if (cached) {
      setStyles(cached)
      setLoading(false)
      return
    }

    const fetchStyles = async () => {
      setLoading(true)
      setError(null)

      try {
        const { data, error: fetchError } = await supabase
          .from('styles')
          .select('id, category_id, label, emoji, sort_order, prompt')
          .eq('category_id', categoryId)
          .eq('is_active', true)
          .order('sort_order')

        if (fetchError) {
          throw fetchError
        }

        const fetchedStyles: StyleOption[] = (data || []).map((row) => ({
          id: row.id,
          categoryId: row.category_id,
          label: row.label,
          emoji: row.emoji,
          prompt: row.prompt,
        }))

        // Cache the result
        stylesCache.set(categoryId, fetchedStyles)
        setStyles(fetchedStyles)
      } catch (err) {
        console.error('Failed to fetch styles for category:', err)
        setError('Failed to load styles')
        setStyles([])
      } finally {
        setLoading(false)
      }
    }

    fetchStyles()
  }, [categoryId])

  return { styles, loading, error }
}

// Utility to clear the cache if needed (e.g., after admin adds new styles)
export function clearStylesCache() {
  stylesCache.clear()
}
