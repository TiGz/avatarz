import { motion } from 'framer-motion'
import { LoginForm } from '@/components/auth/LoginForm'
import { PublicAvatarShowcase } from '@/components/ui/PublicAvatarShowcase'
import { Sparkles } from 'lucide-react'

export function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-br from-purple-900 via-blue-900 to-black p-4 pt-8">
      {/* Public avatar showcase at top */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <PublicAvatarShowcase count={3} title="Recent Creations" size="large" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-center mb-8"
      >
        <motion.div
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 mb-4"
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Sparkles className="w-8 h-8 text-white" />
        </motion.div>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
          Avatarz
        </h1>
        <p className="text-gray-400 text-lg">
          Transform your photos into stunning avatars
        </p>
      </motion.div>

      <LoginForm />

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="pt-8 text-gray-600 text-xs"
      >
        Made by TiGz
      </motion.p>
    </div>
  )
}
