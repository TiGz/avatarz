import { useState, useRef, useCallback } from 'react'
import Webcam from 'react-webcam'
import { Button } from '@/components/ui/button'
import { WizardHook } from '@/hooks/useWizard'
import { Camera, Upload, RefreshCw, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'

interface CaptureStepProps {
  wizard: WizardHook
}

export function CaptureStep({ wizard }: CaptureStepProps) {
  const [mode, setMode] = useState<'select' | 'webcam' | 'upload'>('select')
  const [cameraError, setCameraError] = useState(false)
  const webcamRef = useRef<Webcam>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot()
    if (imageSrc) {
      wizard.updateState({ imageData: imageSrc })
    }
  }, [wizard])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 10MB.')
      return
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file.')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      wizard.updateState({ imageData: reader.result as string })
    }
    reader.readAsDataURL(file)
  }

  const reset = () => {
    wizard.updateState({ imageData: null })
    setMode('select')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Show preview if image is captured
  if (wizard.state.imageData) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white text-center">
          Looking good!
        </h2>

        <div className="relative aspect-square max-w-sm mx-auto rounded-2xl overflow-hidden border-2 border-purple-500/50">
          <img
            src={wizard.state.imageData}
            alt="Preview"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex justify-center gap-4">
          <Button
            variant="outline"
            onClick={reset}
            className="border-white/20 text-white hover:bg-white/10"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Retake
          </Button>
          <Button
            onClick={() => wizard.nextStep()}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            Continue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  // Webcam mode
  if (mode === 'webcam') {
    if (cameraError) {
      return (
        <div className="space-y-6 text-center">
          <h2 className="text-2xl font-bold text-white">
            Camera unavailable
          </h2>
          <p className="text-gray-400">
            Please check your camera permissions or try uploading an image instead.
          </p>
          <Button
            onClick={() => setMode('select')}
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10"
          >
            Go Back
          </Button>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white text-center">
          Take a selfie
        </h2>

        <div className="relative aspect-square max-w-sm mx-auto rounded-2xl overflow-hidden bg-black">
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            screenshotQuality={0.9}
            videoConstraints={{
              facingMode: 'user',
              aspectRatio: 1,
            }}
            onUserMediaError={() => setCameraError(true)}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex justify-center gap-4">
          <Button
            variant="outline"
            onClick={() => setMode('select')}
            className="border-white/20 text-white hover:bg-white/10"
          >
            Cancel
          </Button>
          <Button
            onClick={capture}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            <Camera className="mr-2 h-4 w-4" />
            Capture
          </Button>
        </div>
      </div>
    )
  }

  // Selection mode
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">
        Add your photo
      </h2>
      <p className="text-gray-400 text-center">
        Take a selfie or upload an image
      </p>

      <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
        <button
          onClick={() => setMode('webcam')}
          className="aspect-square rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/50 hover:bg-white/10 transition-all flex flex-col items-center justify-center gap-3 p-6"
        >
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Camera className="w-8 h-8 text-white" />
          </div>
          <span className="text-white font-medium">Take Selfie</span>
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="aspect-square rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/50 hover:bg-white/10 transition-all flex flex-col items-center justify-center gap-3 p-6"
        >
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <Upload className="w-8 h-8 text-white" />
          </div>
          <span className="text-white font-medium">Upload Image</span>
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  )
}
