import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PublicAvatar {
  avatar_id: string
  thumbnail_path: string
  avatar_style: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    // Parse query params
    const url = new URL(req.url)
    const countParam = url.searchParams.get('count')
    const count = Math.min(Math.max(parseInt(countParam || '3', 10) || 3, 1), 10)
    const styleId = url.searchParams.get('style_id') // Optional style filter

    // Create admin client to generate signed URLs
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Call RPC function to get random public avatars (optionally filtered by style)
    const { data: avatars, error: rpcError } = await supabaseAdmin.rpc(
      'get_random_public_avatars_by_style',
      { p_count: count, p_style_id: styleId }
    )

    if (rpcError) {
      console.error('RPC error:', rpcError)
      throw new Error('Failed to fetch public avatars')
    }

    // If no avatars found, return empty array
    if (!avatars || avatars.length === 0) {
      return new Response(
        JSON.stringify({ avatars: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate signed URLs for each thumbnail
    const avatarsWithUrls = await Promise.all(
      (avatars as PublicAvatar[]).map(async (avatar) => {
        const { data: signedUrlData } = await supabaseAdmin.storage
          .from('avatar-thumbnails')
          .createSignedUrl(avatar.thumbnail_path, 3600) // 1 hour expiry

        return {
          id: avatar.avatar_id,
          thumbnailUrl: signedUrlData?.signedUrl || null,
          style: avatar.avatar_style,
        }
      })
    )

    // Filter out any that failed to get signed URLs
    const validAvatars = avatarsWithUrls.filter(a => a.thumbnailUrl !== null)

    return new Response(
      JSON.stringify({ avatars: validAvatars }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch avatars'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
