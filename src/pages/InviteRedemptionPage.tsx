import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sparkles,
  Loader2,
  Mail,
  CheckCircle,
  XCircle,
  AlertCircle,
  PartyPopper
} from 'lucide-react'

type InviteStatus = 'loading' | 'valid' | 'invalid' | 'expired' | 'used' | 'submitting' | 'success' | 'error'

export function InviteRedemptionPage() {
  const { code } = useParams<{ code: string }>()
  const [status, setStatus] = useState<InviteStatus>('loading')
  const [email, setEmail] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  // Validate the invite code on mount
  useEffect(() => {
    if (!code) {
      setStatus('invalid')
      setErrorMessage('No invite code provided')
      return
    }

    const validateCode = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/redeem-invite?code=${code}`,
          { method: 'GET' }
        )

        const data = await response.json()

        if (response.ok && data.valid) {
          setStatus('valid')
        } else if (response.status === 410) {
          // Gone - either expired or used
          if (data.error?.includes('expired')) {
            setStatus('expired')
          } else {
            setStatus('used')
          }
          setErrorMessage(data.error || 'Invite is no longer valid')
        } else {
          setStatus('invalid')
          setErrorMessage(data.error || 'Invalid invite code')
        }
      } catch (error) {
        console.error('Error validating invite:', error)
        setStatus('invalid')
        setErrorMessage('Failed to validate invite code')
      }
    }

    validateCode()
  }, [code])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !code) return

    setStatus('submitting')
    setErrorMessage('')

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/redeem-invite`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: code.toUpperCase(),
            email: email.toLowerCase().trim()
          })
        }
      )

      const data = await response.json()

      if (response.ok && data.success) {
        setStatus('success')
      } else {
        setStatus('error')
        setErrorMessage(data.error || 'Failed to redeem invite')
      }
    } catch (error) {
      console.error('Error redeeming invite:', error)
      setStatus('error')
      setErrorMessage('Something went wrong. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black flex flex-col">
      {/* Header */}
      <header className="p-4 flex justify-center">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white">Avatarz</span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* Loading state */}
          {status === 'loading' && (
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-purple-400 mx-auto mb-4" />
              <p className="text-gray-400">Validating invite...</p>
            </div>
          )}

          {/* Invalid/Expired/Used states */}
          {(status === 'invalid' || status === 'expired' || status === 'used') && (
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 mb-4">
                {status === 'expired' ? (
                  <AlertCircle className="h-8 w-8 text-amber-400" />
                ) : (
                  <XCircle className="h-8 w-8 text-red-400" />
                )}
              </div>
              <h1 className="text-2xl font-bold text-white">
                {status === 'expired' ? 'Invite Expired' : status === 'used' ? 'Already Used' : 'Invalid Invite'}
              </h1>
              <p className="text-gray-400">
                {errorMessage}
              </p>
              <p className="text-gray-500 text-sm">
                Please contact the person who sent you this invite for a new link.
              </p>
            </div>
          )}

          {/* Valid - show email form */}
          {(status === 'valid' || status === 'submitting' || status === 'error') && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-500/10 mb-4">
                  <PartyPopper className="h-8 w-8 text-purple-400" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">
                  You're Invited!
                </h1>
                <p className="text-gray-400">
                  Enter your email to join Avatarz and start creating amazing AI avatars.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={status === 'submitting'}
                    required
                    className="pl-11 h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                  />
                </div>

                {status === 'error' && errorMessage && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
                    {errorMessage}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={status === 'submitting' || !email.trim()}
                  className="w-full h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  {status === 'submitting' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Joining...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Join Avatarz
                    </>
                  )}
                </Button>
              </form>

              <p className="text-center text-gray-500 text-xs">
                By joining, you agree to receive emails about your account.
              </p>
            </div>
          )}

          {/* Success state */}
          {status === 'success' && (
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mb-4">
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
              <h1 className="text-2xl font-bold text-white">
                Check Your Email!
              </h1>
              <p className="text-gray-400">
                We've sent a magic link to <span className="text-white font-medium">{email}</span>
              </p>
              <p className="text-gray-500 text-sm">
                Click the link in your email to complete your signup and start creating avatars.
              </p>
            </div>
          )}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-gray-600 text-xs">
        Made by TiGz
      </footer>
    </div>
  )
}
