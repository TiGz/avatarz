import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, PanInfo } from 'framer-motion'
import { Generation } from '@/types'
import { X, Download, Calendar, Palette, Crop, Type, Loader2, Trash2, Share2, ChevronDown, ChevronLeft, ChevronRight, Monitor, ImagePlus, Wand2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { getAspectRatioCss } from '@/lib/aspectRatio'
import { downloadImage, formatFileSize, compressImage } from '@/lib/imageCompression'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Slider } from '@/components/ui/slider'

interface AvatarModalProps {
  generation: Generation | null
  onClose: () => void
  onDelete?: (generation: Generation) => Promise<boolean>
  onCopyToPhotos?: (generation: Generation) => Promise<boolean>
  deleting?: boolean
  onNext?: () => void
  onPrev?: () => void
  hasNext?: boolean
  hasPrev?: boolean
  currentIndex?: number
  totalCount?: number
}

export function AvatarModal({
  generation,
  onClose,
  onDelete,
  onCopyToPhotos,
  deleting = false,
  onNext,
  onPrev,
  hasNext = false,
  hasPrev = false,
  currentIndex,
  totalCount
}: AvatarModalProps) {
  const navigate = useNavigate()
  const [fullLoaded, setFullLoaded] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isCopying, setIsCopying] = useState(false)

  // Download options state
  const [showDownloadOptions, setShowDownloadOptions] = useState(false)
  const [downloadFormat, setDownloadFormat] = useState<'png' | 'jpeg'>('png')
  const [jpegQuality, setJpegQuality] = useState(85)
  const [isDownloading, setIsDownloading] = useState(false)
  const [estimatedSize, setEstimatedSize] = useState<string | null>(null)

  const handleDelete = async () => {
    if (!generation || !onDelete) return
    const success = await onDelete(generation)
    if (success) {
      setShowDeleteConfirm(false)
      onClose()
    }
  }

  // Swipe gesture handling
  const handleDragEnd = useCallback((_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 50
    const velocityThreshold = 300

    // Swipe down to close
    if (info.offset.y > threshold || info.velocity.y > velocityThreshold) {
      onClose()
      return
    }

    // Swipe left to go next
    if ((info.offset.x < -threshold || info.velocity.x < -velocityThreshold) && hasNext && onNext) {
      onNext()
      return
    }

    // Swipe right to go previous
    if ((info.offset.x > threshold || info.velocity.x > velocityThreshold) && hasPrev && onPrev) {
      onPrev()
      return
    }
  }, [onClose, onNext, onPrev, hasNext, hasPrev])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowLeft' && hasPrev && onPrev) {
        onPrev()
      } else if (e.key === 'ArrowRight' && hasNext && onNext) {
        onNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, onNext, onPrev, hasNext, hasPrev])

  // Reset loading state when generation changes
  useEffect(() => {
    setFullLoaded(false)
  }, [generation?.id])

  const generateFilename = () => {
    const parts: string[] = []
    if (generation?.name_text) {
      parts.push(generation.name_text.toLowerCase().replace(/\s+/g, '-'))
    }
    parts.push(generation?.style || 'avatar')
    parts.push('avatar')
    return `${parts.join('-')}.png`
  }

  // Estimate file size for current settings
  useEffect(() => {
    if (!showDownloadOptions || !generation?.url) {
      setEstimatedSize(null)
      return
    }

    let cancelled = false

    async function estimateSize() {
      try {
        const blob = await compressImage(generation!.url!, {
          format: downloadFormat,
          quality: downloadFormat === 'jpeg' ? jpegQuality / 100 : undefined,
        })
        if (!cancelled) {
          setEstimatedSize(formatFileSize(blob))
        }
      } catch (error) {
        console.error('Failed to estimate size:', error)
        if (!cancelled) {
          setEstimatedSize(null)
        }
      }
    }

    estimateSize()

    return () => {
      cancelled = true
    }
  }, [showDownloadOptions, downloadFormat, jpegQuality, generation?.url])

  const handleDownloadWithOptions = async () => {
    if (!generation?.url) return

    setIsDownloading(true)
    try {
      await downloadImage(generation.url, generateFilename(), {
        format: downloadFormat,
        quality: downloadFormat === 'jpeg' ? jpegQuality / 100 : undefined,
      })
      toast.success('Avatar downloaded!')
      setShowDownloadOptions(false)
    } catch (error) {
      console.error('Download error:', error)
      toast.error('Failed to download. Try again.')
    } finally {
      setIsDownloading(false)
    }
  }

  const handleShare = async () => {
    if (!generation?.url) return

    try {
      // Fetch the image and convert to File for native sharing
      const response = await fetch(generation.url)
      const blob = await response.blob()
      const file = new File([blob], generateFilename(), { type: 'image/png' })

      // Check if browser supports file sharing
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'My Avatar',
          text: 'Check out my AI-generated avatar!',
        })
      } else if (generation.share_url) {
        // Fallback to URL sharing
        if (navigator.share) {
          await navigator.share({ url: generation.share_url })
        } else {
          await navigator.clipboard.writeText(generation.share_url)
          toast.success('Link copied!')
        }
      }
    } catch (error) {
      // User cancelled share - ignore AbortError
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Share error:', error)
        toast.error('Failed to share')
      }
    }
  }

  const handleCreateWallpaper = () => {
    if (!generation) return
    onClose()
    navigate(`/wallpaper/${generation.id}`)
  }

  const handleEditWithAI = () => {
    if (!generation) return
    onClose()
    navigate(`/edit/${generation.id}`)
  }

  const handleCopyToPhotos = async () => {
    if (!generation || !onCopyToPhotos) return
    setIsCopying(true)
    try {
      const success = await onCopyToPhotos(generation)
      if (success) {
        toast.success('Avatar copied to photo library')
      }
    } finally {
      setIsCopying(false)
    }
  }

  if (!generation) return null

  const formatStyle = (style: string) => {
    return style.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  }

  const formatCrop = (crop: string) => {
    const labels: Record<string, string> = {
      'floating-head': 'Floating Head',
      portrait: 'Portrait',
      headshot: 'Headshot', // legacy support
      half: 'Half Body',
      full: 'Full Body',
    }
    return labels[crop] || crop.replace(/\b\w/g, (l) => l.toUpperCase())
  }

  return (
    <>
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 50 }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
          className="relative w-full h-full sm:h-auto sm:max-w-3xl bg-gray-900 sm:rounded-2xl overflow-hidden overflow-y-auto touch-pan-x"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Mobile header with back button and counter */}
          <div className="sm:hidden flex items-center justify-between p-3 bg-black/30 backdrop-blur-sm sticky top-0 z-20">
            <button
              onClick={onClose}
              className="flex items-center gap-1 text-white/90 hover:text-white py-1 px-2 -ml-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <ChevronDown className="h-5 w-5" />
              <span className="text-sm font-medium">Close</span>
            </button>

            {currentIndex !== undefined && totalCount !== undefined && (
              <span className="text-white/70 text-sm">
                {currentIndex + 1} / {totalCount}
              </span>
            )}

            {/* Navigation arrows for mobile */}
            <div className="flex items-center gap-1">
              <button
                onClick={onPrev}
                disabled={!hasPrev}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/90 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={onNext}
                disabled={!hasNext}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/90 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Desktop close button */}
          <button
            onClick={onClose}
            className="hidden sm:flex absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 items-center justify-center text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Desktop navigation arrows */}
          {hasPrev && onPrev && (
            <button
              onClick={onPrev}
              className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 items-center justify-center text-white transition-colors"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
          {hasNext && onNext && (
            <button
              onClick={onNext}
              className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 items-center justify-center text-white transition-colors"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}

          <div className="flex flex-col sm:flex-row min-h-0">
            {/* Image - progressive loading from thumbnail to full resolution */}
            <motion.div
              className="w-full sm:w-2/3 bg-black relative overflow-hidden flex-shrink-0 min-h-[200px] max-h-[50vh] sm:max-h-none flex items-center justify-center"
              style={{ aspectRatio: getAspectRatioCss(generation.metadata?.original_ratio) }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.3}
              onDragEnd={handleDragEnd}
            >
              {/* Show thumbnail immediately as placeholder */}
              {generation.thumbnailUrl && (
                <img
                  src={generation.thumbnailUrl}
                  alt={`Avatar - ${generation.style}`}
                  className={`w-full h-full object-contain absolute inset-0 transition-opacity duration-300 ${
                    fullLoaded ? 'opacity-0' : 'opacity-100'
                  }`}
                />
              )}

              {/* Load full resolution on top */}
              {generation.url ? (
                <img
                  src={generation.url}
                  alt={`Avatar - ${generation.style}`}
                  className={`w-full h-full object-contain relative z-10 transition-opacity duration-300 ${
                    fullLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
                  onLoad={() => setFullLoaded(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              )}

              {/* Loading indicator while full image loads */}
              {!fullLoaded && generation.url && (
                <div className="absolute bottom-4 right-4 bg-black/50 rounded-full p-2 z-20">
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                </div>
              )}
            </motion.div>

            {/* Details */}
            <div className="w-full sm:w-1/3 p-4 sm:p-6 pb-6 sm:pb-6 space-y-3 sm:space-y-4 overflow-y-auto">
              <h2 className="text-lg sm:text-xl font-bold text-white">Avatar Details</h2>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-gray-300">
                  <Palette className="h-4 w-4 text-purple-400" />
                  <div>
                    <p className="text-xs text-gray-500">Style</p>
                    <p className="text-sm">{formatStyle(generation.style)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-gray-300">
                  <Crop className="h-4 w-4 text-blue-400" />
                  <div>
                    <p className="text-xs text-gray-500">Crop</p>
                    <p className="text-sm">{formatCrop(generation.crop_type)}</p>
                  </div>
                </div>

                {generation.name_text && (
                  <div className="flex items-center gap-3 text-gray-300">
                    <Type className="h-4 w-4 text-green-400" />
                    <div>
                      <p className="text-xs text-gray-500">Name</p>
                      <p className="text-sm">"{generation.name_text}"</p>
                      {generation.name_placement && (
                        <p className="text-xs text-gray-500">
                          ({generation.name_placement})
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 text-gray-300">
                  <Calendar className="h-4 w-4 text-orange-400" />
                  <div>
                    <p className="text-xs text-gray-500">Created</p>
                    <p className="text-sm">
                      {new Date(generation.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action buttons - moved above prompt for mobile accessibility */}
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-1">
                <Button
                  onClick={() => setShowDownloadOptions(true)}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 h-auto py-2"
                >
                  <span className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
                    <Download className="h-4 w-4" />
                    <span className="text-xs sm:text-sm">Download</span>
                  </span>
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCreateWallpaper}
                  className="border-white/20 text-white bg-white/5 hover:bg-white/10 h-auto py-2"
                >
                  <span className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
                    <Monitor className="h-4 w-4" />
                    <span className="text-xs sm:text-sm">Wallpaper</span>
                  </span>
                </Button>
                <Button
                  variant="outline"
                  onClick={handleEditWithAI}
                  className="border-white/20 text-white bg-white/5 hover:bg-white/10 h-auto py-2"
                >
                  <span className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
                    <Wand2 className="h-4 w-4" />
                    <span className="text-xs sm:text-sm">Edit</span>
                  </span>
                </Button>
                <Button
                  variant="outline"
                  onClick={handleShare}
                  className="border-white/20 text-white bg-white/5 hover:bg-white/10 h-auto py-2"
                >
                  <span className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
                    <Share2 className="h-4 w-4" />
                    <span className="text-xs sm:text-sm">Share</span>
                  </span>
                </Button>
                {onCopyToPhotos && (
                  <Button
                    variant="outline"
                    onClick={handleCopyToPhotos}
                    disabled={isCopying}
                    className="border-white/20 text-white bg-white/5 hover:bg-white/10 h-auto py-2"
                  >
                    <span className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
                      {isCopying ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                      <span className="text-xs sm:text-sm">{isCopying ? 'Copying...' : 'Copy to Photos'}</span>
                    </span>
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="col-span-3 sm:col-span-1 border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span className="text-sm">Delete</span>
                  </Button>
                )}
              </div>

              {/* Custom style info - moved below buttons for better mobile UX */}
              {generation.custom_style && (
                <div className="p-3 bg-white/5 rounded-lg mt-3">
                  <p className="text-xs text-gray-500 mb-1">Custom Style</p>
                  <p className="text-sm text-gray-300 whitespace-pre-wrap break-words">{generation.custom_style}</p>
                </div>
              )}

              {/* Full prompt info - if available */}
              {generation.full_prompt && (
                <div className="p-3 bg-white/5 rounded-lg mt-3">
                  <p className="text-xs text-gray-500 mb-1">Full Prompt</p>
                  <p className="text-sm text-gray-300 whitespace-pre-wrap break-words max-h-60 overflow-y-auto">{generation.full_prompt}</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>

    {/* Delete confirmation dialog - outside AnimatePresence to avoid click conflicts */}
    <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Avatar?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete this avatar. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Download options dialog - outside AnimatePresence to avoid click conflicts */}
    <Dialog open={showDownloadOptions} onOpenChange={setShowDownloadOptions}>
      <DialogContent className="bg-gray-900 border-white/20 text-white">
        <DialogHeader>
          <DialogTitle>Download Options</DialogTitle>
          <DialogDescription className="text-gray-400">
            Choose format and compression settings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format selection */}
          <div className="space-y-3">
            <Label>Format</Label>
            <RadioGroup value={downloadFormat} onValueChange={(v: string) => setDownloadFormat(v as 'png' | 'jpeg')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="png" id="modal-png" />
                <Label htmlFor="modal-png" className="font-normal cursor-pointer">
                  PNG (Lossless, larger file)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="jpeg" id="modal-jpeg" />
                <Label htmlFor="modal-jpeg" className="font-normal cursor-pointer">
                  JPEG (Compressed, smaller file)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* JPEG quality slider */}
          {downloadFormat === 'jpeg' && (
            <div className="space-y-3">
              <div className="flex justify-between">
                <Label>Quality</Label>
                <span className="text-sm text-gray-400">{jpegQuality}%</span>
              </div>
              <Slider
                value={[jpegQuality]}
                onValueChange={([value]: number[]) => setJpegQuality(value)}
                min={50}
                max={100}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Smaller file</span>
                <span>Better quality</span>
              </div>
            </div>
          )}

          {/* Estimated file size */}
          {estimatedSize && (
            <div className="p-3 bg-white/5 rounded-lg border border-white/10">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Estimated size:</span>
                <span className="text-sm font-medium">{estimatedSize}</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setShowDownloadOptions(false)}
            disabled={isDownloading}
            className="flex-1 border-white/20 text-white hover:bg-white/10"
          >
            Cancel
          </Button>
          <Button
            onClick={handleDownloadWithOptions}
            disabled={isDownloading}
            className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            {isDownloading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Download
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  </>
  )
}
