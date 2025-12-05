import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { Generation } from '@/types'
import { toast } from 'sonner'

const PAGE_SIZE = 12
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

// Build public thumbnail URL (no API call needed)
function getPublicThumbnailUrl(path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/avatar-thumbnails/${path}`
}

export function useGenerations() {
  const { user } = useAuth()
  const [generations, setGenerations] = useState<Generation[]>([])
  const [totalCount, setTotalCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const pageRef = useRef(0)

  const fetchGenerations = useCallback(async (page: number, append = false) => {
    if (!user) {
      setGenerations([])
      setLoading(false)
      return
    }

    try {
      const from = page * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      console.log('[useGenerations] Fetching page', page, 'range', from, '-', to)

      const { data, error, count } = await supabase
        .from('generations')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) throw error

      console.log('[useGenerations] Got', data?.length, 'items, total count:', count)

      // Update total count on first fetch
      if (page === 0 && count !== null) {
        setTotalCount(count)
      }

      // Build URLs - thumbnails are public, full-res needs signing on demand
      // For items without thumbnails (legacy), we'll fetch full-res URL
      const generationsWithUrls = await Promise.all(
        (data || []).map(async (gen) => {
          if (gen.thumbnail_storage_path) {
            // Has thumbnail - use public URL
            return {
              ...gen,
              thumbnailUrl: getPublicThumbnailUrl(gen.thumbnail_storage_path),
              url: undefined,
            }
          } else {
            // Legacy item without thumbnail - fetch full-res URL
            console.log('[useGenerations] Legacy item without thumbnail:', gen.id)
            const { data: urlData } = await supabase.storage
              .from('avatars')
              .createSignedUrl(gen.output_storage_path, 3600)
            return {
              ...gen,
              thumbnailUrl: urlData?.signedUrl,
              url: urlData?.signedUrl,
            }
          }
        })
      )

      if (append) {
        setGenerations((prev) => [...prev, ...generationsWithUrls])
      } else {
        setGenerations(generationsWithUrls)
      }

      setHasMore(generationsWithUrls.length === PAGE_SIZE)
    } catch (error) {
      console.error('Error fetching generations:', error)
      toast.error('Failed to load gallery')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [user])

  // Initial load
  useEffect(() => {
    pageRef.current = 0
    setLoading(true)
    setHasMore(true)
    fetchGenerations(0)
  }, [fetchGenerations])

  const loadMore = useCallback(async () => {
    console.log('[useGenerations] loadMore called, loadingMore:', loadingMore, 'hasMore:', hasMore)
    if (loadingMore || !hasMore) {
      console.log('[useGenerations] loadMore skipped')
      return
    }
    setLoadingMore(true)
    pageRef.current += 1
    console.log('[useGenerations] Loading page', pageRef.current)
    await fetchGenerations(pageRef.current, true)
  }, [loadingMore, hasMore, fetchGenerations])

  const refresh = useCallback(async () => {
    pageRef.current = 0
    setLoading(true)
    setHasMore(true)
    await fetchGenerations(0)
  }, [fetchGenerations])

  // Get signed URL for full-resolution avatar (called on demand)
  const getSignedUrl = async (storagePath: string): Promise<string | null> => {
    const { data } = await supabase.storage
      .from('avatars')
      .createSignedUrl(storagePath, 3600)
    return data?.signedUrl || null
  }

  // Fetch full-res URL for a specific generation (for modal/download)
  const ensureFullUrl = async (generation: Generation): Promise<string | null> => {
    if (generation.url) return generation.url

    const url = await getSignedUrl(generation.output_storage_path)
    if (url) {
      // Update local state with the fetched URL
      setGenerations((prev) =>
        prev.map((g) => (g.id === generation.id ? { ...g, url } : g))
      )
    }
    return url
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
    try {
      // Ensure we have the full-res URL
      const url = await ensureFullUrl(generation)
      if (!url) {
        toast.error('Avatar not available')
        return
      }

      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `avatar_${generation.style}_${new Date(generation.created_at).toISOString().split('T')[0]}.png`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(blobUrl)
      document.body.removeChild(a)
      toast.success('Download started!')
    } catch (error) {
      console.error('Download error:', error)
      toast.error('Failed to download avatar')
    }
  }

  return {
    generations,
    totalCount,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    getSignedUrl,
    ensureFullUrl,
    downloadAvatar,
    deleteGeneration,
    refresh,
  }
}
