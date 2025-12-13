import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { WizardHook } from '@/hooks/useWizard'
import { Download, RefreshCw, Images, RotateCw, ArrowLeft, Share2, Monitor, Wand2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { downloadImage, formatFileSize, compressImage } from '@/lib/imageCompression'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Slider } from '@/components/ui/slider'

interface DownloadStepProps {
  wizard: WizardHook
}

export function DownloadStep({ wizard }: DownloadStepProps) {
  const navigate = useNavigate()
  const { state, reset, regenerate, goBackFromDownload } = wizard
  const [downloading, setDownloading] = useState(false)

  // Download options state
  const [showDownloadOptions, setShowDownloadOptions] = useState(false)
  const [downloadFormat, setDownloadFormat] = useState<'png' | 'jpeg'>('png')
  const [jpegQuality, setJpegQuality] = useState(85)
  const [estimatedSize, setEstimatedSize] = useState<string | null>(null)

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

  // Estimate size when format or quality changes
  const handleOpenDownloadOptions = () => {
    setShowDownloadOptions(true)
    // Estimate initial size
    if (state.generatedImage) {
      compressImage(state.generatedImage, {
        format: downloadFormat,
        quality: downloadFormat === 'jpeg' ? jpegQuality / 100 : undefined,
      }).then(blob => setEstimatedSize(formatFileSize(blob)))
        .catch(() => setEstimatedSize(null))
    }
  }

  // Re-estimate when format or quality changes
  const handleFormatChange = (format: 'png' | 'jpeg') => {
    setDownloadFormat(format)
    if (state.generatedImage) {
      compressImage(state.generatedImage, {
        format,
        quality: format === 'jpeg' ? jpegQuality / 100 : undefined,
      }).then(blob => setEstimatedSize(formatFileSize(blob)))
        .catch(() => setEstimatedSize(null))
    }
  }

  const handleQualityChange = (quality: number) => {
    setJpegQuality(quality)
    if (state.generatedImage && downloadFormat === 'jpeg') {
      compressImage(state.generatedImage, {
        format: 'jpeg',
        quality: quality / 100,
      }).then(blob => setEstimatedSize(formatFileSize(blob)))
        .catch(() => setEstimatedSize(null))
    }
  }

  const handleDownloadWithOptions = async () => {
    if (!state.generatedImage) return

    setDownloading(true)

    try {
      await downloadImage(state.generatedImage, generateFilename(), {
        format: downloadFormat,
        quality: downloadFormat === 'jpeg' ? jpegQuality / 100 : undefined,
      })
      toast.success('Avatar downloaded!')
      setShowDownloadOptions(false)
    } catch (error) {
      console.error('Download error:', error)
      toast.error('Failed to download. Try again.')
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
          onClick={handleOpenDownloadOptions}
          disabled={downloading}
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
        >
          <Download className="mr-2 h-4 w-4" />
          Download
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

      {/* Download options dialog */}
      <Dialog open={showDownloadOptions} onOpenChange={setShowDownloadOptions}>
        <DialogContent className="bg-gray-900 border-white/20 text-white">
          <DialogHeader>
            <DialogTitle>Download Options</DialogTitle>
            <DialogDescription className="text-gray-400">
              Choose format and compression settings
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Format selection */}
            <div className="space-y-3">
              <Label>Format</Label>
              <RadioGroup value={downloadFormat} onValueChange={(v: string) => handleFormatChange(v as 'png' | 'jpeg')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="png" id="png" />
                  <Label htmlFor="png" className="font-normal cursor-pointer">
                    PNG (Lossless, larger file)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="jpeg" id="jpeg" />
                  <Label htmlFor="jpeg" className="font-normal cursor-pointer">
                    JPEG (Compressed, smaller file)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* JPEG quality slider */}
            {downloadFormat === 'jpeg' && (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label>Quality</Label>
                  <span className="text-sm text-gray-400">{jpegQuality}%</span>
                </div>
                <Slider
                  value={[jpegQuality]}
                  onValueChange={([value]: number[]) => handleQualityChange(value)}
                  min={50}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Smaller file</span>
                  <span>Better quality</span>
                </div>
              </div>
            )}

            {/* Estimated file size */}
            {estimatedSize && (
              <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Estimated size:</span>
                  <span className="text-sm font-medium">{estimatedSize}</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowDownloadOptions(false)}
              disabled={downloading}
              className="flex-1 border-white/20 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDownloadWithOptions}
              disabled={downloading}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {downloading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
