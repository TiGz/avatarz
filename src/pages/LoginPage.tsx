import { motion } from 'framer-motion'
import { LoginForm } from '@/components/auth/LoginForm'
import { Sparkles } from 'lucide-react'

export function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-black p-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <motion.div
          className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 mb-6"
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Sparkles className="w-10 h-10 text-white" />
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
        className="mt-8 text-gray-500 text-sm"
      >
        Invite only
      </motion.p>
    </div>
  )
}
