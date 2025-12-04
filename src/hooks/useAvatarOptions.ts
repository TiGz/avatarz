import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { AvatarOptions, CategoryOption, NamePlacementOption, CropTypeOption } from '@/types'

// Fallback options in case the API fails
// Note: styles are now lazy-loaded per category, not included here
const FALLBACK_OPTIONS: AvatarOptions = {
  categories: [
    { id: 'animated', label: 'Animated', emoji: '🎬', description: 'Cartoons, anime, and 3D characters' },
    { id: 'artistic', label: 'Artistic', emoji: '🎨', description: 'Hand-drawn and painterly styles' },
    { id: 'professional', label: 'Professional', emoji: '💼', description: 'Business and corporate looks' },
    { id: 'custom', label: 'Custom', emoji: '✨', description: 'Write your own prompt' },
  ],
  namePlacements: [
    { id: 'graffiti', label: 'Graffiti', description: 'Name as street art behind you' },
    { id: 'necklace', label: 'Gold Chain', description: 'Name on a gold chain necklace' },
    { id: 'custom', label: 'Custom', description: 'Describe your own placement' },
  ],
  cropTypes: [
    { id: 'floating-head', label: 'Floating Head', description: 'Just the head' },
    { id: 'portrait', label: 'Portrait', description: 'Head & shoulders' },
    { id: 'half', label: 'Half Body', description: 'Waist up' },
    { id: 'full', label: 'Full Body', description: 'Entire body' },
  ],
}

interface UseAvatarOptionsResult {
  options: AvatarOptions | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useAvatarOptions(): UseAvatarOptionsResult {
  const [options, setOptions] = useState<AvatarOptions | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOptions = async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch categories directly from Supabase (styles are lazy-loaded per category)
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('style_categories')
        .select('id, label, emoji, description, sort_order')
        .eq('is_active', true)
        .order('sort_order')

      if (categoriesError) {
        throw categoriesError
      }

      // Also fetch static options from Edge Function (namePlacements, cropTypes)
      const { data: staticOptions, error: staticError } = await supabase.functions.invoke('generate-avatar', {
        method: 'GET',
      })

      if (staticError) {
        throw staticError
      }

      const categories: CategoryOption[] = (categoriesData || []).map((row) => ({
        id: row.id,
        label: row.label,
        emoji: row.emoji,
        description: row.description,
      }))

      // Add custom placement option (not included from API)
      const placementsWithCustom: NamePlacementOption[] = [
        ...staticOptions.namePlacements,
        { id: 'custom', label: 'Custom', description: 'Describe your own placement' },
      ]

      setOptions({
        categories,
        namePlacements: placementsWithCustom,
        cropTypes: staticOptions.cropTypes as CropTypeOption[],
      })
    } catch (err) {
      console.error('Failed to fetch avatar options:', err)
      setError('Failed to load options')
      // Use fallback options so the app still works
      setOptions(FALLBACK_OPTIONS)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOptions()
  }, [])

  return { options, loading, error, refetch: fetchOptions }
}
