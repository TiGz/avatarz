import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { useGenerations } from '@/hooks/useGenerations'
import { AvatarCard } from '@/components/gallery/AvatarCard'
import { AvatarModal } from '@/components/gallery/AvatarModal'
import { Generation } from '@/types'
import { Sparkles, RefreshCw, Loader2, ArrowLeft } from 'lucide-react'
import { Header } from '@/components/ui/Header'
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

export function GalleryPage() {
  const navigate = useNavigate()
  const {
    generations,
    totalCount,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    downloadAvatar,
    deleteGeneration,
    ensureFullUrl,
    refresh,
  } = useGenerations()
  const [selectedGenerationId, setSelectedGenerationId] = useState<string | null>(null)

  // Get the selected generation from the list (so it updates when URL is fetched)
  const selectedGeneration = selectedGenerationId
    ? generations.find((g) => g.id === selectedGenerationId) || null
    : null
  const [deleteTarget, setDeleteTarget] = useState<Generation | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement>(null)
  const hasMoreRef = useRef(hasMore)
  const loadingMoreRef = useRef(loadingMore)

  // Keep refs in sync
  useEffect(() => {
    hasMoreRef.current = hasMore
    loadingMoreRef.current = loadingMore
  }, [hasMore, loadingMore])

  useEffect(() => {
    // Wait for loading to complete so sentinel is rendered
    if (loading) return

    const sentinel = sentinelRef.current
    console.log('[GalleryPage] Setting up observer, sentinel:', !!sentinel, 'loading:', loading)
    if (!sentinel) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        console.log('[GalleryPage] Intersection:', entry.isIntersecting, 'hasMore:', hasMoreRef.current, 'loadingMore:', loadingMoreRef.current)
        if (entry.isIntersecting && hasMoreRef.current && !loadingMoreRef.current) {
          console.log('[GalleryPage] Triggering loadMore')
          loadMore()
        }
      },
      { rootMargin: '200px' }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loading, loadMore])

  const handleViewGeneration = useCallback(
    async (generation: Generation) => {
      setSelectedGenerationId(generation.id)
      // Fetch full-res URL in background for modal
      await ensureFullUrl(generation)
    },
    [ensureFullUrl]
  )

  const handleDeleteFromCard = (generation: Generation) => {
    setDeleteTarget(generation)
  }

  const handleDeleteFromModal = async (generation: Generation): Promise<boolean> => {
    setDeleting(true)
    const success = await deleteGeneration(generation.id)
    setDeleting(false)
    if (success) {
      setSelectedGenerationId(null)
    }
    return success
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    const success = await deleteGeneration(deleteTarget.id)
    setDeleting(false)
    if (success) {
      setDeleteTarget(null)
      if (selectedGenerationId === deleteTarget.id) {
        setSelectedGenerationId(null)
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black">
      <Header>
        <Button
          variant="ghost"
          size="icon"
          onClick={refresh}
          className="text-white hover:bg-white/10"
        >
          <RefreshCw className="h-5 w-5" />
        </Button>
      </Header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Back button */}
          <div className="flex justify-between items-center mb-6">
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            {!loading && generations.length > 0 && (
              <p className="text-gray-400">
                {generations.length}
                {totalCount !== null && ` / ${totalCount}`}
                {' '}avatar{(totalCount ?? generations.length) !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            </div>
          )}

          {/* Empty state */}
          {!loading && generations.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎨</div>
              <h3 className="text-xl font-semibold text-white mb-2">No avatars yet</h3>
              <p className="text-gray-400 mb-6">
                Your generated avatars will appear here
              </p>
              <Button
                onClick={() => navigate('/wizard')}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Create Your First Avatar
              </Button>
            </div>
          )}

          {/* Avatar Grid */}
          {!loading && generations.length > 0 && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
                {generations.map((generation, index) => (
                  <AvatarCard
                    key={generation.id}
                    generation={generation}
                    index={index}
                    onView={handleViewGeneration}
                    onDownload={downloadAvatar}
                    onDelete={handleDeleteFromCard}
                  />
                ))}
              </div>

              {/* Infinite scroll sentinel */}
              <div ref={sentinelRef} className="h-4 mt-4" />

              {/* Loading more indicator */}
              {loadingMore && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
                </div>
              )}

              {/* End of list */}
              {!hasMore && generations.length > 12 && (
                <p className="text-center text-gray-500 py-4">
                  You've seen all {generations.length} avatars
                </p>
              )}
            </>
          )}
        </motion.div>
      </main>

      {/* Modal */}
      {selectedGeneration && (
        <AvatarModal
          generation={selectedGeneration}
          onClose={() => setSelectedGenerationId(null)}
          onDownload={downloadAvatar}
          onDelete={handleDeleteFromModal}
          deleting={deleting}
        />
      )}

      {/* Delete confirmation dialog for card deletions */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
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
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
