import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, PanInfo } from 'framer-motion'
import { Generation } from '@/types'
import { X, Download, Calendar, Palette, Crop, Type, Loader2, Trash2, Share2, Copy, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
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

interface AvatarModalProps {
  generation: Generation | null
  onClose: () => void
  onDownload: (generation: Generation) => void
  onDelete?: (generation: Generation) => Promise<boolean>
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
  onDownload,
  onDelete,
  deleting = false,
  onNext,
  onPrev,
  hasNext = false,
  hasPrev = false,
  currentIndex,
  totalCount
}: AvatarModalProps) {
  const [fullLoaded, setFullLoaded] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

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

          <div className="flex flex-col sm:flex-row">
            {/* Image - progressive loading from thumbnail to full resolution */}
            <motion.div
              className="w-full sm:w-2/3 aspect-square bg-black relative overflow-hidden flex-shrink-0"
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
            <div className="w-full sm:w-1/3 p-4 sm:p-6 space-y-3 sm:space-y-4">
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

              {/* Custom style info */}
              {generation.custom_style && (
                <div className="p-3 bg-white/5 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Custom Style</p>
                  <p className="text-sm text-gray-300">{generation.custom_style}</p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 sm:flex-col sm:space-y-2 sm:gap-0 pb-4 sm:pb-0">
                <Button
                  onClick={() => onDownload(generation)}
                  className="flex-1 sm:w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
                <div className="flex-1 sm:w-full flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleShare}
                    className="flex-1 border-white/20 text-white bg-white/5 hover:bg-white/10"
                  >
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                  </Button>
                  {generation.share_url && (
                    <Button
                      variant="outline"
                      onClick={async () => {
                        await navigator.clipboard.writeText(generation.share_url!)
                        toast.success('Link copied!')
                      }}
                      className="border-white/20 text-white bg-white/5 hover:bg-white/10 px-3"
                      title="Copy link"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {onDelete && (
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex-1 sm:w-full border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Delete confirmation dialog */}
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
      </motion.div>
    </AnimatePresence>
  )
}
