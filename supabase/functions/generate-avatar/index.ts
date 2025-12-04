import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Image } from 'https://deno.land/x/imagescript@1.3.0/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

// ============================================================================
// TYPE DEFINITIONS FOR DATABASE TABLES
// ============================================================================

interface StyleCategoryRow {
  id: string
  label: string
  emoji: string
  description: string
  sort_order: number
}

interface StyleRow {
  id: string
  category_id: string
  label: string
  emoji: string
  prompt: string
  sort_order: number
}

interface NamePlacementDefinition {
  id: string
  label: string
  description: string
  prompt: string
}

interface CropDefinition {
  id: string
  label: string
  description: string
  prompt: string
}

const NAME_PLACEMENTS: NamePlacementDefinition[] = [
  {
    id: 'graffiti',
    label: 'Graffiti',
    description: 'Name as street art behind you',
    prompt: 'written in bold graffiti style on a wall behind them, spray paint aesthetic with drips and highlights',
  },
  {
    id: 'necklace',
    label: 'Gold Chain',
    description: 'Name on a gold chain necklace',
    prompt: 'displayed on a thick gold chain necklace around their neck, clearly readable gold lettering',
  },
  {
    id: 'headband',
    label: 'Headband',
    description: 'Name on a sports headband',
    prompt: 'embroidered on a stylish headband they are wearing, clearly visible text',
  },
  {
    id: 'jersey',
    label: 'Jersey',
    description: 'Name on a sports jersey',
    prompt: 'printed on the front of a sports jersey they are wearing, athletic style lettering',
  },
  {
    id: 'floating',
    label: 'Holographic',
    description: 'Floating holographic text',
    prompt: 'as glowing holographic text floating near them, futuristic neon effect',
  },
  {
    id: 'badge',
    label: 'Name Badge',
    description: 'Professional name badge',
    prompt: 'on a professional name badge or lanyard they are wearing, clearly readable',
  },
  {
    id: 'tattoo',
    label: 'Tattoo',
    description: 'Stylish arm tattoo',
    prompt: 'as a stylish tattoo visible on their forearm, artistic lettering style',
  },
  {
    id: 'banner',
    label: 'Banner',
    description: 'Decorative banner below',
    prompt: 'on an elegant decorative banner or ribbon below them, ornate vintage style',
  },
]

const CROP_TYPES: CropDefinition[] = [
  {
    id: 'floating-head',
    label: 'Floating Head',
    description: 'Just the head',
    prompt: 'Show only the disembodied floating head with no neck, shoulders, or body visible. The head should appear to float against the background. Apply stylistic effects appropriate to the chosen art style (glow, shadow, fade, or clean cut depending on style).',
  },
  {
    id: 'portrait',
    label: 'Portrait',
    description: 'Head & shoulders',
    prompt: 'Show only the head and shoulders, tightly cropped portrait composition.',
  },
  {
    id: 'half',
    label: 'Half Body',
    description: 'Waist up',
    prompt: 'Show from the waist up, medium shot composition.',
  },
  {
    id: 'full',
    label: 'Full Body',
    description: 'Entire body',
    prompt: 'Show the entire body in frame, full length portrait.',
  },
]

// Build lookup maps for validation (styles now come from database)
const PLACEMENT_MAP = new Map(NAME_PLACEMENTS.map(p => [p.id, p]))
const CROP_MAP = new Map(CROP_TYPES.map(c => [c.id, c]))

// Age modification prompts
const AGE_PROMPTS: Record<string, string> = {
  normal: '',
  younger: 'Make the person appear younger with youthful features.',
  older: 'Make the person appear older with mature features.',
}

