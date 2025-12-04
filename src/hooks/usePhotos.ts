import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { Photo } from '@/types'
import { toast } from 'sonner'

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

      // Get signed URLs for each photo
      const photosWithUrls = await Promise.all(
        (data || []).map(async (photo) => {
          const { data: urlData } = await supabase.storage
            .from('input-photos')
            .createSignedUrl(photo.storage_path, 3600) // 1 hour expiry

          return {
            ...photo,
            url: urlData?.signedUrl || undefined,
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

      // Get signed URL
      const { data: urlData } = await supabase.storage
        .from('input-photos')
        .createSignedUrl(storagePath, 3600)

      const photoWithUrl = {
        ...photo,
        url: urlData?.signedUrl || undefined,
      }

      setPhotos((prev) => [photoWithUrl, ...prev])
      return photoWithUrl
    } catch (error) {
      console.error('Error uploading photo:', error)
      toast.error('Failed to upload photo')
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
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('input-photos')
        .remove([photo.storage_path])

      if (storageError) throw storageError

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
