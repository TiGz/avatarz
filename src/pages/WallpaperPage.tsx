import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Header } from '@/components/ui/Header'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useQuota } from '@/hooks/useQuota'
import { Generation } from '@/types'
import { toast } from 'sonner'
import {
  Loader2,
  Monitor,
  Smartphone,
  Download,
  Sparkles,
  AlertCircle,
  ArrowLeft,
  Check,
  RectangleHorizontal
} from 'lucide-react'
import { BANNER_FORMATS, getBannerPrompt, type BannerFormat } from '@/lib/bannerFormats'

// Wallpaper aspect ratio options
const WALLPAPER_RATIOS = [
  { id: '16:9', label: 'Landscape 16:9', icon: Monitor, description: 'Desktop, TV, laptop' },
  { id: '9:16', label: 'Portrait 9:16', icon: Smartphone, description: 'Phone wallpaper' },
  { id: '4:3', label: 'Standard 4:3', icon: Monitor, description: 'Tablet, older monitors' },
  { id: '3:4', label: 'Portrait 3:4', icon: Smartphone, description: 'Tablet portrait' },
]

// Social media banner options derived from shared config
const SOCIAL_BANNERS = (Object.entries(BANNER_FORMATS) as [BannerFormat, typeof BANNER_FORMATS[BannerFormat]][]).map(
  ([id, config]) => ({
    id,
    label: config.label,
    icon: RectangleHorizontal,
    description: 'Social banner',
    width: config.width,
    height: config.height,
    safeZonePercent: config.safeZone,
  })
)


// Combined for lookup
const ALL_OPTIONS = [...WALLPAPER_RATIOS, ...SOCIAL_BANNERS]

const WALLPAPER_PROMPT = `Extend this avatar image to fill the frame, creating a beautiful and complementary background that matches the art style. Keep the avatar as the main focus in the center.`

