import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { motion } from 'framer-motion'
import { Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

type LoginStatus = 'idle' | 'checking' | 'sending' | 'sent' | 'denied' | 'error'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<LoginStatus>('idle')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('checking')

    try {
      // Use RPC function to check allowlist (secure - only returns boolean)
      const { data: isAllowlisted, error: rpcError } = await supabase
        .rpc('check_email_allowlisted', { email_to_check: email.toLowerCase() })

      if (rpcError) {
        console.error('Allowlist check failed:', rpcError)
        toast.error('Failed to verify email. Please try again.')
        setStatus('error')
        return
      }

      if (!isAllowlisted) {
        setStatus('denied')
        return
      }

      setStatus('sending')

      // Send magic link
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: email.toLowerCase(),
        options: {
          emailRedirectTo: `${window.location.origin}/avatarz/#/`,
        },
      })

      if (authError) {
        console.error('Magic link error:', authError)
        toast.error('Failed to send magic link. Please try again.')
        setStatus('error')
        return
      }

      setStatus('sent')
    } catch (err) {
      console.error('Unexpected error:', err)
      toast.error('Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  if (status === 'denied') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center p-8"
      >
        <div className="text-6xl mb-4">😔</div>
        <h2 className="text-2xl font-bold mb-4 text-white">Sorry!</h2>
        <p className="text-gray-300 mb-6">You're not on the guest list.</p>
        <Button
          onClick={() => setStatus('idle')}
          variant="outline"
          className="border-white/20 hover:bg-white/10"
        >
          Try another email
        </Button>
      </motion.div>
    )
  }

  if (status === 'sent') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center p-8"
      >
        <div className="text-6xl mb-4">✨</div>
        <h2 className="text-2xl font-bold mb-4 text-white">Check your email!</h2>
        <p className="text-gray-300">We've sent you a magic link to sign in.</p>
      </motion.div>
    )
  }

  const isLoading = status === 'checking' || status === 'sending'

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="space-y-4 w-full max-w-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Input
        type="email"
        placeholder="Enter your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={isLoading}
        required
        className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 h-12"
      />
      <Button
        type="submit"
        disabled={isLoading}
        className="w-full h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {status === 'checking' ? 'Checking...' : 'Sending...'}
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            Get Magic Link
          </>
        )}
      </Button>
      {status === 'error' && (
        <p className="text-sm text-red-400 text-center">
          Something went wrong.{' '}
          <button
            type="button"
            onClick={() => setStatus('idle')}
            className="underline hover:text-red-300"
          >
            Try again
          </button>
        </p>
      )}
    </motion.form>
  )
}
