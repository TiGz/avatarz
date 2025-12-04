import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { useGenerations } from '@/hooks/useGenerations'
import { AvatarCard } from '@/components/gallery/AvatarCard'
import { AvatarModal } from '@/components/gallery/AvatarModal'
import { Generation } from '@/types'
import { Sparkles, ArrowLeft, RefreshCw, Loader2 } from 'lucide-react'

export function GalleryPage() {
  const navigate = useNavigate()
  const { generations, loading, downloadAvatar, refresh } = useGenerations()
  const [selectedGeneration, setSelectedGeneration] = useState<Generation | null>(null)

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black">
      {/* Header */}
      <header className="p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Link to="/">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
          </Link>
          <span className="font-bold text-white">My Gallery</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={refresh}
            className="text-white hover:bg-white/10"
          >
            <RefreshCw className="h-5 w-5" />
          </Button>
        </div>
      </header>

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
        />
      )}
    </div>
  )
}
