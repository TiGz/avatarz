import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

  // GET: Validate invite code (public, no auth required)
  if (req.method === 'GET') {
    const url = new URL(req.url)
    const code = url.searchParams.get('code')

    if (!code) {
      return new Response(JSON.stringify({ error: 'Code required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: invite } = await supabaseAdmin
      .from('invite_codes')
      .select('code, expires_at, max_uses, times_used')
      .eq('code', code.toUpperCase())
      .single()

    if (!invite) {
      return new Response(JSON.stringify({ valid: false, error: 'Invite code not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (invite.times_used >= invite.max_uses) {
      return new Response(JSON.stringify({ valid: false, error: 'All invite slots have been used' }), {
        status: 410,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (new Date(invite.expires_at) < new Date()) {
      return new Response(JSON.stringify({ valid: false, error: 'Invite expired' }), {
        status: 410,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({
      valid: true,
      remaining: invite.max_uses - invite.times_used
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // POST: Redeem invite code
  if (req.method === 'POST') {
    try {
      const { code, email } = await req.json()

      if (!code || !email) {
        return new Response(JSON.stringify({ error: 'Code and email required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return new Response(JSON.stringify({ error: 'Invalid email format' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const normalizedEmail = email.toLowerCase().trim()
      const normalizedCode = code.toUpperCase().trim()

      // Check if email already exists in auth.users
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
      const emailExists = existingUsers?.users?.some(
        u => u.email?.toLowerCase() === normalizedEmail
      )

      if (emailExists) {
        return new Response(JSON.stringify({
          error: 'Email already registered. Please log in instead.'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Atomically claim the invite code using the database function
      const { data: claimResult, error: claimError } = await supabaseAdmin
        .rpc('claim_invite_code', {
          invite_code: normalizedCode,
          user_email: normalizedEmail
        })

      if (claimError) {
        console.error('Claim error:', claimError)
        return new Response(JSON.stringify({
          error: 'Failed to claim invite'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      if (!claimResult.success) {
        return new Response(JSON.stringify({
          error: claimResult.error || 'Failed to claim invite'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Add email to allowlist with the tier granted by the invite code
      const tierGranted = claimResult.tier_granted || 'standard'
      const { error: allowlistError } = await supabaseAdmin
        .from('allowlist')
        .upsert({ email: normalizedEmail, tier_id: tierGranted }, { onConflict: 'email' })

      if (allowlistError) {
        console.error('Allowlist error:', allowlistError)
        // Continue anyway - user might already be in allowlist
      }

      // Send magic link with invite code in metadata
      const redirectUrl = Deno.env.get('PUBLIC_SITE_URL') || 'https://avatarz.tigz.me'
      const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        normalizedEmail,
        {
          data: {
            invite_code: normalizedCode,
            invited_by: claimResult.created_by
          },
          redirectTo: `${redirectUrl}/#/`
        }
      )

      if (inviteError) {
        console.error('Invite error:', inviteError)

        // Note: The slot is consumed even if magic link fails. This is simpler
        // than trying to rollback, and prevents abuse (repeatedly failing sends
        // wouldn't exhaust the code).

        // Check if it's because user already exists
        if (inviteError.message.includes('already been registered')) {
          return new Response(JSON.stringify({
            error: 'Email already registered. Please log in instead.'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        return new Response(JSON.stringify({
          error: 'Failed to send invitation email'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'Check your email for a magic link to complete signup'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })

    } catch (error) {
      console.error('Error in redeem-invite:', error)
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
})
