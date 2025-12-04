import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { useAdmin } from '@/hooks/useAdmin'
import { Sparkles, LogOut, Settings, Image, FolderOpen } from 'lucide-react'
import { QuotaDisplay } from '@/components/ui/QuotaDisplay'
import { PublicAvatarShowcase } from '@/components/ui/PublicAvatarShowcase'

export function HomePage() {
  const { user, signOut } = useAuth()
  const { isAdmin } = useAdmin()

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Sign out failed:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black">
      {/* Header */}
      <header className="p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white">Avatarz</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
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
        </div>
      </header>

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
          <p className="text-xl text-gray-300 mb-8">
            Ready to create your unique avatar?
          </p>

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
