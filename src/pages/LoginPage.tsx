import { motion } from 'framer-motion'
import { LoginForm } from '@/components/auth/LoginForm'
import { PublicAvatarShowcase } from '@/components/ui/PublicAvatarShowcase'

export function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-br from-purple-900 via-blue-900 to-black p-4 pt-8">
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4"
      >
        <img
          src={`${import.meta.env.BASE_URL}avatarz-logo.png`}
          alt="Avatarz"
          className="h-32 sm:h-40 md:h-48"
        />
      </motion.div>

      {/* Tagline */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-gray-400 text-lg mb-6"
      >
        Transform your photos into stunning avatars
      </motion.p>

      {/* Community Creations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        <PublicAvatarShowcase count={3} title="Community Creations" size="large" />
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