// Background handling prompts
const BACKGROUND_PROMPTS = {
  remove: 'Replace the background with something neutral or style-appropriate that complements the overall aesthetic.',
  keep: 'Keep the original background scene but transform it to match the art style.',
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface GenerateAvatarRequest {
  imageData: string
  style: string
  cropType: string
  name?: string
  namePlacement?: string
  customStyle?: string
  customPlacement?: string
  inputPhotoId?: string
  inputPhotoPath?: string
  isPublic?: boolean
  // Generation options (standard mode only)
  keepBackground?: boolean
  ageModification?: 'normal' | 'younger' | 'older'
  customisationText?: string
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

// ============================================================================
// COST CALCULATION
// ============================================================================

function calculateCost(inputTokens: number, outputTokens: number): number {
  // Gemini 3 Pro Image Preview pricing (2025)
  const INPUT_RATE = 2.00 / 1_000_000   // $2.00 per 1M tokens
  const OUTPUT_RATE = 12.00 / 1_000_000 // $12.00 per 1M tokens
  return (inputTokens * INPUT_RATE) + (outputTokens * OUTPUT_RATE)
}

// ============================================================================
// VALIDATION
// ============================================================================

function validateRequest(payload: unknown): GenerateAvatarRequest {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid request payload')
  }

  const req = payload as GenerateAvatarRequest

  // Validate imageData
  if (!req.imageData || typeof req.imageData !== 'string') {
    throw new Error('Missing or invalid imageData')
  }

  // Allow both data URLs and HTTP(S) URLs (signed URLs from storage)
  const isDataUrl = req.imageData.startsWith('data:image/')
  const isHttpUrl = req.imageData.startsWith('https://') || req.imageData.startsWith('http://')

  if (!isDataUrl && !isHttpUrl) {
    throw new Error('Invalid image format')
  }

  // Check size for data URLs (10MB limit)
  if (isDataUrl) {
    const base64Data = req.imageData.split(',')[1] || ''
    const sizeInBytes = (base64Data.length * 3) / 4
    if (sizeInBytes > 10 * 1024 * 1024) {
      throw new Error('Image exceeds 10MB limit')
    }
  }

  // Validate style - can be empty if using custom category with customStyle
  // Style validation against DB happens in the main handler
  if (req.style && typeof req.style !== 'string') {
    throw new Error('Invalid style format')
  }

  // Must have either a style ID or customStyle
  if (!req.style && !req.customStyle) {
    throw new Error('Either style or customStyle is required')
  }

  // Sanitize custom style (max 3000 chars for full custom prompts)
  if (req.customStyle) {
    if (typeof req.customStyle !== 'string' || req.customStyle.length > 3000) {
      throw new Error('Custom style must be under 3000 characters')
    }
    // Allow broad set of printable characters for expressive prompts
    if (!/^[\w\s\-.,!?'"():;/*#@&_=+\[\]{}|~%$^]+$/.test(req.customStyle)) {
      throw new Error('Custom style contains invalid characters')
    }
  }

  // Validate cropType
  if (!req.cropType || !CROP_MAP.has(req.cropType)) {
    throw new Error('Invalid crop type')
  }

  // Validate name if provided (max 30 chars, alphanumeric + spaces)
  if (req.name) {
    if (typeof req.name !== 'string' || req.name.length > 30) {
      throw new Error('Name must be under 30 characters')
    }
    if (!/^[a-zA-Z0-9\s]+$/.test(req.name)) {
      throw new Error('Name contains invalid characters')
    }
  }

  // Validate namePlacement if name provided
  if (req.name && req.namePlacement) {
    if (req.namePlacement !== 'custom' && !PLACEMENT_MAP.has(req.namePlacement)) {
      throw new Error('Invalid name placement')
    }
    // Sanitize custom placement
    if (req.customPlacement) {
      if (typeof req.customPlacement !== 'string' || req.customPlacement.length > 100) {
        throw new Error('Custom placement must be under 100 characters')
      }
      if (!/^[a-zA-Z0-9\s\-.,!]+$/.test(req.customPlacement)) {
        throw new Error('Custom placement contains invalid characters')
      }
    }
  }

  // Validate new generation options
  if (req.keepBackground !== undefined && typeof req.keepBackground !== 'boolean') {
    throw new Error('keepBackground must be a boolean')
  }

  if (req.ageModification && !['normal', 'younger', 'older'].includes(req.ageModification)) {
    throw new Error('Invalid age modification')
  }

  if (req.customisationText) {
    if (typeof req.customisationText !== 'string' || req.customisationText.length > 150) {
      throw new Error('Customisation text must be under 150 characters')
    }
    // Reuse existing regex pattern for allowed characters
    if (!/^[a-zA-Z0-9\s\-.,!?'"():;]+$/.test(req.customisationText)) {
      throw new Error('Customisation text contains invalid characters')
    }
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
    // Encode as JPEG with specified quality (1-100)
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

  // GET request returns available options (no auth required for this)
  if (req.method === 'GET') {
    try {
      // Create anon client to query public data
      const supabaseAnon = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? ''
      )

      // Fetch categories and styles from database
      const [categoriesResult, stylesResult] = await Promise.all([
        supabaseAnon
          .from('style_categories')
          .select('id, label, emoji, description, sort_order')
          .eq('is_active', true)
          .order('sort_order'),
        supabaseAnon
          .from('styles')
          .select('id, category_id, label, emoji, sort_order')
          .eq('is_active', true)
          .order('sort_order'),
      ])

      if (categoriesResult.error) {
        console.error('Failed to fetch categories:', categoriesResult.error)
        throw new Error('Failed to fetch categories')
      }

      if (stylesResult.error) {
        console.error('Failed to fetch styles:', stylesResult.error)
        throw new Error('Failed to fetch styles')
      }

      const categories = (categoriesResult.data as StyleCategoryRow[]).map(
        ({ id, label, emoji, description }) => ({ id, label, emoji, description })
      )

      const styles = (stylesResult.data as StyleRow[]).map(
        ({ id, category_id, label, emoji }) => ({ id, categoryId: category_id, label, emoji })
      )

      return new Response(
        JSON.stringify({
          categories,
          styles,
          namePlacements: NAME_PLACEMENTS.map(({ id, label, description }) => ({ id, label, description })),
          cropTypes: CROP_TYPES.map(({ id, label, description }) => ({ id, label, description })),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } catch (error) {
      console.error('GET options error:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch options' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  }

  // POST request generates avatar
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

    // Create admin client for bypassing RLS (storage uploads, generation inserts)
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
          error: 'Daily generation limit reached (20/day). Try again tomorrow!',
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

    // If imageData is a signed URL, fetch the actual image
    const imageData = validatedReq.imageData
    let mimeType = 'image/jpeg'
    let base64Data = ''

    if (imageData.startsWith('data:image/')) {
      // Data URL - extract base64
      const imageMatch = imageData.match(/^data:(image\/\w+);base64,(.+)$/)
      if (!imageMatch) {
        throw new Error('Invalid image data format')
      }
      mimeType = imageMatch[1]
      base64Data = imageMatch[2]
    } else {
      // Signed URL - fetch image and convert to base64
      console.log('Fetching image from signed URL...')
      const imageResponse = await fetch(imageData)
      if (!imageResponse.ok) {
        throw new Error('Failed to fetch image from storage')
      }
      const imageBuffer = await imageResponse.arrayBuffer()
      const uint8Array = new Uint8Array(imageBuffer)
      // Convert to base64 in chunks to avoid stack overflow
      let binary = ''
      const chunkSize = 8192
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, i + chunkSize)
        binary += String.fromCharCode(...chunk)
      }
      base64Data = btoa(binary)
      mimeType = imageResponse.headers.get('content-type') || 'image/jpeg'
    }

    // Build the prompt - fetch style from database if not using custom
    let stylePrompt = ''
    if (validatedReq.customStyle) {
      // Custom category or custom style override - use the provided prompt directly
      stylePrompt = validatedReq.customStyle.trim()
    } else if (validatedReq.style) {
      // Fetch the style prompt from database
      const { data: styleData, error: styleError } = await supabaseAdmin
        .from('styles')
        .select('prompt')
        .eq('id', validatedReq.style)
        .eq('is_active', true)
        .single()

      if (styleError || !styleData) {
        console.error('Style lookup error:', styleError)
        throw new Error('Invalid or inactive style')
      }

      stylePrompt = styleData.prompt
    }

    const cropPrompt = CROP_MAP.get(validatedReq.cropType)?.prompt || ''

    let namePrompt = ''
    if (validatedReq.name && validatedReq.namePlacement) {
      const placementPrompt = validatedReq.namePlacement === 'custom' && validatedReq.customPlacement
        ? validatedReq.customPlacement.trim()
        : PLACEMENT_MAP.get(validatedReq.namePlacement)?.prompt || ''
      namePrompt = `Include the name "${validatedReq.name}" ${placementPrompt}.`
    }

    // Build prompt parts array for new construction order
    const promptParts: string[] = []

    // Style prompt first
    promptParts.push(stylePrompt)

    // Age modification
    const agePrompt = AGE_PROMPTS[validatedReq.ageModification || 'normal']
    if (agePrompt) promptParts.push(agePrompt)

    // Background (always add - remove gets explicit replacement instruction)
    const bgPrompt = validatedReq.keepBackground ? BACKGROUND_PROMPTS.keep : BACKGROUND_PROMPTS.remove
    promptParts.push(bgPrompt)

    // Custom text (user's additional customisation)
    if (validatedReq.customisationText?.trim()) {
      promptParts.push(validatedReq.customisationText.trim())
    }

    // Crop and name
    promptParts.push(cropPrompt)
    if (namePrompt) promptParts.push(namePrompt)

    // System suffix
    promptParts.push('Keep the original face recognizable and maintain their identity. High quality output.')

    const prompt = promptParts.join(' ').trim()

    console.log('Prompt:', prompt)

    // Call Gemini API
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API key not configured')
    }

    // Use Gemini 3 Pro Image model for image generation/editing
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Data,
                },
              },
            ],
          }],
          generationConfig: {
            imageConfig: {
              aspectRatio: '1:1',
              imageSize: '1K',
            },
          },
        }),
      }
    )

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text()
      console.error('Gemini API error:', errorText)
      throw new Error('Failed to generate avatar')
    }

    const result: GeminiResponse = await geminiResponse.json()
    console.log('Gemini response received, extracting image...')

    // Extract usage metadata for cost calculation
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
      console.error('No image in response:', JSON.stringify(result).substring(0, 1000))
      throw new Error('No image generated')
    }

    // Upload generated avatar to Supabase storage
    const avatarFilename = `${user.id}/${Date.now()}_${crypto.randomUUID()}.png`
    const avatarBuffer = Uint8Array.from(atob(generatedImageData), c => c.charCodeAt(0))

    const { error: uploadError } = await supabaseAdmin.storage
      .from('avatars')
      .upload(avatarFilename, avatarBuffer, {
        contentType: 'image/png',
        cacheControl: '3600',
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      throw new Error('Failed to save avatar')
    }

    // Generate and upload 300x300 JPEG thumbnail
    let thumbnailFilename: string | null = null
    try {
      console.log('Generating thumbnail...')
      const thumbnailBuffer = await generateThumbnail(avatarBuffer, 300, 300, 98)
      thumbnailFilename = `${user.id}/${Date.now()}_${crypto.randomUUID()}_thumb.jpg`

      const { error: thumbUploadError } = await supabaseAdmin.storage
        .from('avatar-thumbnails')
        .upload(thumbnailFilename, thumbnailBuffer, {
          contentType: 'image/jpeg',
          cacheControl: '31536000', // 1 year cache for thumbnails
        })

      if (thumbUploadError) {
        console.error('Thumbnail upload error:', thumbUploadError)
        thumbnailFilename = null // Continue without thumbnail
      } else {
        console.log('Thumbnail uploaded:', thumbnailFilename)
      }
    } catch (thumbError) {
      console.error('Thumbnail generation failed:', thumbError)
      // Continue without thumbnail - don't fail the whole request
    }

    // Create generation record in database
    // isPublic defaults to true if not specified
    const isPublic = validatedReq.isPublic !== false
    const { data: generation, error: dbError } = await supabaseAdmin
      .from('generations')
      .insert({
        user_id: user.id,
        input_photo_id: validatedReq.inputPhotoId || null,
        output_storage_path: avatarFilename,
        thumbnail_storage_path: thumbnailFilename,
        style: validatedReq.style,
        crop_type: validatedReq.cropType,
        name_text: validatedReq.name || null,
        name_placement: validatedReq.namePlacement || null,
        custom_style: validatedReq.customStyle || null,
        custom_placement: validatedReq.customPlacement || null,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: totalTokens,
        cost_usd: cost,
        is_public: isPublic,
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database insert error:', dbError)
      // Don't fail the request - avatar was generated and saved
    }

    // Get signed URLs for avatar and thumbnail
    const { data: signedUrlData } = await supabaseAdmin.storage
      .from('avatars')
      .createSignedUrl(avatarFilename, 3600) // 1 hour

    let thumbnailUrl: string | undefined
    if (thumbnailFilename) {
      const { data: thumbUrlData } = await supabaseAdmin.storage
        .from('avatar-thumbnails')
        .createSignedUrl(thumbnailFilename, 3600)
      thumbnailUrl = thumbUrlData?.signedUrl
    }

    return new Response(
      JSON.stringify({
        success: true,
        image: `data:image/png;base64,${generatedImageData}`,
        avatarPath: avatarFilename,
        avatarUrl: signedUrlData?.signedUrl,
        thumbnailPath: thumbnailFilename,
        thumbnailUrl: thumbnailUrl,
        generationId: generation?.id,
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
    const message = error instanceof Error ? error.message : 'Generation failed'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
