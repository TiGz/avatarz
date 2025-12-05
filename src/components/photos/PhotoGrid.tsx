import { useState } from 'react'
import { motion } from 'framer-motion'
import { Photo } from '@/types'
import { Trash2, Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PhotoGridProps {
  photos: Photo[]
  loading: boolean
  onDelete?: (photoId: string) => Promise<boolean>
  onSelect?: (photo: Photo) => void
  selectable?: boolean
  selectedId?: string | null
  selectedIds?: string[]  // For multi-photo selection
}

export function PhotoGrid({
  photos,
  loading,
  onDelete,
  onSelect,
  selectable = false,
  selectedId = null,
  selectedIds = [],
}: PhotoGridProps) {
  // Check if photo is selected (supports both single and multi-select)
  const isSelected = (photoId: string) => {
    if (selectedIds.length > 0) {
      return selectedIds.includes(photoId)
    }
    return selectedId === photoId
  }

  // Get selection index for multi-select (1, 2, 3...)
  const getSelectionIndex = (photoId: string) => {
    const index = selectedIds.indexOf(photoId)
    return index >= 0 ? index + 1 : null
  }
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (e: React.MouseEvent, photoId: string) => {
    e.stopPropagation()
    if (!onDelete) return

    setDeletingId(photoId)
    await onDelete(photoId)
    setDeletingId(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    )
  }

  if (photos.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📷</div>
        <h3 className="text-xl font-semibold text-white mb-2">No photos yet</h3>
        <p className="text-gray-400">
          Your saved photos will appear here
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {photos.map((photo, index) => (
        <motion.div
          key={photo.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
          className={`
            relative aspect-square rounded-xl overflow-hidden group cursor-pointer
            border-2 transition-all
            ${isSelected(photo.id)
              ? 'border-purple-500 ring-2 ring-purple-500/50'
              : 'border-transparent hover:border-white/20'
            }
          `}
          onClick={() => onSelect?.(photo)}
        >
          {photo.url ? (
            <img
              src={photo.url}
              alt={photo.filename}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-white/5 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
            </div>
          )}

          {/* Selected indicator */}
          {selectable && isSelected(photo.id) && (
            <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center">
              {getSelectionIndex(photo.id) ? (
                <span className="text-xs font-bold text-white">{getSelectionIndex(photo.id)}</span>
              ) : (
                <Check className="h-4 w-4 text-white" />
              )}
            </div>
          )}

          {/* Overlay with actions */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            {onDelete && (
              <Button
                size="icon"
                variant="destructive"
                className="h-8 w-8"
                onClick={(e) => handleDelete(e, photo.id)}
                disabled={deletingId === photo.id}
              >
                {deletingId === photo.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>

          {/* Date label */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
            <p className="text-xs text-gray-300 truncate">
              {new Date(photo.created_at).toLocaleDateString()}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
