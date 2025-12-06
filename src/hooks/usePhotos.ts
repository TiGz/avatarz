import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { Photo } from '@/types'
import { toast } from 'sonner'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

// Build public thumbnail URL
function getPublicThumbnailUrl(thumbnailPath: string | null): string | undefined {
  if (!thumbnailPath) return undefined
  return `${SUPABASE_URL}/storage/v1/object/public/photo-thumbnails/${thumbnailPath}`
}

export function usePhotos() {
  const { user } = useAuth()
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPhotos = useCallback(async () => {
    if (!user) {
      setPhotos([])
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Build URLs for each photo
      const photosWithUrls = await Promise.all(
        (data || []).map(async (photo) => {
          // Get signed URL for original (for avatar generation)
          const { data: urlData } = await supabase.storage
            .from('input-photos')
            .createSignedUrl(photo.storage_path, 3600) // 1 hour expiry

          return {
            ...photo,
            url: urlData?.signedUrl || undefined,
            // Use public thumbnail URL if available
            thumbnailUrl: getPublicThumbnailUrl(photo.thumbnail_path),
          }
        })
      )

      setPhotos(photosWithUrls)
    } catch (error) {
      console.error('Error fetching photos:', error)
      toast.error('Failed to load photos')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchPhotos()
  }, [fetchPhotos])

  const uploadPhoto = async (file: File | Blob, filename: string): Promise<Photo | null> => {
    if (!user) {
      toast.error('Please sign in to upload photos')
      return null
    }

    try {
      // Generate unique storage path
      const timestamp = Date.now()
      const ext = filename.split('.').pop() || 'jpg'
      const storagePath = `${user.id}/${timestamp}_${crypto.randomUUID()}.${ext}`

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('input-photos')
        .upload(storagePath, file, {
          contentType: file.type,
          cacheControl: '3600',
        })

      if (uploadError) throw uploadError

      // Create database entry
      const { data: photo, error: dbError } = await supabase
        .from('photos')
        .insert({
          user_id: user.id,
          storage_path: storagePath,
          filename: filename,
          mime_type: file.type,
          file_size: file.size,
        })
        .select()
        .single()

      if (dbError) throw dbError

      // Get signed URL for original
      const { data: urlData } = await supabase.storage
        .from('input-photos')
        .createSignedUrl(storagePath, 3600)

      let photoWithUrl: Photo = {
        ...photo,
        url: urlData?.signedUrl || undefined,
        thumbnailUrl: undefined,
      }

      // Add to state immediately (without thumbnail)
      setPhotos((prev) => [photoWithUrl, ...prev])

      // Generate thumbnail in the background (don't block upload)
      generateThumbnail(photo.id).then((result) => {
        if (result?.thumbnailUrl) {
          // Update the photo in state with thumbnail URL
          setPhotos((prev) =>
            prev.map((p) =>
              p.id === photo.id
                ? { ...p, thumbnail_path: result.thumbnailPath, thumbnailUrl: result.thumbnailUrl }
                : p
            )
          )
        }
      }).catch((error) => {
        console.error('Thumbnail generation failed:', error)
        // Continue without thumbnail - not critical
      })

      return photoWithUrl
    } catch (error) {
      console.error('Error uploading photo:', error)
      toast.error('Failed to upload photo')
      return null
    }
  }

  // Generate thumbnail for a photo via edge function
  const generateThumbnail = async (photoId: string): Promise<{ thumbnailPath: string; thumbnailUrl: string } | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return null

      const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-photo-thumbnail`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ photoId }),
      })

      if (!response.ok) {
        console.error('Thumbnail generation failed:', await response.text())
        return null
      }

      const result = await response.json()
      return result.success
        ? { thumbnailPath: result.thumbnailPath, thumbnailUrl: result.thumbnailUrl }
        : null
    } catch (error) {
      console.error('Thumbnail generation error:', error)
      return null
    }
  }

  const uploadFromDataUrl = async (dataUrl: string, filename: string = 'capture.jpg'): Promise<Photo | null> => {
    // Convert data URL to blob
    const response = await fetch(dataUrl)
    const blob = await response.blob()
    return uploadPhoto(blob, filename)
  }

  const deletePhoto = async (photoId: string): Promise<boolean> => {
    const photo = photos.find((p) => p.id === photoId)
    if (!photo) return false

    try {
      // Delete original from storage
      const { error: storageError } = await supabase.storage
        .from('input-photos')
        .remove([photo.storage_path])

      if (storageError) throw storageError

      // Delete thumbnail from storage (if exists)
      if (photo.thumbnail_path) {
        await supabase.storage
          .from('photo-thumbnails')
          .remove([photo.thumbnail_path])
          .catch((err) => console.warn('Thumbnail delete failed:', err))
        // Don't throw - continue even if thumbnail delete fails
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('photos')
        .delete()
        .eq('id', photoId)

      if (dbError) throw dbError

      setPhotos((prev) => prev.filter((p) => p.id !== photoId))
      toast.success('Photo deleted')
      return true
    } catch (error) {
      console.error('Error deleting photo:', error)
      toast.error('Failed to delete photo')
      return false
    }
  }

  const getSignedUrl = async (storagePath: string): Promise<string | null> => {
    const { data } = await supabase.storage
      .from('input-photos')
      .createSignedUrl(storagePath, 3600)
    return data?.signedUrl || null
  }

  return {
    photos,
    loading,
    uploadPhoto,
    uploadFromDataUrl,
    deletePhoto,
    getSignedUrl,
    refresh: fetchPhotos,
  }
}
