import { useState } from 'react'
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
  const { generations, loading, downloadAvatar, deleteGeneration, refresh } = useGenerations()
  const [selectedGeneration, setSelectedGeneration] = useState<Generation | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Generation | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleDeleteFromCard = (generation: Generation) => {
    setDeleteTarget(generation)
  }

  const handleDeleteFromModal = async (generation: Generation): Promise<boolean> => {
    setDeleting(true)
    const success = await deleteGeneration(generation.id)
    setDeleting(false)
    if (success) {
      setSelectedGeneration(null)
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
      if (selectedGeneration?.id === deleteTarget.id) {
        setSelectedGeneration(null)
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black">
      <Header title="My Gallery">
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
                {generations.length} avatar{generations.length !== 1 ? 's' : ''} generated
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {generations.map((generation, index) => (
                <AvatarCard
                  key={generation.id}
                  generation={generation}
                  index={index}
                  onView={setSelectedGeneration}
                  onDownload={downloadAvatar}
                  onDelete={handleDeleteFromCard}
                />
              ))}
            </div>
          )}
        </motion.div>
      </main>

      {/* Modal */}
      {selectedGeneration && (
        <AvatarModal
          generation={selectedGeneration}
          onClose={() => setSelectedGeneration(null)}
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