export function WallpaperPage() {
  const { generationId } = useParams<{ generationId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { quota, loading: quotaLoading } = useQuota()

  // Source generation state
  const [sourceGen, setSourceGen] = useState<Generation | null>(null)
  const [sourceLoading, setSourceLoading] = useState(true)
  const [sourceImageUrl, setSourceImageUrl] = useState<string | null>(null)

  // Form state
  const [selectedRatio, setSelectedRatio] = useState<string>('16:9')
  const [prompt, setPrompt] = useState(WALLPAPER_PROMPT)
  const [hasEditedPrompt, setHasEditedPrompt] = useState(false)

  // Generation state
  const [generating, setGenerating] = useState(false)
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)

  // Screen resolution detection
  const screenResolution = useMemo(() => {
    const width = window.screen.width * (window.devicePixelRatio || 1)
    const height = window.screen.height * (window.devicePixelRatio || 1)
    return { width: Math.round(width), height: Math.round(height) }
  }, [])

  // Detect best aspect ratio based on screen
  useEffect(() => {
    const { width, height } = screenResolution
    const ratio = width / height

    if (ratio > 1.5) {
      setSelectedRatio('16:9') // Wide screen
    } else if (ratio < 0.75) {
      setSelectedRatio('9:16') // Tall phone
    } else if (ratio > 1) {
      setSelectedRatio('4:3') // Standard landscape
    } else {
      setSelectedRatio('3:4') // Standard portrait
    }
  }, [screenResolution])

  // Update prompt when switching between wallpaper and banner (if not manually edited)
  useEffect(() => {
    if (hasEditedPrompt) return

    const banner = SOCIAL_BANNERS.find(b => b.id === selectedRatio)
    if (banner) {
      setPrompt(getBannerPrompt(banner.safeZonePercent))
    } else {
      setPrompt(WALLPAPER_PROMPT)
    }
  }, [selectedRatio, hasEditedPrompt])

  // Fetch source generation
  useEffect(() => {
    async function fetchSource() {
      if (!generationId || !user) return

      try {
        const { data, error } = await supabase
          .from('generations')
          .select('*')
          .eq('id', generationId)
          .eq('user_id', user.id)
          .single()

        if (error) throw error
        setSourceGen(data)

        // Get signed URL for the image
        const { data: urlData } = await supabase.storage
          .from('avatars')
          .createSignedUrl(data.output_storage_path, 3600)

        if (urlData?.signedUrl) {
          setSourceImageUrl(urlData.signedUrl)
        }
      } catch (error) {
        console.error('Error fetching source:', error)
        toast.error('Failed to load source avatar')
        navigate('/gallery')
      } finally {
        setSourceLoading(false)
      }
    }

    fetchSource()
  }, [generationId, user, navigate])

  // Generate wallpaper
  const handleGenerate = async () => {
    if (!sourceGen || !user) return

    // Check quota
    if (quota && quota.remaining <= 0 && !quota.is_admin) {
      toast.error('Daily generation limit reached')
      return
    }

    setGenerating(true)
    setGeneratedImage(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      // For social banners, use fixed dimensions; for wallpapers, use screen resolution
      const selectedOption = ALL_OPTIONS.find(r => r.id === selectedRatio)
      const targetWidth = (selectedOption as any)?.width || screenResolution.width
      const targetHeight = (selectedOption as any)?.height || screenResolution.height

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extend-image`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            generationId: sourceGen.id,
            aspectRatio: selectedRatio,
            prompt: prompt.trim(),
            targetWidth,
            targetHeight,
          }),
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate wallpaper')
      }

      setGeneratedImage(result.image)
      toast.success('Wallpaper generated!')
    } catch (error) {
      console.error('Generation error:', error)
      toast.error(error instanceof Error ? error.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  // Download wallpaper
  const handleDownload = () => {
    if (!generatedImage) return

    const isSocialBanner = SOCIAL_BANNERS.some(b => b.id === selectedRatio)
    const filename = isSocialBanner
      ? `${selectedRatio}_banner_${Date.now()}.png`
      : `wallpaper_${selectedRatio.replace(':', 'x')}_${Date.now()}.png`

    const a = document.createElement('a')
    a.href = generatedImage
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    toast.success('Download started!')
  }

  // Compute output dimensions for display (must be before early returns)
  const outputDimensions = useMemo(() => {
    const selectedOption = ALL_OPTIONS.find(r => r.id === selectedRatio)
    const isSocialBanner = SOCIAL_BANNERS.some(b => b.id === selectedRatio)
    const width = (selectedOption as any)?.width || screenResolution.width
    const height = (selectedOption as any)?.height || screenResolution.height
    return { width, height, isSocialBanner }
  }, [selectedRatio, screenResolution])

  // Loading state
  if (sourceLoading || quotaLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black">
        <Header showBack />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      </div>
    )
  }

  // Not found state
  if (!sourceGen) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black">
        <Header showBack />
        <div className="flex flex-col items-center justify-center h-[60vh] text-white">
          <AlertCircle className="h-12 w-12 mb-4 text-red-400" />
          <p className="text-lg">Avatar not found</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate('/gallery')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Gallery
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black">
      <Header showBack />

      <main className="px-4 py-6 max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-2">Create Wallpaper</h1>
        <p className="text-gray-400 mb-6">
          Extend your avatar to fit your screen as a wallpaper
        </p>

        {/* Top row: Avatar + Format selectors side by side on wide screens */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_1fr] gap-4 mb-4">
          {/* Source Avatar - compact on wide screens */}
          <div className="bg-white/5 rounded-xl p-4">
            <Label className="text-white mb-2 block text-sm">Source Avatar</Label>
            <div className="aspect-square rounded-lg overflow-hidden bg-black/50 max-w-[240px] mx-auto lg:max-w-none">
              {sourceImageUrl ? (
                <img
                  src={sourceImageUrl}
                  alt="Source avatar"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center lg:text-left">
              {sourceGen.style.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </p>
          </div>

          {/* Wallpaper formats */}
          <div className="bg-white/5 rounded-xl p-4">
            <Label className="text-white mb-3 block text-sm">Wallpapers</Label>
            <div className="grid grid-cols-2 gap-2">
              {WALLPAPER_RATIOS.map((ratio) => {
                const Icon = ratio.icon
                const isSelected = selectedRatio === ratio.id
                return (
                  <button
                    key={ratio.id}
                    onClick={() => setSelectedRatio(ratio.id)}
                    className={`p-2.5 rounded-lg border-2 transition-all text-left ${
                      isSelected
                        ? 'border-purple-500 bg-purple-500/20'
                        : 'border-white/10 bg-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 flex-shrink-0 ${isSelected ? 'text-purple-400' : 'text-gray-400'}`} />
                      <span className={`font-medium text-sm ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                        {ratio.label}
                      </span>
                      {isSelected && <Check className="h-3.5 w-3.5 text-purple-400 ml-auto flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 ml-6">{ratio.description}</p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Social Banners */}
          <div className="bg-white/5 rounded-xl p-4">
            <Label className="text-white mb-3 block text-sm">Social Banners</Label>
            <div className="grid grid-cols-2 gap-2">
              {SOCIAL_BANNERS.map((banner) => {
                const Icon = banner.icon
                const isSelected = selectedRatio === banner.id
                return (
                  <button
                    key={banner.id}
                    onClick={() => setSelectedRatio(banner.id)}
                    className={`p-2.5 rounded-lg border-2 transition-all text-left ${
                      isSelected
                        ? 'border-purple-500 bg-purple-500/20'
                        : 'border-white/10 bg-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 flex-shrink-0 ${isSelected ? 'text-purple-400' : 'text-gray-400'}`} />
                      <span className={`font-medium text-sm ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                        {banner.label}
                      </span>
                      {isSelected && <Check className="h-3.5 w-3.5 text-purple-400 ml-auto flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 ml-6">{banner.description}</p>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Prompt - full width */}
        <div className="bg-white/5 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-white text-sm">Extension Prompt</Label>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>
                {outputDimensions.isSocialBanner ? <RectangleHorizontal className="h-3.5 w-3.5 inline mr-1" /> : <Monitor className="h-3.5 w-3.5 inline mr-1" />}
                {outputDimensions.isSocialBanner ? '16:9 banner' : `${outputDimensions.width} x ${outputDimensions.height} (your screen)`}
              </span>
              <span>{prompt.length}/3000</span>
            </div>
          </div>
          <Textarea
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value)
              setHasEditedPrompt(true)
            }}
            placeholder="Describe how to extend the image..."
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 min-h-[140px] lg:min-h-[180px] resize-y"
            maxLength={3000}
          />
          {hasEditedPrompt && (
            <div className="mt-2 text-right">
              <button
                onClick={() => {
                  setHasEditedPrompt(false)
                  const banner = SOCIAL_BANNERS.find(b => b.id === selectedRatio)
                  if (banner) {
                    setPrompt(getBannerPrompt(banner.safeZonePercent))
                  } else {
                    setPrompt(WALLPAPER_PROMPT)
                  }
                }}
                className="text-xs text-purple-400 hover:text-purple-300"
              >
                Reset to default
              </button>
            </div>
          )}
        </div>

        {/* Quota + Generate button row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-6">
          {quota && !quota.is_admin && (
            <div className={`rounded-lg px-4 py-3 flex-1 ${
              quota.remaining <= 3 ? 'bg-amber-500/20 border border-amber-500/50' : 'bg-white/5'
            }`}>
              <p className={`text-sm ${quota.remaining <= 3 ? 'text-amber-300' : 'text-gray-400'}`}>
                {quota.remaining <= 0
                  ? 'No generations remaining today'
                  : `This will use 1 of your ${quota.remaining} remaining generations today`
                }
              </p>
            </div>
          )}
          <Button
            onClick={handleGenerate}
            disabled={generating || !!(quota && quota.remaining <= 0 && !quota.is_admin)}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 h-12 px-8 text-lg sm:w-auto"
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-5 w-5" />
                Generate Wallpaper
              </>
            )}
          </Button>
        </div>

        {/* Generated result */}
        {generatedImage && (
          <div className="mt-8 bg-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Generated Wallpaper</h2>
              <Button
                onClick={handleDownload}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
              >
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </div>
            <div className="rounded-lg overflow-hidden bg-black/50">
              <img
                src={generatedImage}
                alt="Generated wallpaper"
                className="w-full h-auto"
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Aspect ratio: {selectedRatio} - This wallpaper has been saved to your gallery
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
