import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { WizardHook } from '@/hooks/useWizard'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Sparkles, RefreshCw, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface GenerateStepProps {
  wizard: WizardHook
}

export function GenerateStep({ wizard }: GenerateStepProps) {
  const { state, updateState, nextStep, prevStep } = wizard
  const [status, setStatus] = useState<'idle' | 'generating' | 'error'>('idle')
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (status === 'generating') {
      const interval = setInterval(() => {
        setProgress((p) => Math.min(p + 2, 90))
      }, 500)
      return () => clearInterval(interval)
    }
  }, [status])

  const generate = async () => {
    setStatus('generating')
    setProgress(0)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('Please sign in again')
        setStatus('error')
        return
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-avatar`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            imageData: state.imageData,
            style: state.style,
            customStyle: state.customStyle,
            cropType: state.cropType,
            name: state.showName ? state.name : undefined,
            namePlacement: state.showName ? state.namePlacement : undefined,
            customPlacement: state.showName && state.namePlacement === 'custom'
              ? state.customPlacement
              : undefined,
          }),
        }
      )

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Generation failed')
      }

      setProgress(100)
      updateState({ generatedImage: result.image })
      nextStep()
    } catch (error) {
      console.error('Generation error:', error)
      toast.error(error instanceof Error ? error.message : 'Generation failed')
      setStatus('error')
    }
  }

  if (status === 'generating') {
    return (
      <div className="space-y-8 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500">
          <Loader2 className="w-10 h-10 text-white animate-spin" />
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Creating your avatar
          </h2>
          <p className="text-gray-400">
            This might take a moment...
          </p>
        </div>

        <div className="max-w-xs mx-auto">
          <Progress value={progress} className="h-2" />
          <p className="text-gray-500 text-sm mt-2">{progress}%</p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="space-y-6 text-center">
        <div className="text-6xl">😔</div>

        <div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Something went wrong
          </h2>
          <p className="text-gray-400">
            Don't worry, let's try again
          </p>
        </div>

        <div className="flex justify-center gap-4">
          <Button
            variant="outline"
            onClick={prevStep}
            className="border-white/20 text-white hover:bg-white/10"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
          <Button
            onClick={() => {
              setStatus('idle')
              generate()
            }}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  // Idle - show summary and generate button
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">
        Ready to generate!
      </h2>

      {/* Summary */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 max-w-md mx-auto">
        <div className="flex gap-4">
          <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
            <img
              src={state.imageData!}
              alt="Your photo"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="space-y-1 text-sm">
            <div className="text-gray-400">
              Style: <span className="text-white capitalize">{state.style === 'custom' ? state.customStyle : state.style.replace('-', ' ')}</span>
            </div>
            <div className="text-gray-400">
              Crop: <span className="text-white capitalize">{state.cropType === 'half' ? 'Half body' : state.cropType}</span>
            </div>
            {state.showName && (
              <div className="text-gray-400">
                Name: <span className="text-white">{state.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-4">
        <Button
          variant="outline"
          onClick={prevStep}
          className="border-white/20 text-white hover:bg-white/10"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={generate}
          size="lg"
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
        >
          <Sparkles className="mr-2 h-5 w-5" />
          Generate Avatar
        </Button>
      </div>
    </div>
  )
}
