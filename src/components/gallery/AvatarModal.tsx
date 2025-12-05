import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Generation } from '@/types'
import { X, Download, Calendar, Palette, Crop, Type, Loader2, Trash2 } from 'lucide-react'
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
}

export function AvatarModal({ generation, onClose, onDownload, onDelete, deleting = false }: AvatarModalProps) {
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

  // Reset loading state when generation changes
  useEffect(() => {
    setFullLoaded(false)
  }, [generation?.id])

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
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative w-full h-full sm:h-auto sm:max-w-3xl bg-gray-900 sm:rounded-2xl overflow-hidden overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex flex-col sm:flex-row">
            {/* Image - progressive loading from thumbnail to full resolution */}
            <div className="w-full sm:w-2/3 aspect-square bg-black relative overflow-hidden flex-shrink-0">
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
            </div>

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
