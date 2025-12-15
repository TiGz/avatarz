import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Header } from '@/components/ui/Header'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useUserSettings } from '@/hooks/useUserSettings'
import { useDeleteAllData } from '@/hooks/useDeleteAllData'
import { ArrowLeft, User, Eye, EyeOff, Shield, Loader2, Check, Info, PartyPopper, AlertTriangle, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

export function SettingsPage() {
  const { settings, loading, updateSettings, upgradeToAdult } = useUserSettings()
  const { progress, isDeleting, deleteAllData, reset } = useDeleteAllData()

  const [defaultName, setDefaultName] = useState('')
  const [isPrivateAccount, setIsPrivateAccount] = useState(false)
  const [nameSaving, setNameSaving] = useState(false)
  const [privacySaving, setPrivacySaving] = useState(false)
  const [nameChanged, setNameChanged] = useState(false)
  const [ageUpgrading, setAgeUpgrading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteConfirmed, setDeleteConfirmed] = useState(false)

  // Initialize form state when settings load
  useEffect(() => {
    if (settings) {
      setDefaultName(settings.defaultName || '')
      setIsPrivateAccount(settings.isPrivateAccount)
    }
  }, [settings])

  // Track if name has changed from saved value
  useEffect(() => {
    if (settings) {
      setNameChanged(defaultName !== (settings.defaultName || ''))
    }
  }, [defaultName, settings])

  // Reset delete confirmation when dialog closes
  useEffect(() => {
    if (!deleteDialogOpen) {
      setDeleteConfirmed(false)
      if (progress.phase === 'complete' || progress.phase === 'error') {
        reset()
      }
    }
  }, [deleteDialogOpen, progress.phase, reset])

  const handleSaveName = async () => {
    setNameSaving(true)
    const success = await updateSettings({ defaultName: defaultName.trim() || undefined })
    setNameSaving(false)

    if (success) {
      toast.success('Default name saved')
      setNameChanged(false)
    } else {
      toast.error('Failed to save name')
    }
  }

  const handleTogglePrivacy = async (checked: boolean) => {
    setPrivacySaving(true)
    setIsPrivateAccount(checked) // Optimistic update

    const success = await updateSettings({ isPrivateAccount: checked })
    setPrivacySaving(false)

    if (success) {
      toast.success(checked ? 'Account set to private' : 'Account set to public')
    } else {
      setIsPrivateAccount(!checked) // Revert on failure
      toast.error('Failed to update privacy setting')
    }
  }

  const handleDeleteAllData = async () => {
    const success = await deleteAllData()
    if (success) {
      setTimeout(() => {
        setDeleteDialogOpen(false)
      }, 1500)
    }
  }

  // Check if privacy toggle should be disabled
  const privacyLocked = settings?.ageGroup === 'under_18' || settings?.tier === 'private'
  const privacyLockedReason = settings?.ageGroup === 'under_18'
    ? 'Privacy is automatically enabled for users under 18'
    : settings?.tier === 'private'
    ? 'Privacy is enforced by your account tier'
    : null

  // Calculate delete progress
  const totalItems = progress.photosTotal + progress.avatarsTotal
  const deletedItems = progress.photosDeleted + progress.avatarsDeleted
  const progressPercent = totalItems > 0 ? Math.round((deletedItems / totalItems) * 100) : 0

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-black">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black">
      <Header>
        <Link to="/">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-white font-semibold flex-1 text-center pr-10">Settings</h1>
      </Header>

      <main className="max-w-md mx-auto px-4 py-8 space-y-6">
        {/* Default Name Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
              <User className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-white font-semibold">Default Name</h2>
              <p className="text-gray-400 text-sm">Used for name overlays in avatars</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <Label htmlFor="defaultName" className="text-gray-300 text-sm">
                Your name (max 30 characters)
              </Label>
              <Input
                id="defaultName"
                value={defaultName}
                onChange={(e) => setDefaultName(e.target.value.slice(0, 30))}
                placeholder="Enter your name"
                className="mt-1.5 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
              />
              <p className="text-gray-500 text-xs mt-1">
                {defaultName.length}/30 characters
              </p>
            </div>

            <Button
              onClick={handleSaveName}
              disabled={nameSaving || !nameChanged}
              className="w-full bg-purple-500 hover:bg-purple-600 disabled:opacity-50"
            >
              {nameSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : nameChanged ? (
                'Save Name'
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Saved
                </>
              )}
            </Button>
          </div>
        </motion.section>

        {/* Privacy Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-white font-semibold">Privacy</h2>
              <p className="text-gray-400 text-sm">Control who can see your avatars</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isPrivateAccount ? (
                  <EyeOff className="w-5 h-5 text-gray-400" />
                ) : (
                  <Eye className="w-5 h-5 text-gray-400" />
                )}
                <div>
                  <p className="text-white font-medium">Private Account</p>
                  <p className="text-gray-400 text-sm">
                    {isPrivateAccount
                      ? "Your avatars won't appear publicly"
                      : 'Your avatars may appear in showcase'}
                  </p>
                </div>
              </div>
              <Switch
                checked={isPrivateAccount}
                onCheckedChange={handleTogglePrivacy}
                disabled={privacyLocked || privacySaving}
                className="data-[state=checked]:bg-purple-500"
              />
            </div>

            {privacyLocked && privacyLockedReason && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-blue-300 text-sm">{privacyLockedReason}</p>
              </div>
            )}

            <div className="p-3 rounded-lg bg-white/5 border border-white/5">
              <p className="text-gray-400 text-sm">
                <strong className="text-gray-300">What this means:</strong>
                {' '}When private, your avatars will only be visible to you. They won't appear
                on the welcome screen or in the community showcase.
              </p>
            </div>
          </div>
        </motion.section>

        {/* Age Group Section */}
        {settings?.ageGroup && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gray-500/20 flex items-center justify-center">
                <User className="w-5 h-5 text-gray-400" />
              </div>
              <div>
                <h2 className="text-white font-semibold">Age Group</h2>
                <p className="text-gray-400 text-sm">
                  {settings.ageGroup === 'under_18' ? 'Under 18' : '18 or older'}
                </p>
              </div>
            </div>

            {/* Upgrade button for under-18 users */}
            {settings.ageGroup === 'under_18' && (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <p className="text-purple-300 text-sm">
                    Turned 18? Update your age group to unlock privacy controls.
                  </p>
                </div>
                <Button
                  onClick={async () => {
                    setAgeUpgrading(true)
                    const success = await upgradeToAdult()
                    setAgeUpgrading(false)
                    if (success) {
                      toast.success("Age group updated! You can now control your privacy settings.")
                    } else {
                      toast.error("Failed to update age group")
                    }
                  }}
                  disabled={ageUpgrading}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  {ageUpgrading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <PartyPopper className="w-4 h-4 mr-2" />
                      I'm now 18 or older
                    </>
                  )}
                </Button>
              </div>
            )}
          </motion.section>
        )}

        {/* Danger Zone Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-red-950/30 backdrop-blur-sm border border-red-500/20 rounded-2xl p-5"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h2 className="text-red-400 font-semibold">Danger Zone</h2>
              <p className="text-gray-400 text-sm">Irreversible actions</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-red-300 text-sm">
                Deleting your image data is permanent and cannot be undone.
                This will remove all your uploaded photos and generated avatars.
              </p>
            </div>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete All My Image Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-gray-900 border-gray-800">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-white flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    Delete All Image Data
                  </AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="text-gray-400 space-y-3">
                      <p>This will permanently delete:</p>
                      <ul className="list-disc list-inside space-y-1 text-gray-300">
                        <li>All your uploaded photos</li>
                        <li>All your generated avatars</li>
                        <li>All associated thumbnails</li>
                      </ul>
                      <p className="text-red-400 font-medium">
                        This action cannot be undone.
                      </p>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>

                {/* Progress display when deleting */}
                {isDeleting && (
                  <div className="space-y-3 py-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">
                        {progress.phase === 'fetching' && 'Fetching data...'}
                        {progress.phase === 'deleting-photos' && `Deleting photos (${progress.photosDeleted}/${progress.photosTotal})`}
                        {progress.phase === 'deleting-avatars' && `Deleting avatars (${progress.avatarsDeleted}/${progress.avatarsTotal})`}
                        {progress.phase === 'complete' && 'Complete!'}
                        {progress.phase === 'error' && 'Error occurred'}
                      </span>
                      <span className="text-gray-300 font-medium">{progressPercent}%</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          progress.phase === 'complete' ? 'bg-green-500' :
                          progress.phase === 'error' ? 'bg-red-500' : 'bg-purple-500'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    {progress.phase === 'complete' && (
                      <p className="text-green-400 text-sm text-center">
                        All data deleted successfully!
                      </p>
                    )}
                    {progress.phase === 'error' && progress.error && (
                      <p className="text-red-400 text-sm text-center">
                        {progress.error}
                      </p>
                    )}
                  </div>
                )}

                {/* Confirmation checkbox */}
                {!isDeleting && progress.phase !== 'complete' && (
                  <div className="flex items-start space-x-3 py-2">
                    <Checkbox
                      id="confirm-delete"
                      checked={deleteConfirmed}
                      onCheckedChange={(checked) => setDeleteConfirmed(checked === true)}
                      className="mt-0.5 border-red-500 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
                    />
                    <Label
                      htmlFor="confirm-delete"
                      className="text-sm text-gray-300 cursor-pointer leading-tight"
                    >
                      I understand this is permanent and cannot be undone
                    </Label>
                  </div>
                )}

                <AlertDialogFooter>
                  <AlertDialogCancel
                    disabled={isDeleting && progress.phase !== 'complete' && progress.phase !== 'error'}
                    className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white"
                  >
                    Cancel
                  </AlertDialogCancel>
                  {!isDeleting && progress.phase !== 'complete' && (
                    <AlertDialogAction
                      onClick={(e) => {
                        e.preventDefault()
                        handleDeleteAllData()
                      }}
                      disabled={!deleteConfirmed}
                      className="bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Everything
                    </AlertDialogAction>
                  )}
                  {isDeleting && progress.phase !== 'complete' && progress.phase !== 'error' && (
                    <Button disabled className="bg-red-600 text-white opacity-75">
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Deleting...
                    </Button>
                  )}
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </motion.section>
      </main>
    </div>
  )
}
