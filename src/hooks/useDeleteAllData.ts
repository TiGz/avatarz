import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { toast } from 'sonner'

export interface DeleteProgress {
  phase: 'idle' | 'fetching' | 'deleting-photos' | 'deleting-avatars' | 'complete' | 'error'
  photosTotal: number
  photosDeleted: number
  avatarsTotal: number
  avatarsDeleted: number
  error?: string
}

const initialProgress: DeleteProgress = {
  phase: 'idle',
  photosTotal: 0,
  photosDeleted: 0,
  avatarsTotal: 0,
  avatarsDeleted: 0,
}

export function useDeleteAllData() {
  const { user } = useAuth()
  const [progress, setProgress] = useState<DeleteProgress>(initialProgress)
  const [isDeleting, setIsDeleting] = useState(false)

  const reset = useCallback(() => {
    setProgress(initialProgress)
    setIsDeleting(false)
  }, [])

  const deleteAllData = useCallback(async (): Promise<boolean> => {
    if (!user) {
      toast.error('Please sign in to delete data')
      return false
    }

    setIsDeleting(true)
    setProgress({ ...initialProgress, phase: 'fetching' })

    try {
      // Fetch all user photos
      const { data: photos, error: photosError } = await supabase
        .from('photos')
        .select('id, storage_path, thumbnail_path')
        .eq('user_id', user.id)

      if (photosError) throw new Error(`Failed to fetch photos: ${photosError.message}`)

      // Fetch all user generations
      const { data: generations, error: generationsError } = await supabase
        .from('generations')
        .select('id, output_storage_path, thumbnail_storage_path')
        .eq('user_id', user.id)

      if (generationsError) throw new Error(`Failed to fetch avatars: ${generationsError.message}`)

      const photosList = photos || []
      const generationsList = generations || []

      setProgress(prev => ({
        ...prev,
        photosTotal: photosList.length,
        avatarsTotal: generationsList.length,
        phase: 'deleting-photos',
      }))

      // Delete photos from storage and database
      let photosDeleted = 0
      for (const photo of photosList) {
        try {
          // Delete original from input-photos bucket
          await supabase.storage
            .from('input-photos')
            .remove([photo.storage_path])

          // Delete thumbnail from photo-thumbnails bucket (if exists)
          if (photo.thumbnail_path) {
            await supabase.storage
              .from('photo-thumbnails')
              .remove([photo.thumbnail_path])
              .catch(err => console.warn('Photo thumbnail delete failed:', err))
          }

          // Delete database record
          await supabase
            .from('photos')
            .delete()
            .eq('id', photo.id)

          photosDeleted++
          setProgress(prev => ({ ...prev, photosDeleted }))
        } catch (err) {
          console.error(`Failed to delete photo ${photo.id}:`, err)
          // Continue with remaining photos
        }
      }

      setProgress(prev => ({ ...prev, phase: 'deleting-avatars' }))

      // Delete generations from storage and database
      let avatarsDeleted = 0
      for (const gen of generationsList) {
        try {
          // Delete full-size avatar from avatars bucket
          await supabase.storage
            .from('avatars')
            .remove([gen.output_storage_path])

          // Delete thumbnail from avatar-thumbnails bucket (if exists)
          if (gen.thumbnail_storage_path) {
            await supabase.storage
              .from('avatar-thumbnails')
              .remove([gen.thumbnail_storage_path])
              .catch(err => console.warn('Avatar thumbnail delete failed:', err))
          }

          // Delete database record
          await supabase
            .from('generations')
            .delete()
            .eq('id', gen.id)

          avatarsDeleted++
          setProgress(prev => ({ ...prev, avatarsDeleted }))
        } catch (err) {
          console.error(`Failed to delete generation ${gen.id}:`, err)
          // Continue with remaining generations
        }
      }

      setProgress(prev => ({ ...prev, phase: 'complete' }))
      setIsDeleting(false)

      const totalDeleted = photosDeleted + avatarsDeleted
      const totalExpected = photosList.length + generationsList.length

      if (totalDeleted === totalExpected) {
        toast.success('All image data deleted successfully')
        return true
      } else {
        toast.warning(`Deleted ${totalDeleted} of ${totalExpected} items. Some items may have failed.`)
        return true
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Delete all data error:', error)
      setProgress(prev => ({ ...prev, phase: 'error', error: errorMessage }))
      setIsDeleting(false)
      toast.error(`Failed to delete data: ${errorMessage}`)
      return false
    }
  }, [user])

  return {
    progress,
    isDeleting,
    deleteAllData,
    reset,
  }
}
