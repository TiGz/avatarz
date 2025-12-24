import { supabase } from './supabase'

const MAX_THUMBNAIL_SIZE = 300
const THUMBNAIL_QUALITY = 0.85

interface ThumbnailResult {
  success: boolean
  thumbnailPath?: string
  thumbnailUrl?: string
  error?: string
}

/**
 * Calculate thumbnail dimensions that fit within MAX_SIZE while preserving aspect ratio
 */
function calculateThumbnailDimensions(
  originalWidth: number,
  originalHeight: number
): { width: number; height: number } {
  const ratio = originalWidth / originalHeight

  if (ratio >= 1) {
    // Landscape or square: constrain width
    return { width: MAX_THUMBNAIL_SIZE, height: Math.round(MAX_THUMBNAIL_SIZE / ratio) }
  }
  // Portrait: constrain height
  return { width: Math.round(MAX_THUMBNAIL_SIZE * ratio), height: MAX_THUMBNAIL_SIZE }
}

/**
 * Generate a thumbnail from an image using Canvas API
 * Works with both base64 data URLs and regular URLs
 */
async function generateThumbnailBlob(imageSource: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      try {
        const { width, height } = calculateThumbnailDimensions(img.naturalWidth, img.naturalHeight)

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }

        // Use high-quality image smoothing
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'

        // Draw resized image
        ctx.drawImage(img, 0, 0, width, height)

        // Convert to JPEG blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('Failed to create thumbnail blob'))
            }
          },
          'image/jpeg',
          THUMBNAIL_QUALITY
        )
      } catch (err) {
        reject(err)
      }
    }

    img.onerror = () => {
      reject(new Error('Failed to load image for thumbnail generation'))
    }

    img.src = imageSource
  })
}

/**
 * Generate and upload a thumbnail for a generation
 * Call this after receiving the generated image from the edge function
 *
 * @param imageSource - Base64 data URL or signed URL of the full image
 * @param generationId - The ID of the generation record to update
 * @param userId - The user's ID (used for storage path)
 * @returns Result with thumbnail path and URL if successful
 */
export async function generateAndUploadThumbnail(
  imageSource: string,
  generationId: string,
  userId: string
): Promise<ThumbnailResult> {
  try {
    console.log('[thumbnailGenerator] Starting client-side thumbnail generation')

    // Generate thumbnail blob using Canvas
    const thumbnailBlob = await generateThumbnailBlob(imageSource)
    console.log('[thumbnailGenerator] Generated thumbnail blob:', thumbnailBlob.size, 'bytes')

    // Create unique filename
    const thumbnailPath = `${userId}/${Date.now()}_${crypto.randomUUID()}_thumb.jpg`

    // Upload to avatar-thumbnails bucket
    const { error: uploadError } = await supabase.storage
      .from('avatar-thumbnails')
      .upload(thumbnailPath, thumbnailBlob, {
        contentType: 'image/jpeg',
        cacheControl: '31536000', // 1 year cache
      })

    if (uploadError) {
      console.error('[thumbnailGenerator] Upload error:', uploadError)
      return { success: false, error: uploadError.message }
    }

    console.log('[thumbnailGenerator] Thumbnail uploaded:', thumbnailPath)

    // Update the generation record with the thumbnail path
    const { error: updateError } = await supabase
      .from('generations')
      .update({ thumbnail_storage_path: thumbnailPath })
      .eq('id', generationId)

    if (updateError) {
      console.error('[thumbnailGenerator] Database update error:', updateError)
      // Thumbnail uploaded but DB update failed - not critical
      // The thumbnail exists and can be linked later
    }

    // Build public URL
    const thumbnailUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/avatar-thumbnails/${thumbnailPath}`

    console.log('[thumbnailGenerator] Thumbnail generation complete')

    return {
      success: true,
      thumbnailPath,
      thumbnailUrl,
    }
  } catch (err) {
    console.error('[thumbnailGenerator] Error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}
