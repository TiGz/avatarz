import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Generate 8-char URL-safe code (uppercase letters + numbers, no ambiguous chars)
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // No I,O,0,1
  const array = new Uint8Array(8)
  crypto.getRandomValues(array)
  return Array.from(array).map(x => chars[x % chars.length]).join('')
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Create client with user's token for RPC calls and auth
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    // Get user ID
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check invite quota using the RPC function
    const { data: quotaData, error: quotaError } = await supabaseUser.rpc('get_invite_quota')

    if (quotaError) {
      console.error('Quota error:', quotaError)
      return new Response(JSON.stringify({ error: 'Failed to check quota' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!quotaData.can_create) {
      const reason = quotaData.reason || 'Daily invite limit reached'
      return new Response(JSON.stringify({
        error: reason,
        quota: quotaData
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Generate unique code (with retry)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    let code: string = ''
    let attempts = 0

    while (attempts < 5) {
      code = generateCode()
      const { data: existing } = await supabaseAdmin
        .from('invite_codes')
        .select('id')
        .eq('code', code)
        .single()

      if (!existing) break
      attempts++
    }

    if (attempts >= 5) {
      return new Response(JSON.stringify({ error: 'Failed to generate unique code' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Create invite with 7-day expiry
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const { data: invite, error: insertError } = await supabaseAdmin
      .from('invite_codes')
      .insert({
        code: code,
        created_by: user.id,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      return new Response(JSON.stringify({ error: 'Failed to create invite' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Construct shareable URL
    const origin = req.headers.get('origin') || Deno.env.get('PUBLIC_SITE_URL') || 'https://avatarz.tigz.me'
    const inviteUrl = `${origin}/#/invite/${invite.code}`

    return new Response(JSON.stringify({
      code: invite.code,
      url: inviteUrl,
      expires_at: invite.expires_at,
      quota: {
        used: quotaData.used + 1,
        limit: quotaData.limit,
        remaining: quotaData.limit === -1 ? -1 : quotaData.remaining - 1
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in generate-invite-code:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
