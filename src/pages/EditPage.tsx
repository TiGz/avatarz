import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Header } from '@/components/ui/Header'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useQuota } from '@/hooks/useQuota'
import { Generation } from '@/types'
import { toast } from 'sonner'
import {
  Loader2,
  Wand2,
  ArrowLeft,
  Download,
  Images,
  History,
} from 'lucide-react'

export function EditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { quota, loading: quotaLoading, refresh: refreshQuota } = useQuota()

  // Generation state
  const [generation, setGeneration] = useState<Generation | null>(null)
  const [loading, setLoading] = useState(true)
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  // Edit form state
  const [editPrompt, setEditPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch generation on mount
  useEffect(() => {
    async function fetchGeneration() {
      if (!id || !user) return

      try {
        const { data, error: fetchError } = await supabase
          .from('generations')
          .select('*')
          .eq('id', id)
          .eq('user_id', user.id)
          .single()

        if (fetchError) throw fetchError
        setGeneration(data)

        // Get signed URL for the image
        const { data: urlData } = await supabase.storage
          .from('avatars')
          .createSignedUrl(data.output_storage_path, 3600)

        if (urlData?.signedUrl) {
          setImageUrl(urlData.signedUrl)
        }
      } catch (err) {
        console.error('Error fetching generation:', err)
        toast.error('Failed to load avatar')
        navigate('/gallery')
      } finally {
        setLoading(false)
      }
    }

    fetchGeneration()
  }, [id, user, navigate])

  const handleEdit = async () => {
    if (!editPrompt.trim() || !generation || !user) return

    // Check quota
    if (quota && quota.remaining <= 0 && !quota.is_admin) {
      toast.error('Daily generation limit reached')
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData?.session?.access_token

      if (!accessToken) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-avatar`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            editGenerationId: generation.id,
            editPrompt: editPrompt.trim(),
            // Keep same settings as parent
            style: generation.style,
            cropType: generation.crop_type,
          }),
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate edit')
      }

      // Refresh quota
      refreshQuota()

      // Navigate to the new generation's edit page
      if (result.generationId) {
        toast.success('Edit generated!')
        // Clear the prompt and navigate to new generation
        setEditPrompt('')
        navigate(`/edit/${result.generationId}`)
      }
    } catch (err) {
      console.error('Edit error:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate edit')
      toast.error('Failed to generate edit')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownload = async () => {
    if (!imageUrl || !generation) return

    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `avatar_${generation.style}_edited.png`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(blobUrl)
      document.body.removeChild(a)
      toast.success('Download started!')
    } catch (err) {
      console.error('Download error:', err)
      toast.error('Failed to download')
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black">
        <Header />
        <main className="container mx-auto px-4 py-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </main>
      </div>
    )
  }

  // No generation found
  if (!generation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black">
        <Header />
        <main className="container mx-auto px-4 py-8 text-center">
          <p className="text-white mb-4">Avatar not found</p>
          <Button onClick={() => navigate('/gallery')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Gallery
          </Button>
        </main>
      </div>
    )
  }

  // Check if avatar can be edited (has thought signatures)
  const canEdit = !!generation.thought_signatures

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold text-white">Edit Avatar</h1>
          </div>

          {/* Current Image */}
          <div className="relative max-w-md mx-auto rounded-2xl overflow-hidden border-2 border-purple-500/50 shadow-lg shadow-purple-500/20">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Avatar to edit"
                className="w-full h-auto"
              />
            ) : (
              <div className="aspect-square flex items-center justify-center bg-black/20">
                <Loader2 className="h-8 w-8 animate-spin text-white/50" />
              </div>
            )}
          </div>

          {/* Edit Controls */}
          {canEdit ? (
            <div className="space-y-4">
              <div>
                <Textarea
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  placeholder="Describe how to change this avatar... (e.g., 'make the background blue', 'add sunglasses', 'make it look more realistic')"
                  className="min-h-[100px] bg-black/20 border-white/20 text-white placeholder:text-white/50"
                  disabled={isGenerating}
                />
              </div>

              {/* Quota display */}
              {!quotaLoading && quota && (
                <p className="text-sm text-white/60 text-center">
                  {quota.is_admin ? (
                    'Unlimited generations (admin)'
                  ) : (
                    `${quota.remaining} of ${quota.limit} generations remaining today`
                  )}
                </p>
              )}

              {/* Error display */}
              {error && (
                <p className="text-sm text-red-400 text-center">{error}</p>
              )}

              {/* Generate button */}
              <Button
                onClick={handleEdit}
                disabled={isGenerating || !editPrompt.trim() || !!(quota && quota.remaining <= 0 && !quota.is_admin)}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Generate Edit
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="text-center p-6 bg-white/5 rounded-lg border border-white/10">
              <p className="text-white/80">
                This avatar was created before edit support was added and cannot be edited.
              </p>
              <p className="text-sm text-white/50 mt-2">
                Generate a new avatar to use the edit feature.
              </p>
            </div>
          )}

          {/* Link to parent generation if this is an edit */}
          {generation.parent_generation_id && (
            <div className="text-center">
              <Link
                to={`/edit/${generation.parent_generation_id}`}
                className="inline-flex items-center text-sm text-purple-300 hover:text-purple-200"
              >
                <History className="mr-2 h-4 w-4" />
                View original avatar
              </Link>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap justify-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate('/gallery')}
              className="bg-transparent border-white/20 text-white hover:bg-white/10"
            >
              <Images className="mr-2 h-4 w-4" />
              Back to Gallery
            </Button>
            <Button
              variant="outline"
              onClick={handleDownload}
              className="bg-transparent border-white/20 text-white hover:bg-white/10"
            >
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
