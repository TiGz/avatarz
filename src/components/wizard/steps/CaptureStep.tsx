import { useState, useRef, useCallback } from 'react'
import Webcam from 'react-webcam'
import { Button } from '@/components/ui/button'
import { WizardHook } from '@/hooks/useWizard'
import { usePhotos } from '@/hooks/usePhotos'
import { PhotoGrid } from '@/components/photos/PhotoGrid'
import { Photo } from '@/types'
import { Camera, Upload, RefreshCw, ArrowRight, FolderOpen, ArrowLeft, Save, X, Plus } from 'lucide-react'
import { toast } from 'sonner'

interface CaptureStepProps {
  wizard: WizardHook
  minPhotos?: number  // From selected style (default 1)
  maxPhotos?: number  // From selected style (default 1)
  isCustomCategory?: boolean  // Custom category allows 0-6 photos
}

export function CaptureStep({ wizard, minPhotos = 1, maxPhotos = 1, isCustomCategory = false }: CaptureStepProps) {
  // Custom category allows 0-6 photos
  const effectiveMinPhotos = isCustomCategory ? 0 : minPhotos
  const effectiveMaxPhotos = isCustomCategory ? 6 : maxPhotos
  const isMultiPhoto = effectiveMaxPhotos > 1
  const [mode, setMode] = useState<'select' | 'webcam' | 'upload' | 'library'>('select')
  const [cameraError, setCameraError] = useState(false)
  const [saveToLibrary, setSaveToLibrary] = useState(true)
  const [previewData, setPreviewData] = useState<string | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)
  const webcamRef = useRef<Webcam>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { photos, loading: photosLoading, uploadFromDataUrl, uploadPhoto } = usePhotos()

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot()
    if (imageSrc) {
      setPreviewData(imageSrc)
      setPendingFile(null)
    }
  }, [])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 10MB.')
      return
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file.')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setPreviewData(reader.result as string)
      setPendingFile(file)
    }
    reader.readAsDataURL(file)
  }

  const handleSelectFromLibrary = (photo: Photo) => {
    if (!photo.url) return

    if (isMultiPhoto) {
      // Multi-photo mode: toggle selection
      const isSelected = wizard.state.selectedPhotoIds.includes(photo.id)
      if (!isSelected && wizard.state.selectedPhotoIds.length >= effectiveMaxPhotos) {
        toast.error(`Maximum ${effectiveMaxPhotos} photos allowed`)
        return
      }
      wizard.togglePhotoSelection(photo.id, photo.url, photo.thumbnailUrl)
    } else {
      // Single photo mode: select directly
      wizard.updateState({
        imageData: photo.url,
        inputPhotoId: photo.id,
        inputPhotoPath: photo.storage_path,
      } as any)
    }
  }

  // Check if enough photos are selected for multi-photo styles
  const hasEnoughPhotos = isMultiPhoto
    ? wizard.state.selectedPhotoIds.length >= effectiveMinPhotos
    : !!wizard.state.imageData

  // For multi-photo, we need to proceed with selected photo IDs
  const handleMultiPhotoContinue = () => {
    if (wizard.state.selectedPhotoIds.length >= effectiveMinPhotos) {
      wizard.nextStep()
    }
  }

  const handleRetake = () => {
    setPreviewData(null)
    setPendingFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleConfirm = async () => {
    if (!previewData) return

    setIsConfirming(true)

    if (isMultiPhoto) {
      // Multi-photo mode: save to library (required) and add to selection
      toast.loading('Saving photo...')
      let photo = null

      if (pendingFile) {
        photo = await uploadPhoto(pendingFile, pendingFile.name)
      } else {
        photo = await uploadFromDataUrl(previewData, `selfie_${Date.now()}.jpg`)
      }

      toast.dismiss()
      if (photo && photo.url) {
        wizard.addSelectedPhoto({ id: photo.id, url: photo.url, thumbnailUrl: photo.thumbnailUrl })
        toast.success('Photo added!')
      } else {
        toast.error('Failed to save photo')
      }

      // Clear preview and go back to select mode
      setPreviewData(null)
      setPendingFile(null)
      setMode('select')
      setIsConfirming(false)
    } else {
      // Single photo mode: original behavior
      wizard.updateState({ imageData: previewData })

      // Optionally save to library
      if (saveToLibrary) {
        toast.loading('Saving to library...')
        let photo = null

        if (pendingFile) {
          photo = await uploadPhoto(pendingFile, pendingFile.name)
        } else {
          photo = await uploadFromDataUrl(previewData, `selfie_${Date.now()}.jpg`)
        }

        toast.dismiss()
        if (photo) {
          wizard.updateState({
            inputPhotoId: photo.id,
            inputPhotoPath: photo.storage_path,
          } as any)
          toast.success('Saved to library!')
        }
      }

      setIsConfirming(false)
      wizard.nextStep()
    }
  }

  const reset = () => {
    wizard.updateState({
      imageData: null,
      inputPhotoId: null,
      inputPhotoPath: null,
    } as any)
    wizard.setSelectedPhotoIds([])  // Clear multi-photo selections
    setPreviewData(null)
    setPendingFile(null)
    setMode('select')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Show preview of new capture (not yet persisted)
  if (previewData) {
    const selectedCount = wizard.state.selectedPhotoIds.length

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white text-center">
          {isMultiPhoto ? 'Add this photo?' : 'Looking good!'}
        </h2>

        {isMultiPhoto && (
          <p className="text-gray-400 text-center">
            {selectedCount} of {effectiveMinPhotos === effectiveMaxPhotos ? effectiveMinPhotos : `${effectiveMinPhotos}-${effectiveMaxPhotos}`} photos selected
          </p>
        )}

        <div className="relative aspect-square max-w-sm mx-auto rounded-2xl overflow-hidden border-2 border-purple-500/50">
          <img
            src={previewData}
            alt="Preview"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Save to library toggle - only for single photo mode */}
        {!isMultiPhoto && (
          <label className="flex items-center justify-center gap-2 text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={saveToLibrary}
              onChange={(e) => setSaveToLibrary(e.target.checked)}
              className="w-4 h-4 rounded border-white/20 bg-white/5 text-purple-500 focus:ring-purple-500"
            />
            <Save className="h-4 w-4" />
            <span className="text-sm">Save to my library</span>
          </label>
        )}

        <div className="flex justify-center gap-4">
          <Button
            variant="outline"
            onClick={handleRetake}
            disabled={isConfirming}
            className="bg-transparent border-white/20 text-white hover:bg-white/10"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Retake
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isConfirming || (isMultiPhoto && selectedCount >= effectiveMaxPhotos)}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            {isConfirming ? 'Saving...' : isMultiPhoto ? 'Add Photo' : 'Continue'}
            {isMultiPhoto ? <Plus className="ml-2 h-4 w-4" /> : <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </div>
      </div>
    )
  }

  // Show preview of library selection (already persisted)
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
            className="bg-transparent border-white/20 text-white hover:bg-white/10"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Change
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

  // Library mode
  if (mode === 'library') {
    const selectedCount = wizard.state.selectedPhotoIds.length

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white text-center">
          {isMultiPhoto ? 'Select photos' : 'Select from library'}
        </h2>

        {isMultiPhoto && (
          <p className="text-gray-400 text-center">
            Select {isCustomCategory ? 'up to' : ''} {effectiveMinPhotos === effectiveMaxPhotos ? effectiveMinPhotos : `${effectiveMinPhotos}-${effectiveMaxPhotos}`} photos {isCustomCategory ? '(optional)' : ''}
            <span className="ml-2 text-purple-400 font-medium">
              ({selectedCount} selected)
            </span>
          </p>
        )}

        <div className="max-w-2xl mx-auto">
          <PhotoGrid
            photos={photos}
            loading={photosLoading}
            onSelect={handleSelectFromLibrary}
            selectable
            selectedIds={isMultiPhoto ? wizard.state.selectedPhotoIds : undefined}
          />
        </div>

        <div className="flex justify-center gap-4">
          <Button
            variant="outline"
            onClick={() => setMode('select')}
            className="bg-transparent border-white/20 text-white hover:bg-white/10"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          {isMultiPhoto && (
            <Button
              onClick={handleMultiPhotoContinue}
              disabled={!hasEnoughPhotos}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              Continue {effectiveMinPhotos > 0 ? `(${selectedCount}/${effectiveMinPhotos})` : ''}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
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
            className="bg-transparent border-white/20 text-white hover:bg-white/10"
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

        {/* Save to library toggle */}
        <label className="flex items-center justify-center gap-2 text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={saveToLibrary}
            onChange={(e) => setSaveToLibrary(e.target.checked)}
            className="w-4 h-4 rounded border-white/20 bg-white/5 text-purple-500 focus:ring-purple-500"
          />
          <Save className="h-4 w-4" />
          <span className="text-sm">Save to my library</span>
        </label>

        <div className="flex justify-center gap-4">
          <Button
            variant="outline"
            onClick={() => setMode('select')}
            className="bg-transparent border-white/20 text-white hover:bg-white/10"
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

  // Selection mode for multi-photo styles
  if (isMultiPhoto) {
    const selectedCount = wizard.state.selectedPhotoIds.length
    const canAddMore = selectedCount < effectiveMaxPhotos

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white text-center">
          Add your photos
        </h2>
        <p className="text-gray-400 text-center">
          {isCustomCategory ? 'Add photos (optional)' : `Select ${effectiveMinPhotos === effectiveMaxPhotos ? effectiveMinPhotos : `${effectiveMinPhotos}-${effectiveMaxPhotos}`} photos`}
          <span className="ml-2 text-purple-400 font-medium">
            ({selectedCount} selected)
          </span>
        </p>

        {/* Selected photos preview */}
        {wizard.state.selectedPhotos.length > 0 && (
          <div className="flex justify-center gap-3 flex-wrap">
            {wizard.state.selectedPhotos.map((photo, idx) => (
              <div key={photo.id} className="relative">
                <div className="w-20 h-20 rounded-xl overflow-hidden ring-2 ring-purple-500/50">
                  <img
                    src={photo.thumbnailUrl || photo.url}
                    alt={`Selected ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center text-xs font-bold text-white">
                  {idx + 1}
                </div>
                <button
                  onClick={() => wizard.removeSelectedPhoto(photo.id)}
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add more photos options */}
        {canAddMore && (
          <div className="grid grid-cols-3 gap-2 sm:gap-4 max-w-lg mx-auto px-2">
            <button
              onClick={() => setMode('webcam')}
              className="aspect-square rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/50 hover:bg-white/10 transition-all flex flex-col items-center justify-center gap-2 sm:gap-3 p-2 sm:p-4"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Camera className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <span className="text-white font-medium text-xs sm:text-sm">Selfie</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/50 hover:bg-white/10 transition-all flex flex-col items-center justify-center gap-2 sm:gap-3 p-2 sm:p-4"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <Upload className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <span className="text-white font-medium text-xs sm:text-sm">Upload</span>
            </button>

            <button
              onClick={() => setMode('library')}
              className="aspect-square rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/50 hover:bg-white/10 transition-all flex flex-col items-center justify-center gap-2 sm:gap-3 p-2 sm:p-4 relative"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <FolderOpen className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <span className="text-white font-medium text-xs sm:text-sm">Library</span>
              {photos.length > 0 && (
                <span className="absolute top-1 right-1 sm:top-2 sm:right-2 bg-purple-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {photos.length}
                </span>
              )}
            </button>
          </div>
        )}

        {!canAddMore && (
          <p className="text-green-400 text-center text-sm">
            All {effectiveMaxPhotos} photos selected!
          </p>
        )}

        <div className="flex justify-center gap-4">
          <Button
            variant="outline"
            onClick={() => wizard.prevStep()}
            className="bg-transparent border-white/20 text-white hover:bg-white/10"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button
            onClick={handleMultiPhotoContinue}
            disabled={!hasEnoughPhotos}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            Continue {effectiveMinPhotos > 0 ? `(${selectedCount}/${effectiveMinPhotos})` : ''}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
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

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">
        Add your photo
      </h2>
      <p className="text-gray-400 text-center">
        Take a selfie, upload an image, or choose from your library
      </p>

      <div className="grid grid-cols-3 gap-2 sm:gap-4 max-w-lg mx-auto px-2">
        <button
          onClick={() => setMode('webcam')}
          className="aspect-square rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/50 hover:bg-white/10 transition-all flex flex-col items-center justify-center gap-2 sm:gap-3 p-2 sm:p-4"
        >
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Camera className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <span className="text-white font-medium text-xs sm:text-sm">Selfie</span>
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="aspect-square rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/50 hover:bg-white/10 transition-all flex flex-col items-center justify-center gap-2 sm:gap-3 p-2 sm:p-4"
        >
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <Upload className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <span className="text-white font-medium text-xs sm:text-sm">Upload</span>
        </button>

        <button
          onClick={() => setMode('library')}
          className="aspect-square rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/50 hover:bg-white/10 transition-all flex flex-col items-center justify-center gap-2 sm:gap-3 p-2 sm:p-4 relative"
        >
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
            <FolderOpen className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <span className="text-white font-medium text-xs sm:text-sm">Library</span>
          {photos.length > 0 && (
            <span className="absolute top-1 right-1 sm:top-2 sm:right-2 bg-purple-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {photos.length}
            </span>
          )}
        </button>
      </div>

      {/* Save to library toggle for upload */}
      <label className="flex items-center justify-center gap-2 text-gray-300 cursor-pointer">
        <input
          type="checkbox"
          checked={saveToLibrary}
          onChange={(e) => setSaveToLibrary(e.target.checked)}
          className="w-4 h-4 rounded border-white/20 bg-white/5 text-purple-500 focus:ring-purple-500"
        />
        <Save className="h-4 w-4" />
        <span className="text-sm">Save new photos to my library</span>
      </label>

      <div className="flex justify-center pt-4">
        <Button
          variant="outline"
          onClick={() => wizard.prevStep()}
          className="bg-transparent border-white/20 text-white hover:bg-white/10"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
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
