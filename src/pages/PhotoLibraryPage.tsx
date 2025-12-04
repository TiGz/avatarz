import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { usePhotos } from '@/hooks/usePhotos'
import { PhotoGrid } from '@/components/photos/PhotoGrid'
import { Sparkles, ArrowLeft, Upload, RefreshCw } from 'lucide-react'
import { useRef } from 'react'
import { toast } from 'sonner'

export function PhotoLibraryPage() {
  const navigate = useNavigate()
  useAuth() // Ensure user is authenticated
  const { photos, loading, uploadPhoto, deletePhoto, refresh } = usePhotos()
  const fileInputRef = useRef<HTMLInputElement>(null)

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

    toast.loading('Uploading photo...')
    const photo = await uploadPhoto(file, file.name)
    toast.dismiss()

    if (photo) {
      toast.success('Photo uploaded!')
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

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
          <span className="font-bold text-white">My Photos</span>
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
      <main className="max-w-4xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Back and Upload buttons */}
          <div className="flex justify-between items-center mb-6">
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            <Button
              onClick={() => fileInputRef.current?.click()}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload Photo
            </Button>
          </div>

          {/* Photo count */}
          {!loading && photos.length > 0 && (
            <p className="text-gray-400 mb-4">
              {photos.length} photo{photos.length !== 1 ? 's' : ''} in your library
            </p>
          )}

          {/* Photo Grid */}
          <PhotoGrid
            photos={photos}
            loading={loading}
            onDelete={deletePhoto}
          />

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </motion.div>
      </main>
    </div>
  )
}
