import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Image } from 'https://deno.land/x/imagescript@1.3.0/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ExtendImageRequest {
  generationId: string           // ID of the source avatar generation
  aspectRatio: string            // e.g., '16:9', '9:16', '4:3', '3:4'
  prompt: string                 // User's prompt for how to extend the image
  targetWidth?: number           // Optional: target width for filename/metadata
  targetHeight?: number          // Optional: target height for filename/metadata
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        inlineData?: {
          mimeType?: string
          data?: string
        }
      }>
    }
    finishReason?: string
    finishMessage?: string
  }>
  usageMetadata?: {
    promptTokenCount?: number
    candidatesTokenCount?: number
    totalTokenCount?: number
  }
}

interface UserQuota {
  limit: number
  used: number
  remaining: number
  is_admin: boolean
}

// Valid aspect ratios supported by Gemini
const VALID_ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4']

// Social media banner configuration with safe zone calculations
// All banners use 16:9 to minimize cropping (2K = 2048x1152)
// safeZonePercent = what we tell AI (smaller than actual keep % for safety margin)
// LinkedIn: keep 44%, tell 35% | Twitter: keep 59%, tell 50% | Facebook: keep 66%, tell 55%
interface BannerConfig {
  width: number          // Final banner width
  height: number         // Final banner height
  geminiRatio: string    // Gemini aspect ratio to generate at
  generatedHeight: number // Height when generated at geminiRatio (based on width)
  safeZonePercent: number // What we tell AI (smaller than actual for safety margin)
}

const SOCIAL_BANNERS: Record<string, BannerConfig> = {
  'linkedin': {
    width: 1584, height: 396,
    geminiRatio: '16:9',
    generatedHeight: 891,   // 1584 * 9/16
    safeZonePercent: 35     // keep 44%, tell 35%
  },
  'twitter': {
    width: 1500, height: 500,
    geminiRatio: '16:9',
    generatedHeight: 844,   // 1500 * 9/16
    safeZonePercent: 50     // keep 59%, tell 50%
  },
  'facebook': {
    width: 851, height: 315,
    geminiRatio: '16:9',
    generatedHeight: 479,   // 851 * 9/16
    safeZonePercent: 55     // keep 66%, tell 55%
  },
  'youtube': {
    width: 2560, height: 1440,
    geminiRatio: '16:9',
    generatedHeight: 1440,  // exact match
    safeZonePercent: 100    // no cropping needed
  },
}

// Build safe zone prompt instructions for social banners
function buildSafeZonePrompt(banner: BannerConfig): string {
  if (banner.safeZonePercent === 100) return '' // No crop needed (YouTube)

  const cropPercent = Math.round((100 - banner.safeZonePercent) / 2)
  return `

CRITICAL COMPOSITION CONSTRAINT:
This image will be cropped to a ${banner.width}×${banner.height} banner.
The TOP ${cropPercent}% and BOTTOM ${cropPercent}% of the image will be REMOVED.
Keep ALL important content (faces, text, key elements) strictly within the CENTER ${banner.safeZonePercent}% vertical band.
The top and bottom zones should contain ONLY background elements (sky, ground, gradients) that can be safely cropped.
Do NOT place any faces, text, or focal points near the top or bottom edges.
IMPORTANT: Create ONE continuous, unified composition—do NOT create distinct horizontal bands or sharp divisions between zones. The background should flow naturally as a single cohesive scene.`
}

// ============================================================================
// COST CALCULATION
// ============================================================================

function calculateCost(inputTokens: number, outputTokens: number): number {
  const INPUT_RATE = 2.00 / 1_000_000
  const OUTPUT_RATE = 12.00 / 1_000_000
  return (inputTokens * INPUT_RATE) + (outputTokens * OUTPUT_RATE)
}

// ============================================================================
// VALIDATION
// ============================================================================

