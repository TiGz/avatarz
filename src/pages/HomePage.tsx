import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { useAdmin } from '@/hooks/useAdmin'
import { useQuota } from '@/hooks/useQuota'
import { useInviteQuota } from '@/hooks/useInviteQuota'
import { LogOut, Settings, Image, FolderOpen, Users, X, Sparkles } from 'lucide-react'
import { Header } from '@/components/ui/Header'
import { QuotaDisplay } from '@/components/ui/QuotaDisplay'
import { InstallButton } from '@/components/pwa/InstallButton'
import { PublicAvatarShowcase } from '@/components/ui/PublicAvatarShowcase'
import { InviteManager } from '@/components/invite/InviteManager'
import { InviteQuotaIndicator } from '@/components/invite/InviteQuotaIndicator'

export function HomePage() {
  const { user, signOut } = useAuth()
  const { isAdmin } = useAdmin()
  const { quota } = useQuota()
  const { quota: inviteQuota } = useInviteQuota()
  const [showInvitePanel, setShowInvitePanel] = useState(false)

  // Check if user can invite (premium or admin)
  const canInvite = quota?.tier === 'premium' || quota?.tier === 'admin'

  // Show invite indicator if user can invite and has remaining invites
  const showInviteIndicator = canInvite &&
    inviteQuota?.remaining !== undefined &&
    inviteQuota.remaining > 0

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Sign out failed:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black">
      <Header>
        <InstallButton />
        <QuotaDisplay compact />
        <Link to="/photos" className="hidden sm:block">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
            <FolderOpen className="h-5 w-5" />
          </Button>
        </Link>
        <Link to="/gallery">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
            <Image className="h-5 w-5" />
          </Button>
        </Link>
        {canInvite && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowInvitePanel(!showInvitePanel)}
            className="text-white hover:bg-white/10"
          >
            <Users className="h-5 w-5" />
          </Button>
        )}
        {isAdmin && (
          <Link to="/admin">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
              <Settings className="h-5 w-5" />
            </Button>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSignOut}
          className="text-white hover:bg-white/10"
        >
          <LogOut className="h-5 w-5" />
        </Button>
      </Header>

      {/* Invite Panel (slides down when active) */}
      {showInvitePanel && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="px-4 pb-4"
        >
          <div className="max-w-md mx-auto bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Invite Friends</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowInvitePanel(false)}
                className="text-gray-400 hover:text-white hover:bg-white/10 h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <InviteManager />
          </div>
        </motion.div>
      )}

      {/* Main Content */}
      <main className="flex flex-col items-center px-4 py-8">
        {/* Community avatars at top */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <PublicAvatarShowcase count={3} title="Community Creations" size="large" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center max-w-2xl"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Welcome, {user?.email?.split('@')[0]}!
          </h1>
          <p className="text-xl text-gray-300 mb-6">
            Ready to create your unique avatar?
          </p>

          {showInviteIndicator && (
            <div className="mb-6">
              <InviteQuotaIndicator
                remaining={inviteQuota!.remaining!}
                onClick={() => setShowInvitePanel(true)}
              />
            </div>
          )}

          <Link to="/wizard">
            <Button
              size="lg"
              className="h-14 px-8 text-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              <Sparkles className="mr-2 h-5 w-5" />
              Create Avatar
            </Button>
          </Link>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="pt-12 text-gray-600 text-xs"
        >
          Made by TiGz
        </motion.p>
      </main>
    </div>
  )
}
