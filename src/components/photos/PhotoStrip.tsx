import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Plus, Camera, Upload, Loader2, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePhotos } from '@/hooks/usePhotos'
import { toast } from 'sonner'
import Webcam from 'react-webcam'

interface PhotoStripProps {
  maxVisible?: number  // Max photos to show before "see all" link
}

export function PhotoStrip({ maxVisible = 6 }: PhotoStripProps) {
  const { photos, loading, uploadPhoto, uploadFromDataUrl } = usePhotos()
  const [showUploadMenu, setShowUploadMenu] = useState(false)
  const [showWebcam, setShowWebcam] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const webcamRef = useRef<Webcam>(null)

  const visiblePhotos = photos.slice(0, maxVisible)
  const hasMore = photos.length > maxVisible

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 10MB.')
      return
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file.')
      return
    }

    setIsUploading(true)
    setShowUploadMenu(false)

    const result = await uploadPhoto(file, file.name)
    if (result) {
      toast.success('Photo uploaded!')
    }

    setIsUploading(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleCapture = async () => {
    const imageSrc = webcamRef.current?.getScreenshot()
    if (!imageSrc) return

    setIsUploading(true)
    setShowWebcam(false)

    const result = await uploadFromDataUrl(imageSrc, `selfie_${Date.now()}.jpg`)
    if (result) {
      toast.success('Photo captured!')
    }

    setIsUploading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-20">
        <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
      </div>
    )
  }

  // Webcam modal
  if (showWebcam) {
    return (
      <div className="relative">
        <div className="flex flex-col items-center gap-4 p-4 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10">
          <div className="relative w-48 h-48 rounded-xl overflow-hidden bg-black">
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              screenshotQuality={0.9}
              videoConstraints={{
                facingMode: 'user',
                aspectRatio: 1,
              }}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowWebcam(false)}
              className="bg-transparent border-white/20 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCapture}
              disabled={isUploading}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Camera className="mr-1 h-4 w-4" />
                  Capture
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Title row */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-400">My Photos</h3>
        {hasMore && (
          <Link
            to="/photos"
            className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1"
          >
            See all ({photos.length})
            <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>

      {/* Horizontal scroll strip */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
        {/* Add button - always first */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setShowUploadMenu(!showUploadMenu)}
            disabled={isUploading}
            className="w-16 h-16 rounded-xl bg-white/5 border-2 border-dashed border-white/20 hover:border-purple-500/50 hover:bg-white/10 transition-all flex items-center justify-center"
          >
            {isUploading ? (
              <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
            ) : (
              <Plus className="h-6 w-6 text-gray-400" />
            )}
          </button>

          {/* Upload menu dropdown */}
          {showUploadMenu && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-full left-0 mt-2 bg-gray-900 border border-white/10 rounded-xl shadow-xl overflow-hidden z-50"
            >
              <button
                onClick={() => {
                  setShowUploadMenu(false)
                  setShowWebcam(true)
                }}
                className="flex items-center gap-2 w-full px-4 py-3 text-sm text-white hover:bg-white/10 transition-colors"
              >
                <Camera className="h-4 w-4 text-purple-400" />
                Take selfie
              </button>
              <button
                onClick={() => {
                  setShowUploadMenu(false)
                  fileInputRef.current?.click()
                }}
                className="flex items-center gap-2 w-full px-4 py-3 text-sm text-white hover:bg-white/10 transition-colors border-t border-white/10"
              >
                <Upload className="h-4 w-4 text-blue-400" />
                Upload photo
              </button>
            </motion.div>
          )}
        </div>

        {/* Photo thumbnails */}
        {visiblePhotos.map((photo, index) => (
          <motion.div
            key={photo.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className="flex-shrink-0"
          >
            <Link to="/photos">
              <div className="w-16 h-16 rounded-xl overflow-hidden ring-2 ring-transparent hover:ring-purple-500/50 transition-all">
                <img
                  src={photo.thumbnailUrl || photo.url}
                  alt={photo.filename}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            </Link>
          </motion.div>
        ))}

        {/* Show more indicator */}
        {hasMore && (
          <Link
            to="/photos"
            className="flex-shrink-0 w-16 h-16 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center"
          >
            <span className="text-xs text-gray-400 font-medium">
              +{photos.length - maxVisible}
            </span>
          </Link>
        )}

        {/* Empty state prompt */}
        {photos.length === 0 && (
          <div className="text-sm text-gray-500 py-4">
            Add your first photo to get started
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Click outside handler for dropdown */}
      {showUploadMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowUploadMenu(false)}
        />
      )}
    </div>
  )
}
