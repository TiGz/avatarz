import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Send, Mail, CheckCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

export function InviteUser() {
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [lastResult, setLastResult] = useState<{ success: boolean; email: string } | null>(null)

  const sendInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setSending(true)
    setLastResult(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('Please sign in again')
        return
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ email: email.toLowerCase().trim() }),
        }
      )

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to send invite')
      }

      setLastResult({ success: true, email: email.toLowerCase().trim() })
      toast.success(`Invite sent to ${email}`)
      setEmail('')
    } catch (error) {
      console.error('Invite error:', error)
      setLastResult({ success: false, email: email.toLowerCase().trim() })
      toast.error(error instanceof Error ? error.message : 'Failed to send invite')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-white mb-1">Invite New User</h3>
        <p className="text-gray-400 text-sm">
          Send a magic link invitation to a new user's email
        </p>
      </div>

      <form onSubmit={sendInvite} className="flex gap-2">
        <div className="relative flex-1">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="email"
            placeholder="Enter email to invite"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={sending}
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
          />
        </div>
        <Button
          type="submit"
          disabled={sending || !email.trim()}
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Invite
            </>
          )}
        </Button>
      </form>

      {lastResult && (
        <div className={`flex items-center gap-2 p-3 rounded-lg ${
          lastResult.success
            ? 'bg-green-500/10 border border-green-500/20'
            : 'bg-red-500/10 border border-red-500/20'
        }`}>
          {lastResult.success ? (
            <CheckCircle className="h-4 w-4 text-green-400" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-400" />
          )}
          <span className={`text-sm ${lastResult.success ? 'text-green-300' : 'text-red-300'}`}>
            {lastResult.success
              ? `Magic link sent to ${lastResult.email}`
              : `Failed to invite ${lastResult.email}`
            }
          </span>
        </div>
      )}
    </div>
  )
}
