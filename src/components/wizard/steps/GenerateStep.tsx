import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Checkbox } from '@/components/ui/checkbox'
import { WizardHook } from '@/hooks/useWizard'
import { useQuota } from '@/hooks/useQuota'
import { QuotaDisplay } from '@/components/ui/QuotaDisplay'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Sparkles, RefreshCw, Loader2, AlertCircle, Lock, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { StyleOption } from '@/types'
import { GeneratePromptPreview } from '../GeneratePromptPreview'

interface GenerateStepProps {
  wizard: WizardHook
  selectedStyle?: StyleOption | null
}

export function GenerateStep({ wizard, selectedStyle }: GenerateStepProps) {
  const { state, updateState, nextStep, prevStep, isCustomCategory, shouldAutoGenerate, clearAutoGenerate } = wizard
  const { quota, updateQuota } = useQuota()
  const [status, setStatus] = useState<'idle' | 'generating' | 'error' | 'limit_reached'>('idle')
  const [progress, setProgress] = useState(0)
  const [showPromptPreview, setShowPromptPreview] = useState(false)
  const [hasAutoStarted, setHasAutoStarted] = useState(false)

  // Check if at limit
  useEffect(() => {
    if (quota && quota.remaining === 0 && !quota.is_admin) {
      setStatus('limit_reached')
    }
  }, [quota])

  // Auto-start generation when coming from regenerate
  useEffect(() => {
    if (shouldAutoGenerate && !hasAutoStarted && status === 'idle') {
      // Check quota before auto-starting
      if (quota && quota.remaining === 0 && !quota.is_admin) {
        setStatus('limit_reached')
        clearAutoGenerate()
        return
      }
      setHasAutoStarted(true)
      clearAutoGenerate()
      generate()
    }
  }, [shouldAutoGenerate, hasAutoStarted, status, quota])

  useEffect(() => {
    if (status === 'generating') {
      const interval = setInterval(() => {
        setProgress((p) => Math.min(p + 2, 90))
      }, 500)
      return () => clearInterval(interval)
    }
  }, [status])

  const generate = async () => {
    // Double-check quota before generating
    if (quota && quota.remaining === 0 && !quota.is_admin) {
      setStatus('limit_reached')
      return
    }

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
            inputPhotoId: (state as any).inputPhotoId,
            inputPhotoPath: (state as any).inputPhotoPath,
            isPublic: state.isPublic,
            // New generation options (only for standard mode)
            keepBackground: !isCustomCategory ? state.keepBackground : undefined,
            ageModification: !isCustomCategory ? state.ageModification : undefined,
            customisationText: !isCustomCategory && state.customTextEnabled ? state.customText : undefined,
          }),
        }
      )

      const result = await response.json()

      // Handle rate limit response
      if (response.status === 429) {
        setStatus('limit_reached')
        if (result.quota) {
          updateQuota(result.quota)
        }
        return
      }

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Generation failed')
      }

      // Update quota from response
      if (result.quota) {
        updateQuota(result.quota)
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
            This usually takes about 30 seconds
          </p>
        </div>

        <div className="max-w-xs mx-auto">
          <Progress value={progress} className="h-2" />
          <p className="text-gray-500 text-sm mt-2">{progress}%</p>
        </div>
      </div>
    )
  }

  if (status === 'limit_reached') {
    return (
      <div className="space-y-6 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-red-500/20">
          <AlertCircle className="w-10 h-10 text-red-400" />
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Daily limit reached
          </h2>
          <p className="text-gray-400">
            You've used all 20 generations for today.
            <br />
            Come back tomorrow for more!
          </p>
        </div>

        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={prevStep}
            className="bg-transparent border-white/20 text-white hover:bg-white/10"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
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
            className="bg-transparent border-white/20 text-white hover:bg-white/10"
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

  // Custom category - show photo preview with custom prompt input
  if (isCustomCategory) {
    const canGenerate = state.customStyle.trim().length > 0 &&
      !(quota?.remaining === 0 && !quota?.is_admin)

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white">
            Describe your avatar
          </h2>
          <p className="text-gray-400 mt-2">
            Write a custom prompt to transform your photo
          </p>
        </div>

        {/* Quota display */}
        <div className="flex justify-center">
          <QuotaDisplay />
        </div>

        {/* Photo preview and prompt input */}
        <div className="max-w-xl mx-auto space-y-6">
          {/* Photo preview */}
          <div className="flex justify-center">
            <div className="w-48 h-48 rounded-2xl overflow-hidden ring-2 ring-purple-500/30">
              <img
                src={state.imageData!}
                alt="Your photo"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Custom prompt textarea */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-purple-400">
              <Sparkles className="h-5 w-5" />
              <span className="font-medium">Your custom prompt</span>
            </div>
            <textarea
              placeholder="Describe how you want your avatar to look... Be creative! For example: 'Transform me into a steampunk inventor with brass goggles, Victorian attire, and clockwork accessories. Sepia-toned lighting with visible gears and steam in the background.'"
              value={state.customStyle}
              onChange={(e) => updateState({ customStyle: e.target.value })}
              maxLength={500}
              rows={5}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border-2 border-white/10 text-white placeholder:text-gray-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/50 focus:outline-none resize-none"
            />
            <div className="flex justify-between text-sm">
              <p className="text-gray-500">
                Be descriptive! The more detail, the better the result.
              </p>
              <p className="text-gray-500">
                {state.customStyle.length}/500
              </p>
            </div>
          </div>

          {/* Privacy toggle */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={!state.isPublic}
                  onChange={(e) => updateState({ isPublic: !e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-5 h-5 rounded border border-white/30 bg-white/5 peer-checked:bg-purple-500 peer-checked:border-purple-500 transition-colors flex items-center justify-center">
                  {!state.isPublic && <Lock className="w-3 h-3 text-white" />}
                </div>
              </div>
              <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                Keep my avatar private
              </span>
            </label>
            <p className="text-xs text-gray-500 mt-1.5 ml-8">
              {state.isPublic
                ? "Your avatar may appear on the welcome screen"
                : "Your avatar will only be visible to you"}
            </p>
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <Button
            variant="outline"
            onClick={prevStep}
            className="bg-transparent border-white/20 text-white hover:bg-white/10"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button
            onClick={generate}
            size="lg"
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            disabled={!canGenerate}
          >
            <Sparkles className="mr-2 h-5 w-5" />
            Generate Avatar
          </Button>
        </div>
      </div>
    )
  }

  // Standard flow - show summary and generate button
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">
        Ready to generate!
      </h2>

      {/* Quota display */}
      <div className="flex justify-center">
        <QuotaDisplay />
      </div>

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
              Style: <span className="text-white capitalize">{state.style.replace('-', ' ')}</span>
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

        {/* Privacy toggle */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative">
              <input
                type="checkbox"
                checked={!state.isPublic}
                onChange={(e) => updateState({ isPublic: !e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-5 h-5 rounded border border-white/30 bg-white/5 peer-checked:bg-purple-500 peer-checked:border-purple-500 transition-colors flex items-center justify-center">
                {!state.isPublic && <Lock className="w-3 h-3 text-white" />}
              </div>
            </div>
            <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
              Keep my avatar private
            </span>
          </label>
          <p className="text-xs text-gray-500 mt-1.5 ml-8">
            {state.isPublic
              ? "Your avatar may appear on the welcome screen"
              : "Your avatar will only be visible to you"}
          </p>
        </div>
      </div>

      {/* Generation Options */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 max-w-md mx-auto space-y-4">
        {/* Background Option */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-white/80">Background</label>
          <ToggleGroup
            type="single"
            value={state.keepBackground ? 'keep' : 'remove'}
            onValueChange={(v) => v && updateState({ keepBackground: v === 'keep' })}
            className="justify-start"
          >
            <ToggleGroupItem
              value="remove"
              className="text-xs px-3 py-1.5 data-[state=on]:bg-purple-500/30 data-[state=on]:text-purple-200 border border-white/10 data-[state=on]:border-purple-400/50"
            >
              Replace
            </ToggleGroupItem>
            <ToggleGroupItem
              value="keep"
              className="text-xs px-3 py-1.5 data-[state=on]:bg-purple-500/30 data-[state=on]:text-purple-200 border border-white/10 data-[state=on]:border-purple-400/50"
            >
              Keep & Style
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* Age Option */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-white/80">Age</label>
          <ToggleGroup
            type="single"
            value={state.ageModification}
            onValueChange={(v) => v && updateState({ ageModification: v as 'normal' | 'younger' | 'older' })}
            className="justify-start"
          >
            <ToggleGroupItem
              value="younger"
              className="text-xs px-3 py-1.5 data-[state=on]:bg-purple-500/30 data-[state=on]:text-purple-200 border border-white/10 data-[state=on]:border-purple-400/50"
            >
              Younger
            </ToggleGroupItem>
            <ToggleGroupItem
              value="normal"
              className="text-xs px-3 py-1.5 data-[state=on]:bg-purple-500/30 data-[state=on]:text-purple-200 border border-white/10 data-[state=on]:border-purple-400/50"
            >
              Normal
            </ToggleGroupItem>
            <ToggleGroupItem
              value="older"
              className="text-xs px-3 py-1.5 data-[state=on]:bg-purple-500/30 data-[state=on]:text-purple-200 border border-white/10 data-[state=on]:border-purple-400/50"
            >
              Older
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* Customisation */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="customise"
              checked={state.customTextEnabled}
              onCheckedChange={(checked) => updateState({ customTextEnabled: !!checked })}
              className="border-white/30 data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500"
            />
            <label htmlFor="customise" className="text-sm font-medium text-white/80 cursor-pointer">
              Add customisation
            </label>
          </div>
          {state.customTextEnabled && (
            <div>
              <Input
                placeholder="e.g., wearing red sunglasses"
                value={state.customText}
                onChange={(e) => updateState({ customText: e.target.value })}
                maxLength={150}
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 text-sm"
              />
              <p className="text-xs text-white/40 text-right mt-1">
                {state.customText.length}/150
              </p>
            </div>
          )}
        </div>

        {/* Preview Prompt Button */}
        {selectedStyle && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPromptPreview(true)}
            className="bg-transparent w-full border-white/20 text-white/70 hover:text-white hover:bg-white/10"
          >
            <Eye className="mr-2 h-4 w-4" />
            Preview Full Prompt
          </Button>
        )}
      </div>

      <div className="flex justify-center gap-4">
        <Button
          variant="outline"
          onClick={prevStep}
          className="bg-transparent border-white/20 text-white hover:bg-white/10"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={generate}
          size="lg"
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          disabled={quota?.remaining === 0 && !quota?.is_admin}
        >
          <Sparkles className="mr-2 h-5 w-5" />
          Generate Avatar
        </Button>
      </div>

      {/* Prompt Preview Modal */}
      {selectedStyle && (
        <GeneratePromptPreview
          isOpen={showPromptPreview}
          onClose={() => setShowPromptPreview(false)}
          state={state}
          stylePrompt={selectedStyle.prompt}
        />
      )}
    </div>
  )
}
