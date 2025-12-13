/**
 * Image compression utilities for downloads
 */

export interface CompressionOptions {
  format: 'png' | 'jpeg'
  quality?: number  // 0.0 to 1.0 for JPEG, ignored for PNG
}

/**
 * Compress an image URL using canvas
 * @param imageUrl - URL of the image to compress
 * @param options - Compression options
 * @returns Blob of the compressed image
 */
export async function compressImage(
  imageUrl: string,
  options: CompressionOptions = { format: 'png' }
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      try {
        // Create canvas with same dimensions as image
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          throw new Error('Could not get canvas context')
        }

        // Draw the image
        ctx.drawImage(img, 0, 0)

        // Convert to blob with compression
        const mimeType = options.format === 'jpeg' ? 'image/jpeg' : 'image/png'
        const quality = options.format === 'jpeg' ? (options.quality ?? 0.85) : undefined

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to create blob'))
              return
            }
            resolve(blob)
          },
          mimeType,
          quality
        )
      } catch (error) {
        reject(error)
      }
    }

    img.onerror = () => {
      reject(new Error('Failed to load image'))
    }

    img.src = imageUrl
  })
}

/**
 * Download an image with optional compression
 * @param imageUrl - URL of the image to download
 * @param filename - Filename for the download
 * @param options - Compression options
 */
export async function downloadImage(
  imageUrl: string,
  filename: string,
  options: CompressionOptions = { format: 'png' }
): Promise<void> {
  try {
    const blob = await compressImage(imageUrl, options)

    // Update filename extension based on format
    const ext = options.format === 'jpeg' ? 'jpg' : 'png'
    const finalFilename = filename.replace(/\.(png|jpg|jpeg)$/i, `.${ext}`)

    // Trigger download
    const blobUrl = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = finalFilename
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(blobUrl)
    document.body.removeChild(a)
  } catch (error) {
    console.error('Download error:', error)
    throw error
  }
}

/**
 * Get estimated file size for display
 * @param blob - Image blob
 * @returns Formatted size string (e.g., "1.2 MB")
 */
export function formatFileSize(blob: Blob): string {
  const bytes = blob.size
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
