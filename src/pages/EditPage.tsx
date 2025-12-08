import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom'
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
  Settings,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4'
type ImageSize = '1K' | '2K'

export function EditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
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
  const [showOptions, setShowOptions] = useState(false)

  // Read options from URL params with defaults
  const aspectRatio = (searchParams.get('aspectRatio') as AspectRatio) || '1:1'
  const imageSize = (searchParams.get('imageSize') as ImageSize) || '1K'

  const updateOption = (key: 'aspectRatio' | 'imageSize', value: string) => {
    const params = new URLSearchParams(searchParams)
    params.set(key, value)
    setSearchParams(params, { replace: true })
  }

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
            // Optional format settings
            aspectRatio,
            imageSize,
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
        // Clear the prompt and navigate to new generation, preserving options
        setEditPrompt('')
        const params = new URLSearchParams()
        if (aspectRatio !== '1:1') params.set('aspectRatio', aspectRatio)
        if (imageSize !== '1K') params.set('imageSize', imageSize)
        const queryString = params.toString()
        navigate(`/edit/${result.generationId}${queryString ? `?${queryString}` : ''}`)
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

              {/* Options toggle */}
              <button
                type="button"
                onClick={() => setShowOptions(!showOptions)}
                className="flex items-center gap-2 text-sm text-white/70 hover:text-white/90 transition-colors"
              >
                <Settings className="h-4 w-4" />
                Options
                {showOptions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {/* Options panel */}
              {showOptions && (
                <div className="p-4 bg-white/5 rounded-lg border border-white/10 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-white/70 mb-2">Aspect Ratio</label>
                      <select
                        value={aspectRatio}
                        onChange={(e) => updateOption('aspectRatio', e.target.value)}
                        className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-md text-white text-sm"
                        disabled={isGenerating}
                      >
                        <option value="1:1">1:1 Square</option>
                        <option value="16:9">16:9 Landscape</option>
                        <option value="9:16">9:16 Portrait</option>
                        <option value="4:3">4:3 Standard</option>
                        <option value="3:4">3:4 Portrait</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-white/70 mb-2">Resolution</label>
                      <select
                        value={imageSize}
                        onChange={(e) => updateOption('imageSize', e.target.value)}
                        className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-md text-white text-sm"
                        disabled={isGenerating}
                      >
                        <option value="1K">1K (1024px)</option>
                        <option value="2K">2K (2048px)</option>
                      </select>
                    </div>
                  </div>
                  {/* Output preview indicator */}
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-xs text-white/50">Output:</span>
                    <div
                      className="border border-white/30 bg-white/10"
                      style={{
                        width: aspectRatio === '16:9' ? 48 : aspectRatio === '9:16' ? 27 : aspectRatio === '4:3' ? 40 : aspectRatio === '3:4' ? 30 : 36,
                        height: aspectRatio === '16:9' ? 27 : aspectRatio === '9:16' ? 48 : aspectRatio === '4:3' ? 30 : aspectRatio === '3:4' ? 40 : 36,
                      }}
                    />
                    <span className="text-xs text-white/50">{imageSize === '2K' ? '2048px' : '1024px'}</span>
                  </div>
                </div>
              )}

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
