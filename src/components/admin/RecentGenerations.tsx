import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { toast } from 'sonner'
import { RecentGeneration } from '@/types'
import { AnimatePresence, motion } from 'framer-motion'

export function RecentGenerations() {
  const [generations, setGenerations] = useState<RecentGeneration[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const pageSize = 20

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL

  useEffect(() => {
    fetchGenerations()
  }, [page])

  // Keyboard navigation
  useEffect(() => {
    if (selectedIndex === null) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedIndex(null)
      } else if (e.key === 'ArrowLeft' && selectedIndex > 0) {
        setSelectedIndex(selectedIndex - 1)
      } else if (e.key === 'ArrowRight' && selectedIndex < generations.length - 1) {
        setSelectedIndex(selectedIndex + 1)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedIndex, generations.length])

  const getThumbnailUrl = (thumbnailPath: string | null) => {
    if (!thumbnailPath) return null
    return `${supabaseUrl}/storage/v1/object/public/avatar-thumbnails/${thumbnailPath}`
  }

  const fetchGenerations = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .rpc('admin_get_recent_generations', {
        p_limit: pageSize + 1,
        p_offset: page * pageSize,
      })

    if (error) {
      toast.error('Failed to load generations')
      console.error(error)
    } else {
      const results = data || []
      setHasMore(results.length > pageSize)
      setGenerations(results.slice(0, pageSize))
    }
    setLoading(false)
  }

  const formatCost = (cost: number | null) => {
    if (cost === null || cost === undefined) return '-'
    return `$${cost.toFixed(4)}`
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const formatTokens = (tokens: number | null) => {
    if (tokens === null || tokens === undefined) return '-'
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}k`
    return tokens.toString()
  }

  const selectedGen = selectedIndex !== null ? generations[selectedIndex] : null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-white">Recent Generations</h3>
          <p className="text-gray-400 text-sm">View all avatar generations with costs</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => { setPage(0); fetchGenerations() }}
          disabled={loading}
          className="text-white hover:bg-white/10"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {loading && generations.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : generations.length === 0 ? (
        <p className="text-gray-500 text-sm py-4 text-center">
          No generations yet
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 px-3 text-gray-400 font-medium">User</th>
                  <th className="text-left py-2 px-3 text-gray-400 font-medium">Style</th>
                  <th className="text-left py-2 px-3 text-gray-400 font-medium">Name</th>
                  <th className="text-right py-2 px-3 text-gray-400 font-medium">Tokens</th>
                  <th className="text-right py-2 px-3 text-gray-400 font-medium">Cost</th>
                  <th className="text-right py-2 px-3 text-gray-400 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {generations.map((gen, index) => (
                  <tr
                    key={gen.gen_id}
                    onClick={() => setSelectedIndex(index)}
                    className="border-b border-white/5 hover:bg-white/5 cursor-pointer"
                  >
                    <td className="py-2 px-3 text-gray-300 truncate max-w-[150px]">
                      {gen.user_email}
                    </td>
                    <td className="py-2 px-3 text-gray-300 capitalize">
                      {gen.gen_style.replace(/-/g, ' ')}
                    </td>
                    <td className="py-2 px-3 text-gray-300">
                      {gen.gen_name_text || '-'}
                    </td>
                    <td className="py-2 px-3 text-gray-400 text-right">
                      {formatTokens(gen.gen_total_tokens)}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <span className={gen.gen_cost_usd ? 'text-green-400' : 'text-gray-500'}>
                        {formatCost(gen.gen_cost_usd)}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-gray-400 text-right whitespace-nowrap">
                      {formatDate(gen.gen_created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
              className="text-gray-400 hover:text-white hover:bg-white/10"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <span className="text-gray-500 text-sm">
              Page {page + 1}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={!hasMore || loading}
              className="text-gray-400 hover:text-white hover:bg-white/10"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </>
      )}

      {/* Modal */}
      <AnimatePresence>
        {selectedGen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            onClick={() => setSelectedIndex(null)}
          >
            {/* Navigation arrows */}
            {selectedIndex !== null && selectedIndex > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); setSelectedIndex(selectedIndex - 1) }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}
            {selectedIndex !== null && selectedIndex < generations.length - 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); setSelectedIndex(selectedIndex + 1) }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}

            {/* Close button */}
            <button
              onClick={() => setSelectedIndex(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Content */}
            <motion.div
              key={selectedGen.gen_id}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-900 rounded-xl overflow-hidden max-w-sm w-full shadow-2xl"
            >
              {getThumbnailUrl(selectedGen.gen_thumbnail_path) ? (
                <img
                  src={getThumbnailUrl(selectedGen.gen_thumbnail_path)!}
                  alt="Avatar"
                  className="w-full aspect-square object-cover"
                />
              ) : (
                <div className="w-full aspect-square bg-gray-800 flex items-center justify-center text-gray-500">
                  No thumbnail
                </div>
              )}
              <div className="p-4 space-y-2">
                <p className="text-white font-semibold text-lg capitalize">
                  {selectedGen.gen_style.replace(/-/g, ' ')}
                </p>
                <p className="text-gray-400 text-sm">{selectedGen.user_email}</p>
                {selectedGen.gen_name_text && (
                  <p className="text-gray-300">Name: {selectedGen.gen_name_text}</p>
                )}
                <div className="flex justify-between text-sm text-gray-500 pt-2 border-t border-white/10">
                  <span>{formatTokens(selectedGen.gen_total_tokens)} tokens</span>
                  <span className="text-green-400">{formatCost(selectedGen.gen_cost_usd)}</span>
                </div>
                <p className="text-gray-500 text-xs">
                  {formatDate(selectedGen.gen_created_at)}
                </p>
                <p className="text-gray-600 text-xs text-center pt-2">
                  {selectedIndex !== null && `${selectedIndex + 1} of ${generations.length}`} · Use ← → to navigate
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