function validateRequest(payload: unknown): ExtendImageRequest {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid request payload')
  }

  const req = payload as ExtendImageRequest

  // Validate generationId
  if (!req.generationId || typeof req.generationId !== 'string') {
    throw new Error('generationId is required')
  }
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(req.generationId)) {
    throw new Error('Invalid generationId format')
  }

  // Validate aspectRatio (can be standard ratio OR social banner ID)
  if (!req.aspectRatio || typeof req.aspectRatio !== 'string') {
    throw new Error('aspectRatio is required')
  }
  const isSocialBanner = req.aspectRatio in SOCIAL_BANNERS
  if (!VALID_ASPECT_RATIOS.includes(req.aspectRatio) && !isSocialBanner) {
    throw new Error(`Invalid aspectRatio. Must be one of: ${VALID_ASPECT_RATIOS.join(', ')}, ${Object.keys(SOCIAL_BANNERS).join(', ')}`)
  }

  // Validate prompt
  if (!req.prompt || typeof req.prompt !== 'string') {
    throw new Error('prompt is required')
  }
  if (req.prompt.length > 3000) {
    throw new Error('prompt must be under 3000 characters')
  }

  return req
}

// ============================================================================
// THUMBNAIL GENERATION
// ============================================================================

async function generateThumbnail(
  pngBytes: Uint8Array,
  width: number,
  height: number,
  quality: number
): Promise<Uint8Array> {
  try {
    const image = await Image.decode(pngBytes)
    image.resize(width, height)
    const jpegBytes = await image.encodeJPEG(quality)
    return jpegBytes
  } catch (error) {
    console.error('Thumbnail generation error:', error)
    throw new Error('Failed to generate thumbnail')
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create user client for RLS-respecting queries
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Create admin client for bypassing RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check if user is on Private tier or has private account (always force is_public=false)
    const { data: userProfile } = await supabaseAdmin
      .from('profiles')
      .select('tier_id, is_private_account')
      .eq('id', user.id)
      .single()

    const canMakePublic = userProfile?.tier_id !== 'private' && !userProfile?.is_private_account

    // Check daily generation limit
    const { data: quotaData, error: quotaError } = await supabase.rpc('get_user_quota')
    if (quotaError) {
      console.error('Quota check error:', quotaError)
      throw new Error('Failed to check generation quota')
    }

    const quota = quotaData as UserQuota
    if (quota.remaining <= 0 && !quota.is_admin) {
      return new Response(
        JSON.stringify({
          error: 'Daily generation limit reached. Try again tomorrow!',
          quota: {
            limit: quota.limit,
            used: quota.used,
            remaining: 0,
          }
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Parse and validate request
    const payload = await req.json()
    const validatedReq = validateRequest(payload)

    // Fetch the source generation (must belong to user)
    const { data: sourceGen, error: sourceError } = await supabase
      .from('generations')
      .select('*')
      .eq('id', validatedReq.generationId)
      .eq('user_id', user.id)
      .single()

    if (sourceError || !sourceGen) {
      return new Response(
        JSON.stringify({ error: 'Source avatar not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Download the source avatar image
    console.log('Downloading source avatar:', sourceGen.output_storage_path)
    const { data: avatarData, error: downloadError } = await supabaseAdmin.storage
      .from('avatars')
      .download(sourceGen.output_storage_path)

    if (downloadError || !avatarData) {
      console.error('Download error:', downloadError)
      throw new Error('Failed to download source avatar')
    }

    // Convert to base64
    const buffer = await avatarData.arrayBuffer()
    const uint8Array = new Uint8Array(buffer)
    let binary = ''
    const chunkSize = 8192
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, i + chunkSize)
      binary += String.fromCharCode(...chunk)
    }
    const base64Data = btoa(binary)

    // Determine if this is a social banner or standard wallpaper
    const socialBanner = SOCIAL_BANNERS[validatedReq.aspectRatio]
    const geminiAspectRatio = socialBanner ? socialBanner.geminiRatio : validatedReq.aspectRatio
    const displayRatio = socialBanner
      ? `${socialBanner.width}x${socialBanner.height} (${validatedReq.aspectRatio} banner)`
      : validatedReq.aspectRatio

    // Build the prompt for image extension
    // For social banners, append safe zone instructions so AI knows what will be cropped
    // For wallpapers, add standard extension instructions
    const safeZoneInstructions = socialBanner ? buildSafeZonePrompt(socialBanner) : ''
    const extensionPrompt = socialBanner
      ? `${validatedReq.prompt}${safeZoneInstructions}`
      : `${validatedReq.prompt}

CRITICAL: This is an existing AI-generated avatar image. Extend the canvas to fill the new ${displayRatio} format while:
1. Keeping the original avatar content intact
2. Creating a natural, seamless extension of the background/environment
3. Maintaining the same art style and color palette
4. The extended areas should complement the original image perfectly
5. Output a high-quality image that looks like it was originally created at this aspect ratio`

    console.log('Extension prompt:', extensionPrompt)
    console.log('Using Gemini aspect ratio:', geminiAspectRatio, 'for requested:', validatedReq.aspectRatio)

    // Call Gemini API
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API key not configured')
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 180000) // 3 minutes

    let geminiResponse: Response
    try {
      geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                {
                  inlineData: {
                    mimeType: 'image/png',
                    data: base64Data,
                  },
                },
                { text: extensionPrompt },
              ],
            }],
            generationConfig: {
              imageConfig: {
                aspectRatio: geminiAspectRatio,
                imageSize: '2K',
              },
            },
          }),
          signal: controller.signal,
        }
      )
    } catch (fetchError) {
      clearTimeout(timeoutId)
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return new Response(
          JSON.stringify({ error: 'Generation timed out. Please try again.', code: 'TIMEOUT' }),
          { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      throw fetchError
    }
    clearTimeout(timeoutId)

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text()
      console.error('Gemini API error:', errorText)
      throw new Error('Failed to extend image')
    }

    const result: GeminiResponse = await geminiResponse.json()
    console.log('Gemini response received')

    // Check for content policy refusal
    const candidate = result.candidates?.[0]
    const finishReason = candidate?.finishReason
    if (finishReason === 'IMAGE_OTHER' || finishReason === 'SAFETY') {
      console.log('Gemini refused generation:', finishReason, candidate?.finishMessage)
      return new Response(
        JSON.stringify({
          error: 'Unable to extend this image due to content restrictions. Try a different prompt.',
          code: 'CONTENT_RESTRICTED',
          finishReason,
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract usage metadata
    const usageMetadata = result.usageMetadata
    const promptTokens = usageMetadata?.promptTokenCount || 0
    const completionTokens = usageMetadata?.candidatesTokenCount || 0
    const totalTokens = usageMetadata?.totalTokenCount || 0
    const cost = calculateCost(promptTokens, completionTokens)

    console.log('Token usage:', { promptTokens, completionTokens, totalTokens, cost })

    // Extract generated image
    const generatedImageData = result.candidates?.[0]?.content?.parts?.find(
      (part) => part.inlineData?.mimeType?.startsWith('image/')
    )?.inlineData?.data

    if (!generatedImageData) {
      console.error('No image in response')
      return new Response(
        JSON.stringify({
          error: 'Failed to generate wallpaper. Please try again.',
          code: 'GENERATION_FAILED',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Convert base64 to buffer
    const wallpaperBuffer = Uint8Array.from(atob(generatedImageData), c => c.charCodeAt(0))

    // Upload generated wallpaper to storage
    const aspectSuffix = validatedReq.aspectRatio.replace(':', 'x')
    const wallpaperFilename = `${user.id}/${Date.now()}_${crypto.randomUUID()}_wallpaper_${aspectSuffix}.png`

    const { error: uploadError } = await supabaseAdmin.storage
      .from('avatars')
      .upload(wallpaperFilename, wallpaperBuffer, {
        contentType: 'image/png',
        cacheControl: '3600',
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      throw new Error('Failed to save wallpaper')
    }

    // Generate thumbnail (maintain aspect ratio, max dimension 300)
    let thumbnailFilename: string | null = null
    try {
      console.log('Generating thumbnail...')
      // Calculate thumbnail dimensions based on aspect ratio
      let thumbWidth = 300
      let thumbHeight = 300
      if (socialBanner) {
        // For social banners, use exact dimensions
        const ratio = socialBanner.width / socialBanner.height
        if (ratio > 1) {
          thumbHeight = Math.round(300 / ratio)
        } else {
          thumbWidth = Math.round(300 * ratio)
        }
      } else {
        // For standard aspect ratios like "16:9"
        const [w, h] = validatedReq.aspectRatio.split(':').map(Number)
        if (w > h) {
          thumbHeight = Math.round(300 * (h / w))
        } else {
          thumbWidth = Math.round(300 * (w / h))
        }
      }

      const thumbnailBuffer = await generateThumbnail(wallpaperBuffer, thumbWidth, thumbHeight, 98)
      thumbnailFilename = `${user.id}/${Date.now()}_${crypto.randomUUID()}_wallpaper_${aspectSuffix}_thumb.jpg`

      const { error: thumbUploadError } = await supabaseAdmin.storage
        .from('avatar-thumbnails')
        .upload(thumbnailFilename, thumbnailBuffer, {
          contentType: 'image/jpeg',
          cacheControl: '31536000',
        })

      if (thumbUploadError) {
        console.error('Thumbnail upload error:', thumbUploadError)
        thumbnailFilename = null
      }
    } catch (thumbError) {
      console.error('Thumbnail generation failed:', thumbError)
    }

    // Wallpapers are public by default, but Private tier users always have is_public=false
    const isPublic = canMakePublic

    // Generate share URL only for public wallpapers
    let shareUrl: string | null = null
    if (thumbnailFilename && isPublic) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
      shareUrl = `${supabaseUrl}/storage/v1/object/public/avatar-thumbnails/${thumbnailFilename}`
    }

    // Create generation record
    const { data: generation, error: dbError } = await supabaseAdmin
      .from('generations')
      .insert({
        user_id: user.id,
        input_photo_id: sourceGen.input_photo_id,
        output_storage_path: wallpaperFilename,
        thumbnail_storage_path: thumbnailFilename,
        style: `wallpaper-${aspectSuffix}`,
        crop_type: 'wallpaper',
        name_text: null,
        name_placement: null,
        custom_style: validatedReq.prompt,
        custom_placement: null,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: totalTokens,
        cost_usd: cost,
        is_public: isPublic,
        share_url: shareUrl,
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database insert error:', dbError)
    }

    // Get signed URL for the wallpaper
    const { data: signedUrlData } = await supabaseAdmin.storage
      .from('avatars')
      .createSignedUrl(wallpaperFilename, 3600)

    // Build public thumbnail URL
    let thumbnailUrl: string | undefined
    if (thumbnailFilename) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
      thumbnailUrl = `${supabaseUrl}/storage/v1/object/public/avatar-thumbnails/${thumbnailFilename}`
    }

    return new Response(
      JSON.stringify({
        success: true,
        image: `data:image/png;base64,${generatedImageData}`,
        wallpaperPath: wallpaperFilename,
        wallpaperUrl: signedUrlData?.signedUrl,
        thumbnailPath: thumbnailFilename,
        thumbnailUrl: thumbnailUrl,
        shareUrl: shareUrl,
        generationId: generation?.id,
        aspectRatio: validatedReq.aspectRatio,
        quota: {
          limit: quota.limit,
          used: quota.used + 1,
          remaining: quota.is_admin ? -1 : Math.max(0, quota.remaining - 1),
          is_admin: quota.is_admin,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    const message = error instanceof Error ? error.message : 'Extension failed'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
