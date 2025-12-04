import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { useInviteQuota } from '@/hooks/useInviteQuota'
import { useCreateInvite } from '@/hooks/useCreateInvite'
import { useMyInviteCodes } from '@/hooks/useMyInviteCodes'
import {
  Loader2,
  Plus,
  Copy,
  Check,
  CheckCircle,
  Link as LinkIcon,
  Users,
  Sparkles,
  Info,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { toast } from 'sonner'

const INVITES_PER_PAGE = 5

export function InviteManager() {
  const { quota, loading: quotaLoading, refresh: refreshQuota } = useInviteQuota()
  const { invites, loading: invitesLoading, refresh: refreshInvites } = useMyInviteCodes()
  const { createInvite, loading: creating } = useCreateInvite()
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(0)

  // Pagination
  const totalPages = Math.ceil(invites.length / INVITES_PER_PAGE)
  const paginatedInvites = useMemo(() => {
    const start = currentPage * INVITES_PER_PAGE
    return invites.slice(start, start + INVITES_PER_PAGE)
  }, [invites, currentPage])

  const handleCreateInvite = async () => {
    const result = await createInvite()
    if (result) {
      toast.success('Invite link created!')
      refreshQuota()
      refreshInvites()
      setCurrentPage(0) // Reset to first page to show new invite
      // Auto-copy the new invite URL
      await navigator.clipboard.writeText(result.url)
      setCopiedCode(result.code)
      setTimeout(() => setCopiedCode(null), 2000)
    }
  }

  const copyToClipboard = async (code: string, url: string) => {
    await navigator.clipboard.writeText(url)
    setCopiedCode(code)
    toast.success('Link copied to clipboard!')
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date()
  }

  const getInviteUrl = (code: string) => {
    return `${window.location.origin}/#/invite/${code}`
  }

  if (quotaLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
      </div>
    )
  }

  // User doesn't have invite permissions
  if (!quota?.can_create && quota?.tier === 'standard') {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-500/10 mb-4">
          <Sparkles className="h-8 w-8 text-purple-400" />
        </div>
        <h3 className="text-lg font-semibold text-white">Premium Feature</h3>
        <p className="text-gray-400 text-sm max-w-md mx-auto">
          Invite friends to join Avatarz! This feature is available for Premium members.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with quota */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-400" />
            Invite Friends
          </h3>
          <p className="text-gray-400 text-sm mt-1">
            Share invite links on social media
          </p>
        </div>

        {quota && quota.limit !== -1 && (
          <div className="text-right">
            <div className="text-sm text-gray-400">Daily Invites</div>
            <div className="text-lg font-semibold text-white">
              {quota.used}/{quota.limit}
            </div>
          </div>
        )}
      </div>

      {/* Premium user info note - only shown for premium tier (not admin) */}
      {quota?.tier === 'premium' && (
        <div className="relative overflow-hidden rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-950/40 via-amber-900/20 to-transparent p-4">
          {/* Subtle decorative element */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />

          <div className="relative flex gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Info className="w-4 h-4 text-amber-400" />
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-amber-200/90">
                You're a Premium member
              </p>
              <p className="text-xs text-amber-200/60 leading-relaxed">
                Friends you invite will join with a Standard account — 20 generations per day and no invite privileges.
                <span className="text-amber-300/70"> Only you have Premium perks!</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Create new invite button */}
      <Button
        onClick={handleCreateInvite}
        disabled={creating || (quota?.limit !== -1 && quota?.remaining === 0)}
        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
      >
        {creating ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Plus className="h-4 w-4 mr-2" />
        )}
        {creating ? 'Creating...' : 'Create New Invite Link'}
      </Button>

      {quota?.limit !== -1 && quota?.remaining === 0 && (
        <p className="text-sm text-amber-400 text-center">
          Daily invite limit reached. Resets at midnight UTC.
        </p>
      )}

      {/* List of invites */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-300">Your Invite Links</h4>
          {invites.length > 0 && (
            <span className="text-xs text-gray-500">{invites.length} total</span>
          )}
        </div>

        {invitesLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : invites.length === 0 ? (
          <div className="text-center py-6 text-gray-500 text-sm">
            No invite links yet. Create one above!
          </div>
        ) : (
          <div className="space-y-2">
            {paginatedInvites.map((invite) => {
              const expired = isExpired(invite.invite_expires_at)
              const redeemed = invite.invite_is_redeemed
              const isActive = !expired && !redeemed

              return (
                <div
                  key={invite.invite_id}
                  className={`p-3 rounded-lg border ${
                    redeemed
                      ? 'bg-green-500/5 border-green-500/20'
                      : expired
                      ? 'bg-gray-500/5 border-gray-500/20'
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        redeemed
                          ? 'bg-green-500/10'
                          : expired
                          ? 'bg-gray-500/10'
                          : 'bg-purple-500/10'
                      }`}>
                        {redeemed ? (
                          <CheckCircle className="h-4 w-4 text-green-400" />
                        ) : (
                          <LinkIcon className={`h-4 w-4 ${expired ? 'text-gray-400' : 'text-purple-400'}`} />
                        )}
                      </div>
                      <div>
                        <div className="font-mono text-sm text-white">
                          {invite.invite_code}
                        </div>
                        <div className="text-xs text-gray-400">
                          {redeemed ? (
                            <>Redeemed by {invite.invite_redeemed_email}</>
                          ) : expired ? (
                            <>Expired {formatDate(invite.invite_expires_at)}</>
                          ) : (
                            <>Expires {formatDate(invite.invite_expires_at)}</>
                          )}
                        </div>
                      </div>
                    </div>

                    {isActive && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(invite.invite_code, getInviteUrl(invite.invite_code))}
                        className="text-gray-400 hover:text-white"
                      >
                        {copiedCode === invite.invite_code ? (
                          <Check className="h-4 w-4 text-green-400" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    )}

                    {redeemed && (
                      <span className="text-xs text-green-400 font-medium">
                        Redeemed
                      </span>
                    )}

                    {expired && !redeemed && (
                      <span className="text-xs text-gray-500">
                        Expired
                      </span>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-3 border-t border-white/5">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  className="text-gray-400 hover:text-white disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Prev
                </Button>
                <span className="text-xs text-gray-500">
                  {currentPage + 1} of {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={currentPage >= totalPages - 1}
                  className="text-gray-400 hover:text-white disabled:opacity-30"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
