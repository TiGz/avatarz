import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { Generation } from '@/types'
import { toast } from 'sonner'

export function useGenerations() {
  const { user } = useAuth()
  const [generations, setGenerations] = useState<Generation[]>([])
  const [loading, setLoading] = useState(true)

  const fetchGenerations = useCallback(async () => {
    if (!user) {
      setGenerations([])
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('generations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Get signed URLs for each avatar (full + thumbnail)
      const generationsWithUrls = await Promise.all(
        (data || []).map(async (gen) => {
          // Fetch full-resolution URL
          const { data: urlData } = await supabase.storage
            .from('avatars')
            .createSignedUrl(gen.output_storage_path, 3600) // 1 hour expiry

          // Fetch thumbnail URL if available
          let thumbnailUrl: string | undefined
          if (gen.thumbnail_storage_path) {
            const { data: thumbData } = await supabase.storage
              .from('avatar-thumbnails')
              .createSignedUrl(gen.thumbnail_storage_path, 3600)
            thumbnailUrl = thumbData?.signedUrl
          }

          return {
            ...gen,
            url: urlData?.signedUrl || undefined,
            // Fall back to full URL if no thumbnail
            thumbnailUrl: thumbnailUrl || urlData?.signedUrl || undefined,
          }
        })
      )

      setGenerations(generationsWithUrls)
    } catch (error) {
      console.error('Error fetching generations:', error)
      toast.error('Failed to load gallery')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchGenerations()
  }, [fetchGenerations])

  const getSignedUrl = async (storagePath: string): Promise<string | null> => {
    const { data } = await supabase.storage
      .from('avatars')
      .createSignedUrl(storagePath, 3600)
    return data?.signedUrl || null
  }

  const deleteGeneration = async (generationId: string): Promise<boolean> => {
    const generation = generations.find((g) => g.id === generationId)
    if (!generation) return false

    try {
      // 1. Delete full-size avatar from storage
      const { error: avatarError } = await supabase.storage
        .from('avatars')
        .remove([generation.output_storage_path])

      if (avatarError) throw avatarError

      // 2. Delete thumbnail if exists
      if (generation.thumbnail_storage_path) {
        const { error: thumbError } = await supabase.storage
          .from('avatar-thumbnails')
          .remove([generation.thumbnail_storage_path])

        if (thumbError) console.warn('Thumbnail delete failed:', thumbError)
      }

      // 3. Delete database record
      const { error: dbError } = await supabase
        .from('generations')
        .delete()
        .eq('id', generationId)

      if (dbError) throw dbError

      // 4. Update local state
      setGenerations((prev) => prev.filter((g) => g.id !== generationId))
      toast.success('Avatar deleted')
      return true
    } catch (error) {
      console.error('Error deleting generation:', error)
      toast.error('Failed to delete avatar')
      return false
    }
  }

  const downloadAvatar = async (generation: Generation) => {
    if (!generation.url) {
      toast.error('Avatar not available')
      return
    }

    try {
      const response = await fetch(generation.url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `avatar_${generation.style}_${new Date(generation.created_at).toISOString().split('T')[0]}.png`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('Download started!')
    } catch (error) {
      console.error('Download error:', error)
      toast.error('Failed to download avatar')
    }
  }

  return {
    generations,
    loading,
    getSignedUrl,
    downloadAvatar,
    deleteGeneration,
    refresh: fetchGenerations,
  }
}
