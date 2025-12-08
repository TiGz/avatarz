import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { WizardHook } from '@/hooks/useWizard'
import { Download, RefreshCw, Images, RotateCw, ArrowLeft, Share2, Monitor, Wand2 } from 'lucide-react'
import { toast } from 'sonner'

interface DownloadStepProps {
  wizard: WizardHook
}

export function DownloadStep({ wizard }: DownloadStepProps) {
  const navigate = useNavigate()
  const { state, reset, regenerate, goBackFromDownload } = wizard
  const [downloading, setDownloading] = useState(false)

  const generateFilename = () => {
    const parts: string[] = []

    // Add name if present
    if (state.name) {
      parts.push(state.name.toLowerCase().replace(/\s+/g, '-'))
    }

    // Add style
    const styleName = state.style === 'custom' && state.customStyle
      ? state.customStyle.toLowerCase().replace(/\s+/g, '-').substring(0, 20)
      : state.style
    parts.push(styleName)

    // Add "avatar" suffix
    parts.push('avatar')

    return `${parts.join('-')}.png`
  }

  const handleDownload = async () => {
    if (!state.generatedImage) return

    setDownloading(true)

    try {
      // Create canvas - preserve aspect ratio from generation
      const img = new Image()
      img.crossOrigin = 'anonymous'

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error('Failed to load image'))
        img.src = state.generatedImage!
      })

      // Use native image dimensions (preserves aspect ratio from Gemini)
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')

      if (!ctx) throw new Error('Could not get canvas context')

      ctx.drawImage(img, 0, 0)

      // Download
      const link = document.createElement('a')
      link.download = generateFilename()
      link.href = canvas.toDataURL('image/png')
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success('Avatar downloaded!')
    } catch (error) {
      console.error('Download error:', error)
      toast.error('Failed to download. Try right-clicking the image.')
    } finally {
      setDownloading(false)
    }
  }

  const handleShare = async () => {
    if (!state.generatedImage) return

    try {
      // Fetch the image and convert to File for native sharing
      const response = await fetch(state.generatedImage)
      const blob = await response.blob()
      const file = new File([blob], generateFilename(), { type: 'image/png' })

      // Check if browser supports file sharing
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'My Avatar',
          text: 'Check out my AI-generated avatar!',
        })
      } else if (state.shareUrl) {
        // Fallback to URL sharing
        if (navigator.share) {
          await navigator.share({ url: state.shareUrl })
        } else {
          await navigator.clipboard.writeText(state.shareUrl)
          toast.success('Link copied!')
        }
      }
    } catch (error) {
      // User cancelled share - ignore AbortError
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Share error:', error)
        toast.error('Failed to share')
      }
    }
  }

  const handleCreateWallpaper = () => {
    if (!state.generationId) {
      toast.error('Unable to create wallpaper')
      return
    }
    navigate(`/wallpaper/${state.generationId}`)
  }

  const handleEditWithAI = () => {
    if (!state.generationId) {
      toast.error('Unable to edit avatar')
      return
    }
    navigate(`/edit/${state.generationId}`)
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">
        Your avatar is ready!
      </h2>

      {/* Preview */}
      <div
        className="relative max-w-sm mx-auto rounded-2xl overflow-hidden border-2 border-purple-500/50 shadow-lg shadow-purple-500/20"
        style={{
          aspectRatio: state.aspectRatio === '1:1' ? '1/1'
            : state.aspectRatio === '16:9' ? '16/9'
            : state.aspectRatio === '9:16' ? '9/16'
            : state.aspectRatio === '4:3' ? '4/3'
            : state.aspectRatio === '3:4' ? '3/4'
            : '1/1'
        }}
      >
        <img
          src={state.generatedImage!}
          alt="Generated avatar"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap justify-center gap-4">
        <Button
          variant="outline"
          onClick={goBackFromDownload}
          className="bg-transparent border-white/20 text-white hover:bg-white/10"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          variant="outline"
          onClick={reset}
          className="bg-transparent border-white/20 text-white hover:bg-white/10"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Create Another
        </Button>
        <Button
          variant="outline"
          onClick={regenerate}
          className="bg-transparent border-white/20 text-white hover:bg-white/10"
          title="Generate another avatar with the same style and settings"
        >
          <RotateCw className="mr-2 h-4 w-4" />
          Generate Again
        </Button>
        <Link to="/gallery">
          <Button
            variant="outline"
            className="bg-transparent border-white/20 text-white hover:bg-white/10"
          >
            <Images className="mr-2 h-4 w-4" />
            View Gallery
          </Button>
        </Link>
        <Button
          onClick={handleDownload}
          disabled={downloading}
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
        >
          {downloading ? (
            <>Processing...</>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Download PNG
            </>
          )}
        </Button>
        <Button
          variant="outline"
          onClick={handleShare}
          className="bg-transparent border-white/20 text-white hover:bg-white/10"
        >
          <Share2 className="mr-2 h-4 w-4" />
          Share
        </Button>
        {state.generationId && (
          <Button
            variant="outline"
            onClick={handleCreateWallpaper}
            className="bg-transparent border-white/20 text-white hover:bg-white/10"
          >
            <Monitor className="mr-2 h-4 w-4" />
            Wallpaper
          </Button>
        )}
        {state.generationId && (
          <Button
            variant="outline"
            onClick={handleEditWithAI}
            className="bg-transparent border-white/20 text-white hover:bg-white/10"
          >
            <Wand2 className="mr-2 h-4 w-4" />
            Edit
          </Button>
        )}
      </div>
    </div>
  )
}
