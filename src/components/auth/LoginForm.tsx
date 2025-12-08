import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { motion } from 'framer-motion'
import { Loader2, Sparkles, Mail, Ticket } from 'lucide-react'
import { toast } from 'sonner'

type LoginStatus = 'idle' | 'checking' | 'sending' | 'code_sent' | 'verifying' | 'denied' | 'error'
type ViewMode = 'login' | 'invite'

export function LoginForm() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('login')
  const [status, setStatus] = useState<LoginStatus>('idle')

  // Check for expired magic link flag (set by useAuth when invite link is reused)
  useEffect(() => {
    const linkExpired = sessionStorage.getItem('auth-link-expired')
    if (linkExpired) {
      sessionStorage.removeItem('auth-link-expired')
      toast.info('Your invite link has expired. Enter your email below to log in.')
    }
  }, [])

  const handleRequestCode = async (e: React.FormEvent) => {
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

      // Send OTP code (not magic link)
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: email.toLowerCase(),
        options: {
          shouldCreateUser: true,
        },
      })

      if (authError) {
        console.error('OTP error:', authError)
        toast.error('Failed to send code. Please try again.')
        setStatus('error')
        return
      }

      setStatus('code_sent')
      toast.success('Code sent! Check your email.')
    } catch (err) {
      console.error('Unexpected error:', err)
      toast.error('Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('verifying')

    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.toLowerCase(),
        token: code,
        type: 'email',
      })

      if (error) {
        console.error('Verification error:', error)
        toast.error('Invalid or expired code. Please try again.')
        setStatus('code_sent')
        return
      }

      // Success - auth state change will handle redirect
      toast.success('Welcome!')
    } catch (err) {
      console.error('Unexpected error:', err)
      toast.error('Something went wrong. Please try again.')
      setStatus('code_sent')
    }
  }

  const handleRedeemInvite = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteCode.trim()) return
    // Navigate to the invite redemption page with the code
    navigate(`/invite/${inviteCode.trim().toUpperCase()}`)
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
        <div className="flex flex-col gap-3">
          <Button
            onClick={() => setStatus('idle')}
            variant="outline"
            className="border-white/20 hover:bg-white/10"
          >
            Try another email
          </Button>
          <button
            type="button"
            onClick={() => {
              setStatus('idle')
              setViewMode('invite')
            }}
            className="text-purple-400 text-sm hover:text-purple-300"
          >
            Have an invite code?
          </button>
        </div>
      </motion.div>
    )
  }

  // Invite code entry form
  if (viewMode === 'invite') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 mb-4">
            <Ticket className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Redeem Invite Code</h2>
          <p className="text-gray-400 text-sm">
            Enter the invite code you received
          </p>
        </div>

        <form onSubmit={handleRedeemInvite} className="space-y-4">
          <Input
            type="text"
            placeholder="Enter invite code"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 h-12 text-center text-lg tracking-widest uppercase"
            autoFocus
          />
          <Button
            type="submit"
            disabled={!inviteCode.trim()}
            className="w-full h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Redeem Code
          </Button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => {
              setInviteCode('')
              setViewMode('login')
            }}
            className="text-gray-400 text-sm hover:text-white"
          >
            Back to login
          </button>
        </div>
      </motion.div>
    )
  }

  // Code entry form
  if (status === 'code_sent' || status === 'verifying') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 mb-4">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Check your email</h2>
          <p className="text-gray-400 text-sm">
            We sent a 6-digit code to<br />
            <span className="text-white">{email}</span>
          </p>
        </div>

        <form onSubmit={handleVerifyCode} className="space-y-4">
          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            disabled={status === 'verifying'}
            required
            className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 h-12 text-center text-2xl tracking-widest"
            autoFocus
          />
          <Button
            type="submit"
            disabled={status === 'verifying' || code.length !== 6}
            className="w-full h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            {status === 'verifying' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Verify Code
              </>
            )}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => {
              setCode('')
              setStatus('idle')
            }}
            className="text-gray-400 text-sm hover:text-white"
          >
            Use a different email
          </button>
        </div>
      </motion.div>
    )
  }

  const isLoading = status === 'checking' || status === 'sending'

  // Email entry form
  return (
    <motion.form
      onSubmit={handleRequestCode}
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
            Get Login Code
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
      <div className="text-center pt-2">
        <button
          type="button"
          onClick={() => setViewMode('invite')}
          className="text-purple-400 text-sm hover:text-purple-300"
        >
          Have an invite code?
        </button>
      </div>
    </motion.form>
  )
}
