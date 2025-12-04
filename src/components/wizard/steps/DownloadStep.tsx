import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { WizardHook } from '@/hooks/useWizard'
import { Download, RefreshCw, Images, RotateCw } from 'lucide-react'
import { toast } from 'sonner'

interface DownloadStepProps {
  wizard: WizardHook
}

export function DownloadStep({ wizard }: DownloadStepProps) {
  const { state, reset, regenerate } = wizard
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
      // Create canvas to resize to 1024x1024
      const img = new Image()
      img.crossOrigin = 'anonymous'

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error('Failed to load image'))
        img.src = state.generatedImage!
      })

      const canvas = document.createElement('canvas')
      canvas.width = 1024
      canvas.height = 1024
      const ctx = canvas.getContext('2d')

      if (!ctx) throw new Error('Could not get canvas context')

      ctx.drawImage(img, 0, 0, 1024, 1024)

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

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">
        Your avatar is ready!
      </h2>

      {/* Preview */}
      <div className="relative aspect-square max-w-sm mx-auto rounded-2xl overflow-hidden border-2 border-purple-500/50 shadow-lg shadow-purple-500/20">
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
          onClick={reset}
          className="border-white/20 text-white hover:bg-white/10"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Create Another
        </Button>
        <Button
          variant="outline"
          onClick={regenerate}
          className="border-white/20 text-white hover:bg-white/10"
          title="Generate another avatar with the same style and settings"
        >
          <RotateCw className="mr-2 h-4 w-4" />
          Generate Again
        </Button>
        <Link to="/gallery">
          <Button
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10"
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
      </div>
    </div>
  )
}
