import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { WizardHook } from '@/hooks/useWizard'
import { Download, RefreshCw, Check } from 'lucide-react'
import { toast } from 'sonner'

interface DownloadStepProps {
  wizard: WizardHook
}

const sizes = [
  { label: '512 × 512', value: 512 },
  { label: '1024 × 1024', value: 1024 },
  { label: '2048 × 2048', value: 2048 },
]

export function DownloadStep({ wizard }: DownloadStepProps) {
  const { state, reset } = wizard
  const [selectedSize, setSelectedSize] = useState(1024)
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    if (!state.generatedImage) return

    setDownloading(true)

    try {
      // Create canvas to resize
      const img = new Image()
      img.crossOrigin = 'anonymous'

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error('Failed to load image'))
        img.src = state.generatedImage!
      })

      const canvas = document.createElement('canvas')
      canvas.width = selectedSize
      canvas.height = selectedSize
      const ctx = canvas.getContext('2d')

      if (!ctx) throw new Error('Could not get canvas context')

      ctx.drawImage(img, 0, 0, selectedSize, selectedSize)

      // Download
      const link = document.createElement('a')
      link.download = `avatar-${selectedSize}x${selectedSize}.png`
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

      {/* Size selection */}
      <div className="flex justify-center gap-2">
        {sizes.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setSelectedSize(value)}
            className={`
              px-4 py-2 rounded-lg border transition-all text-sm
              ${selectedSize === value
                ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500 text-white'
                : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/30'
              }
            `}
          >
            {selectedSize === value && <Check className="inline w-3 h-3 mr-1" />}
            {label}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex justify-center gap-4">
        <Button
          variant="outline"
          onClick={reset}
          className="border-white/20 text-white hover:bg-white/10"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Create Another
        </Button>
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
