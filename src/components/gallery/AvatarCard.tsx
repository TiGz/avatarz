import { motion } from 'framer-motion'
import { Generation } from '@/types'
import { Download, Loader2, Eye, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AvatarCardProps {
  generation: Generation
  index: number
  onView: (generation: Generation) => void
  onDownload: (generation: Generation) => void
  onDelete?: (generation: Generation) => void
}

export function AvatarCard({ generation, index, onView, onDownload, onDelete }: AvatarCardProps) {
  const formatStyle = (style: string) => {
    return style.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      className="group relative rounded-xl overflow-hidden bg-white/5 border border-white/10 cursor-pointer sm:cursor-default"
      onClick={() => onView(generation)}
    >
      {/* Image - uses thumbnail for faster loading */}
      <div className="aspect-square">
        {(generation.thumbnailUrl || generation.url) ? (
          <img
            src={generation.thumbnailUrl || generation.url}
            alt={`Avatar - ${generation.style}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
          </div>
        )}
      </div>

      {/* Overlay on hover - hidden on mobile (touch devices don't have hover) */}
      <div className="absolute inset-0 bg-black/60 opacity-0 transition-opacity hidden sm:flex sm:group-hover:opacity-100 items-center justify-center gap-2">
        <Button
          size="icon"
          variant="secondary"
          className="h-10 w-10"
          onClick={(e) => {
            e.stopPropagation()
            onView(generation)
          }}
        >
          <Eye className="h-5 w-5" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          className="h-10 w-10"
          onClick={(e) => {
            e.stopPropagation()
            onDownload(generation)
          }}
        >
          <Download className="h-5 w-5" />
        </Button>
        {onDelete && (
          <Button
            size="icon"
            variant="secondary"
            className="h-10 w-10 hover:bg-red-600 hover:text-white"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(generation)
            }}
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Info footer */}
      <div className="p-3 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-white font-medium text-sm">
            {formatStyle(generation.style)}
          </span>
          <span className="text-gray-400 text-xs">
            {generation.crop_type}
          </span>
        </div>
        {generation.name_text && (
          <p className="text-purple-400 text-xs truncate">
            "{generation.name_text}"
          </p>
        )}
        <p className="text-gray-500 text-xs">
          {new Date(generation.created_at).toLocaleDateString()}
        </p>
      </div>
    </motion.div>
  )
}
