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

// Extended input schema types
interface InputFieldOption {
  value: string
  label: string
  prompt: string
}

interface InputField {
  id: string
  label: string
  required: boolean
  placeholder?: string
  type?: 'text' | 'radio' | 'select' | 'invite_code'
  defaultValue?: string
  description?: string
  options?: InputFieldOption[]
  prompt?: string  // For invite_code type: the prompt text with {{invite_code}} placeholder
}

interface InputSchema {
  fields: InputField[]
}

interface StyleRow {
  id: string
  category_id: string
  label: string
  emoji: string
  prompt: string
  sort_order: number
  // New fields for multi-photo and parameterized styles
  input_schema: InputSchema | null
  min_photos: number
  max_photos: number
  use_legacy_options: boolean
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

// ============================================================================
// BANNER FORMAT CONFIGURATION
// ============================================================================

interface BannerConfig {
  label: string
  width: number
  height: number
  geminiRatio: '4:3' | '3:4' | '16:9' | '1:1'
  safeZone: number  // Percentage of vertical space AI should use
}

// All banners use 16:9 to minimize cropping (2K = 2048x1152)
// safeZone = what we tell AI (smaller than actual keep % for safety margin)
// LinkedIn: keep 44%, tell 35% | Twitter: keep 59%, tell 50% | Facebook: keep 66%, tell 55%
const BANNER_FORMATS: Record<string, BannerConfig> = {
  linkedin: { label: 'LinkedIn', width: 1584, height: 396, geminiRatio: '16:9', safeZone: 35 },
  twitter: { label: 'X / Twitter', width: 1500, height: 500, geminiRatio: '16:9', safeZone: 50 },
  facebook: { label: 'Facebook', width: 851, height: 315, geminiRatio: '16:9', safeZone: 55 },
  youtube: { label: 'YouTube', width: 2560, height: 1440, geminiRatio: '16:9', safeZone: 100 },
}

function isBannerFormat(ratio: string): ratio is keyof typeof BANNER_FORMATS {
  return ratio in BANNER_FORMATS
}

// Build safe zone prompt instructions for banner formats
// Tells AI to keep content in center band since top/bottom will be cropped
function buildBannerPrompt(banner: BannerConfig): string {
  if (banner.safeZone === 100) return '' // No cropping needed (YouTube)

  const cropPercent = Math.round((100 - banner.safeZone) / 2)
  return `

CRITICAL BANNER COMPOSITION:
This image will be cropped to a ${banner.width}×${banner.height} ${banner.label} banner.
The TOP ${cropPercent}% and BOTTOM ${cropPercent}% of the image will be REMOVED during cropping.

SAFE ZONE REQUIREMENTS:
- Keep ALL important content (faces, bodies, text, key elements) strictly within the CENTER ${banner.safeZone}% vertical band
- The subject should be positioned to the RIGHT side, occupying ~30% of the width
- Leave the LEFT ~70% for background/text elements
- The top and bottom zones should contain ONLY background elements (sky, ground, gradients) that can be safely cropped
- Do NOT place any faces, text, or focal points near the top or bottom edges
- Show the complete subject (head to toe) scaled to fit entirely within the safe center band`
}

// Age modification prompts
const AGE_PROMPTS: Record<string, string> = {
  normal: '',
  younger: 'Make the person appear younger with youthful features.',
  older: 'Make the person appear older with mature features.',
}

// Background handling prompts
const BACKGROUND_PROMPTS: Record<string, string> = {
  remove: 'Replace the background with something neutral or style-appropriate that complements the overall aesthetic.',
  white: 'Place the subject on a plain solid white background (#FFFFFF). The background must be pure white with no gradients or shadows.',
  keep: 'Keep the original background scene but transform it to match the art style.',
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface GenerateAvatarRequest {
  // Photo input - supports single image or multiple photo IDs
  imageData?: string           // Single image (legacy)
  photoIds?: string[]          // Array of photo IDs for multi-photo styles

  style: string
  cropType?: string            // Optional now (only for legacy options)
  name?: string
  namePlacement?: string
  customStyle?: string
  customPlacement?: string
  inputPhotoId?: string
  inputPhotoPath?: string
  isPublic?: boolean

  // Dynamic inputs (for styles with input_schema)
  inputValues?: Record<string, string>

  // Generation options (standard mode only - when use_legacy_options=true)
  backgroundType?: 'remove' | 'white' | 'keep'
  ageModification?: 'normal' | 'younger' | 'older'
  customisationText?: string

  // Custom mode options
  preserveFacialIdentity?: boolean  // Whether to add face-preservation system prompt
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4'
  imageSize?: '1K' | '2K'

  // Edit mode (optional) - for editing existing avatars
  editGenerationId?: string   // Parent generation to edit
  editPrompt?: string         // User's edit instruction
}

interface GeminiPart {
  text?: string
  inlineData?: {
    mimeType?: string
    data?: string
  }
  thoughtSignature?: string  // Gemini's encrypted context for multi-turn editing
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[]
    }
    finishReason?: string  // e.g., 'STOP', 'IMAGE_OTHER', 'SAFETY'
    finishMessage?: string // Human-readable explanation when generation fails
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

// Stored thought signatures format
interface StoredThoughtSignatures {
  parts: Array<{
    type: 'text' | 'image'
    signature: string
    // For image parts, store the image data to rebuild conversation
    imageData?: string
    mimeType?: string
  }>
  // Store the original prompt for context rebuilding
  originalPrompt?: string
}

interface InviteQuota {
  can_create: boolean
  tier: string
  limit?: number
  used?: number
  remaining?: number
  reason?: string
}

// Generate 8-char URL-safe code (uppercase letters + numbers, no ambiguous chars)
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // No I,O,0,1
  const array = new Uint8Array(8)
  crypto.getRandomValues(array)
  return Array.from(array).map(x => chars[x % chars.length]).join('')
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

  // Validate photo input - must have either imageData OR photoIds (unless using customStyle for pure generation)
  const hasImageData = req.imageData && typeof req.imageData === 'string'
  const hasPhotoIds = req.photoIds && Array.isArray(req.photoIds) && req.photoIds.length > 0
  const isCustomWithNoPhotos = req.customStyle && !hasImageData && !hasPhotoIds

  if (!hasImageData && !hasPhotoIds && !isCustomWithNoPhotos) {
    throw new Error('Either imageData or photoIds is required (unless using custom prompt without photos)')
  }

  // Validate imageData if provided
  if (hasImageData) {
    // Allow both data URLs and HTTP(S) URLs (signed URLs from storage)
    const isDataUrl = req.imageData!.startsWith('data:image/')
    const isHttpUrl = req.imageData!.startsWith('https://') || req.imageData!.startsWith('http://')

    if (!isDataUrl && !isHttpUrl) {
      throw new Error('Invalid image format')
    }

    // Check size for data URLs (10MB limit)
    if (isDataUrl) {
      const base64Data = req.imageData!.split(',')[1] || ''
      const sizeInBytes = (base64Data.length * 3) / 4
      if (sizeInBytes > 10 * 1024 * 1024) {
        throw new Error('Image exceeds 10MB limit')
      }
    }
  }

  // Validate photoIds if provided
  if (hasPhotoIds) {
    if (req.photoIds!.length > 6) {
      throw new Error('Maximum 6 photos allowed')
    }
    // Validate each ID is a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    for (const photoId of req.photoIds!) {
      if (typeof photoId !== 'string' || !uuidRegex.test(photoId)) {
        throw new Error('Invalid photo ID format')
      }
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

  // Validate cropType (only required for legacy options - will be validated later based on style)
  if (req.cropType && !CROP_MAP.has(req.cropType)) {
    throw new Error('Invalid crop type')
  }

  // Validate name if provided (max 30 chars, alphanumeric + spaces)
  if (req.name) {
    if (typeof req.name !== 'string' || req.name.length > 30) {
      throw new Error('Name must be under 30 characters')
    }
    if (!/^[a-zA-Z0-9\s\-]+$/.test(req.name)) {
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

  // Validate inputValues if provided
  if (req.inputValues) {
    if (typeof req.inputValues !== 'object') {
      throw new Error('inputValues must be an object')
    }
    for (const [key, value] of Object.entries(req.inputValues)) {
      if (typeof key !== 'string' || typeof value !== 'string') {
        throw new Error('inputValues must be a string-to-string map')
      }
      if (value.length > 500) {
        throw new Error('Input value exceeds maximum length (500 characters)')
      }
    }
  }

  // Validate new generation options
  if (req.backgroundType !== undefined && !['remove', 'white', 'keep'].includes(req.backgroundType)) {
    throw new Error('backgroundType must be one of: remove, white, keep')
  }

  if (req.ageModification && !['normal', 'younger', 'older'].includes(req.ageModification)) {
    throw new Error('Invalid age modification')
  }

  if (req.customisationText) {
    if (typeof req.customisationText !== 'string' || req.customisationText.length > 1000) {
      throw new Error('Customisation text must be under 1000 characters')
    }
    // Reuse existing regex pattern for allowed characters
    if (!/^[a-zA-Z0-9\s\-.,!?'"():;]+$/.test(req.customisationText)) {
      throw new Error('Customisation text contains invalid characters')
    }
  }

  // Validate aspect ratio (for custom mode) - includes standard ratios AND banner formats
  const validAspectRatios = ['1:1', '16:9', '9:16', '4:3', '3:4']
  const bannerFormats = ['linkedin', 'twitter', 'facebook', 'youtube']
  if (req.aspectRatio && !validAspectRatios.includes(req.aspectRatio) && !bannerFormats.includes(req.aspectRatio)) {
    throw new Error(`Invalid aspect ratio. Must be one of: ${validAspectRatios.join(', ')}, ${bannerFormats.join(', ')}`)
  }

  // Validate image size (for custom mode)
  const validImageSizes = ['1K', '2K']
  if (req.imageSize && !validImageSizes.includes(req.imageSize)) {
    throw new Error(`Invalid image size. Must be one of: ${validImageSizes.join(', ')}`)
  }

  // Validate edit mode parameters
  if (req.editGenerationId) {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(req.editGenerationId)) {
      throw new Error('Invalid edit generation ID format')
    }
    // Edit prompt is required when editing
    if (!req.editPrompt || typeof req.editPrompt !== 'string' || req.editPrompt.trim().length === 0) {
      throw new Error('Edit prompt is required when editing an existing avatar')
    }
    if (req.editPrompt.length > 1000) {
      throw new Error('Edit prompt must be under 1000 characters')
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

// Calculate thumbnail dimensions that fit within MAX_SIZE while preserving aspect ratio
function calculateThumbnailDimensions(
  originalWidth: number,
  originalHeight: number
): { width: number; height: number } {
  const MAX_SIZE = 300
  const ratio = originalWidth / originalHeight

  if (ratio >= 1) {
    // Landscape or square: constrain width
    return { width: MAX_SIZE, height: Math.round(MAX_SIZE / ratio) }
  }
  // Portrait: constrain height
  return { width: Math.round(MAX_SIZE * ratio), height: MAX_SIZE }
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
          .select('id, category_id, label, emoji, sort_order, input_schema, min_photos, max_photos, use_legacy_options')
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
        ({ id, category_id, label, emoji, input_schema, min_photos, max_photos, use_legacy_options }) => ({
          id,
          categoryId: category_id,
          label,
          emoji,
          inputSchema: input_schema,
          minPhotos: min_photos,
          maxPhotos: max_photos,
          useLegacyOptions: use_legacy_options,
        })
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

    // Helper to convert image to base64
    const imageToBase64 = async (imageData: string): Promise<{ mimeType: string; base64Data: string }> => {
      if (imageData.startsWith('data:image/')) {
        // Data URL - extract base64
        const imageMatch = imageData.match(/^data:(image\/\w+);base64,(.+)$/)
        if (!imageMatch) {
          throw new Error('Invalid image data format')
        }
        return { mimeType: imageMatch[1], base64Data: imageMatch[2] }
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
        return {
          mimeType: imageResponse.headers.get('content-type') || 'image/jpeg',
          base64Data: btoa(binary)
        }
      }
    }

    // Helper to fetch photos from storage by IDs
    const fetchPhotosFromIds = async (photoIds: string[]): Promise<Array<{ mimeType: string; base64Data: string }>> => {
      const { data: photos, error } = await supabaseAdmin
        .from('photos')
        .select('id, storage_path, mime_type')
        .in('id', photoIds)
        .eq('user_id', user.id)

      if (error || !photos || photos.length !== photoIds.length) {
        throw new Error('Failed to fetch photos or some photos not found')
      }

      // Type the photos array
      type PhotoRow = { id: string; storage_path: string; mime_type: string | null }
      const typedPhotos = photos as PhotoRow[]

      // Maintain order based on photoIds array
      const photosById = new Map(typedPhotos.map(p => [p.id, p]))
      const orderedPhotos = photoIds.map(id => photosById.get(id)!).filter(Boolean)

      const results: Array<{ mimeType: string; base64Data: string }> = []
      for (const photo of orderedPhotos) {
        const { data, error: downloadError } = await supabaseAdmin.storage
          .from('input-photos')
          .download(photo.storage_path)

        if (downloadError || !data) {
          throw new Error(`Failed to download photo: ${photo.storage_path}`)
        }

        const buffer = await data.arrayBuffer()
        const uint8Array = new Uint8Array(buffer)
        let binary = ''
        const chunkSize = 8192
        for (let i = 0; i < uint8Array.length; i += chunkSize) {
          const chunk = uint8Array.subarray(i, i + chunkSize)
          binary += String.fromCharCode(...chunk)
        }
        results.push({
          mimeType: photo.mime_type || 'image/jpeg',
          base64Data: btoa(binary)
        })
      }
      return results
    }

    // Collect all images for Gemini request
    const imageDataArray: Array<{ mimeType: string; base64Data: string }> = []

    if (validatedReq.photoIds && validatedReq.photoIds.length > 0) {
      // Multi-photo mode: fetch photos from storage by ID
      console.log(`Fetching ${validatedReq.photoIds.length} photos from storage...`)
      const photos = await fetchPhotosFromIds(validatedReq.photoIds)
      imageDataArray.push(...photos)
    } else if (validatedReq.imageData) {
      // Single image mode (legacy)
      const image = await imageToBase64(validatedReq.imageData)
      imageDataArray.push(image)
    }

    if (imageDataArray.length === 0 && !validatedReq.customStyle) {
      throw new Error('No images provided')
    }

    console.log(`Processing ${imageDataArray.length} image(s)`)

    // Build the prompt - fetch style from database if not using custom
    let stylePrompt = ''
    let styleUseLegacyOptions = true
    let styleInputSchema: { fields: Array<{ id: string; label: string; required: boolean; placeholder?: string }> } | null = null

    if (validatedReq.customStyle) {
      // Custom category or custom style override - use the provided prompt directly
      stylePrompt = validatedReq.customStyle.trim()
    } else if (validatedReq.style) {
      // Fetch the style prompt and config from database
      const { data: styleData, error: styleError } = await supabaseAdmin
        .from('styles')
        .select('prompt, use_legacy_options, input_schema')
        .eq('id', validatedReq.style)
        .eq('is_active', true)
        .single()

      if (styleError || !styleData) {
        console.error('Style lookup error:', styleError)
        throw new Error('Invalid or inactive style')
      }

      stylePrompt = styleData.prompt
      styleUseLegacyOptions = styleData.use_legacy_options
      styleInputSchema = styleData.input_schema
    }

    // Apply template variable substitution if inputValues provided
    // For radio/select fields, resolve the option's prompt value instead of the raw value
    // Uses loop to handle nested placeholders (e.g., {{show_name}} contains {{dj_name}})
    const renderPrompt = (
      prompt: string,
      values: Record<string, string>,
      schema: InputSchema | null
    ): string => {
      let result = prompt
      let prevResult = ''

      // Keep substituting until no changes (handles nested placeholders)
      while (result !== prevResult) {
        prevResult = result
        result = result.replace(/\{\{(\w+)\}\}/g, (_, key) => {
          const value = values[key] || ''

          // Check if this field has options with prompt values
          const field = schema?.fields?.find(f => f.id === key)
          if (field?.options) {
            const option = field.options.find(o => o.value === value)
            return option?.prompt || value
          }

          return value
        })
      }

      return result
    }

    // Handle invite code generation if requested
    // Find any invite_code field in the schema to get the prompt template
    const inviteCodeField = styleInputSchema?.fields?.find(f => f.type === 'invite_code')
    let generatedInviteCode: string | null = null
    let inviteCodeError: string | null = null

    if (validatedReq.inputValues?.include_invite_code === 'true' && inviteCodeField?.prompt) {
      console.log('User requested invite code in image')

      // Check invite quota
      const { data: inviteQuota, error: inviteQuotaError } = await supabase.rpc('get_invite_quota')

      if (inviteQuotaError) {
        console.error('Invite quota check failed:', inviteQuotaError)
        inviteCodeError = 'Failed to check invite quota'
      } else {
        const quota = inviteQuota as InviteQuota

        if (!quota.can_create) {
          console.log('User cannot create invites:', quota.reason)
          inviteCodeError = quota.reason || 'Cannot create invites'
        } else if (quota.remaining === 0) {
          // remaining === -1 means unlimited, so only block when exactly 0
          console.log('User has no invites remaining')
          inviteCodeError = 'No invites remaining today'
        } else {
          // Generate unique code (with retry)
          let code = ''
          let attempts = 0

          while (attempts < 5) {
            code = generateInviteCode()
            const { data: existing } = await supabaseAdmin
              .from('invite_codes')
              .select('id')
              .eq('code', code)
              .single()

            if (!existing) break
            attempts++
          }

          if (attempts >= 5) {
            inviteCodeError = 'Failed to generate unique code'
          } else {
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
              console.error('Failed to create invite:', insertError)
              inviteCodeError = 'Failed to create invite code'
            } else {
              generatedInviteCode = invite.code
              console.log('Generated invite code:', generatedInviteCode)

              // Build the invite code text from the field's prompt template
              // Replace {{invite_code}} with the actual code
              const invitePromptText = inviteCodeField.prompt.replace(/\{\{invite_code\}\}/g, generatedInviteCode)
              validatedReq.inputValues.invite_code_text = ` ${invitePromptText}`
            }
          }
        }
      }

      // If invite code generation failed, set empty text (graceful degradation)
      if (inviteCodeError && validatedReq.inputValues) {
        validatedReq.inputValues.invite_code_text = ''
      }
    } else {
      // No invite code requested - set empty placeholder
      if (validatedReq.inputValues) {
        validatedReq.inputValues.invite_code_text = ''
      } else {
        validatedReq.inputValues = { invite_code_text: '' }
      }
    }

    if (validatedReq.inputValues && Object.keys(validatedReq.inputValues).length > 0) {
      stylePrompt = renderPrompt(stylePrompt, validatedReq.inputValues, styleInputSchema)
    }

    // Replace system placeholder {{photo_count}} with actual count
    stylePrompt = stylePrompt.replace(/\{\{photo_count\}\}/g, String(imageDataArray.length))

    // Build prompt parts array
    const promptParts: string[] = []

    // Style prompt first
    promptParts.push(stylePrompt)

    // Only add legacy options if style uses them
    if (styleUseLegacyOptions && !styleInputSchema) {
      // Age modification
      const agePrompt = AGE_PROMPTS[validatedReq.ageModification || 'normal']
      if (agePrompt) promptParts.push(agePrompt)

      // Background (always add - remove gets explicit replacement instruction)
      const bgPrompt = BACKGROUND_PROMPTS[validatedReq.backgroundType || 'remove'] || BACKGROUND_PROMPTS.remove
      promptParts.push(bgPrompt)

      // Custom text (user's additional customisation)
      if (validatedReq.customisationText?.trim()) {
        promptParts.push(validatedReq.customisationText.trim())
      }

      // Crop and name
      const cropPrompt = CROP_MAP.get(validatedReq.cropType || 'portrait')?.prompt || ''
      promptParts.push(cropPrompt)

      let namePrompt = ''
      if (validatedReq.name && validatedReq.namePlacement) {
        const placementPrompt = validatedReq.namePlacement === 'custom' && validatedReq.customPlacement
          ? validatedReq.customPlacement.trim()
          : PLACEMENT_MAP.get(validatedReq.namePlacement)?.prompt || ''
        namePrompt = `Include the name "${validatedReq.name}" ${placementPrompt}.`
      }
      if (namePrompt) promptParts.push(namePrompt)
    }

    // Banner safe zone instructions (for social media banner formats)
    // Must come before face preservation to ensure composition is correct
    const requestedRatio = validatedReq.aspectRatio || '1:1'
    const bannerConfig = isBannerFormat(requestedRatio) ? BANNER_FORMATS[requestedRatio] : null
    if (bannerConfig) {
      const bannerPrompt = buildBannerPrompt(bannerConfig)
      if (bannerPrompt) promptParts.push(bannerPrompt)
    }

    // System suffix for face recognition
    // For custom mode: only add if preserveFacialIdentity is true (user opted in)
    // For other styles: always add when photos exist
    const shouldPreserveFace = validatedReq.customStyle
      ? validatedReq.preserveFacialIdentity === true && imageDataArray.length > 0
      : imageDataArray.length > 0  // Non-custom styles always preserve face when photos exist

    if (shouldPreserveFace) {
      if (imageDataArray.length > 1) {
        promptParts.push(`CRITICAL: Preserve the exact facial identity of ALL ${imageDataArray.length} people in the photos - their bone structure, eye shape and color, nose shape, mouth, jawline, and expression must remain clearly recognizable. These are portraits of specific real individuals, not generic faces. Maintain each person's unique distinguishing features and skin characteristics. The final result must show these same people as recognizable individuals. High quality output.`)
      } else {
        promptParts.push('CRITICAL: Preserve the exact facial identity of the person in the photo - their bone structure, eye shape and color, nose shape, mouth, jawline, and expression must remain clearly recognizable. This is a portrait of a specific real individual, not a generic face. Maintain their unique distinguishing features and skin characteristics. The final result must look like the same person. High quality output.')
      }
    } else if (imageDataArray.length === 0) {
      // Pure text-to-image generation (no photos) - just add quality suffix
      promptParts.push('High quality output.')
    }

    const prompt = promptParts.join(' ').trim()

    // Store the system prompt (face preservation instructions)
    const systemPromptForStorage = shouldPreserveFace
      ? (imageDataArray.length > 1
          ? `CRITICAL: Preserve the exact facial identity of ALL ${imageDataArray.length} people in the photos...`
          : 'CRITICAL: Preserve the exact facial identity of the person in the photo...')
      : null

    console.log('Prompt:', prompt)

    // Call Gemini API
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API key not configured')
    }

    // Check if this is an edit request - fetch parent generation and build conversation history
    let parentThoughtSignatures: StoredThoughtSignatures | null = null
    let parentGenerationId: string | null = null

    if (validatedReq.editGenerationId && validatedReq.editPrompt) {
      console.log('Edit mode: fetching parent generation', validatedReq.editGenerationId)

      const { data: parent, error: parentError } = await supabaseAdmin
        .from('generations')
        .select('id, thought_signatures, output_storage_path')
        .eq('id', validatedReq.editGenerationId)
        .eq('user_id', user.id)  // Ensure user owns the generation
        .single()

      if (parentError || !parent) {
        console.error('Parent generation fetch error:', parentError)
        return new Response(
          JSON.stringify({ error: 'Parent generation not found or access denied' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!parent.thought_signatures) {
        return new Response(
          JSON.stringify({
            error: 'This avatar cannot be edited (created before edit support was added)',
            code: 'NO_THOUGHT_SIGNATURES'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      parentThoughtSignatures = parent.thought_signatures as StoredThoughtSignatures
      parentGenerationId = parent.id
      console.log('Edit mode enabled, parent has thought signatures')
    }

    const isEditMode = parentThoughtSignatures !== null

    // Build Gemini request - either new generation or multi-turn edit
    type GeminiRequestPart = { text?: string; inlineData?: { mimeType: string; data: string }; thoughtSignature?: string }
    let geminiContents: Array<{ role?: string; parts: GeminiRequestPart[] }>

    if (isEditMode && parentThoughtSignatures) {
      // Multi-turn edit: rebuild conversation history with thought signatures
      const storedSigs = parentThoughtSignatures

      // Build the original model response with thought signatures
      const modelParts: GeminiRequestPart[] = storedSigs.parts.map(part => {
        if (part.type === 'image' && part.imageData && part.mimeType) {
          return {
            inlineData: { mimeType: part.mimeType, data: part.imageData },
            thoughtSignature: part.signature
          }
        } else {
          return {
            text: part.type === 'text' ? (storedSigs.originalPrompt || '') : '',
            thoughtSignature: part.signature
          }
        }
      })

      geminiContents = [
        // Original user request (reconstructed)
        {
          role: 'user',
          parts: [{ text: storedSigs.originalPrompt || 'Generate an avatar' }]
        },
        // Original model response WITH thought signatures
        {
          role: 'model',
          parts: modelParts
        },
        // New edit request
        {
          role: 'user',
          parts: [{ text: validatedReq.editPrompt! }]
        }
      ]

      console.log('Built multi-turn conversation for edit')
    } else {
      // Standard generation: single turn
      const geminiParts: GeminiRequestPart[] = []

      // Add all images first
      for (const img of imageDataArray) {
        geminiParts.push({
          inlineData: {
            mimeType: img.mimeType,
            data: img.base64Data,
          },
        })
      }

      // Add the prompt text
      geminiParts.push({ text: prompt })

      geminiContents = [{ parts: geminiParts }]
    }

    // Use Gemini 3 Pro Image model for image generation/editing
    // Set up 3-minute timeout for slow generations
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 180000) // 3 minutes

    // Determine actual Gemini aspect ratio (bannerConfig already set above for prompt building)
    const geminiAspectRatio = bannerConfig ? bannerConfig.geminiRatio : requestedRatio
    // Force 2K for banner formats
    const geminiImageSize = bannerConfig ? '2K' : (validatedReq.imageSize || '1K')

    console.log('Generation config:', { requestedRatio, geminiAspectRatio, geminiImageSize, isBanner: !!bannerConfig, isEditMode })

    let geminiResponse: Response
    try {
      geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: geminiContents,
            generationConfig: {
              responseModalities: ['TEXT', 'IMAGE'],
              imageConfig: {
                aspectRatio: geminiAspectRatio,
                imageSize: geminiImageSize,
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
      throw new Error('Failed to generate avatar')
    }

    const result: GeminiResponse = await geminiResponse.json()
    console.log('Gemini response received, extracting image...')

    // Check for content policy / copyright refusal BEFORE extracting image
    const candidate = result.candidates?.[0]
    const finishReason = candidate?.finishReason
    if (finishReason === 'IMAGE_OTHER' || finishReason === 'SAFETY') {
      console.log('Gemini refused generation:', finishReason, candidate?.finishMessage)

      // Return 422 (Unprocessable) - request valid but can't be fulfilled
      // User won't lose a credit since we return before inserting generation record
      return new Response(
        JSON.stringify({
          error: 'Unable to generate this image. This is likely due to copyright or content restrictions on the requested style, movie, TV show, or character. Try a different prompt or style.',
          code: 'CONTENT_RESTRICTED',
          finishReason,
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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
      console.error('No image in response:', JSON.stringify(result).substring(0, 500))
      // Return error without inserting generation record - user keeps their credit
      return new Response(
        JSON.stringify({
          error: 'Failed to generate image. Please try again with different options.',
          code: 'GENERATION_FAILED',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract thought signatures from response for multi-turn editing support
    const responseParts = result.candidates?.[0]?.content?.parts || []
    const extractedThoughtSignatures: StoredThoughtSignatures = {
      parts: responseParts
        .filter((part: GeminiPart) => part.thoughtSignature)
        .map((part: GeminiPart) => {
          if (part.inlineData?.mimeType?.startsWith('image/')) {
            return {
              type: 'image' as const,
              signature: part.thoughtSignature!,
              imageData: part.inlineData.data,
              mimeType: part.inlineData.mimeType
            }
          } else {
            return {
              type: 'text' as const,
              signature: part.thoughtSignature!
            }
          }
        }),
      originalPrompt: isEditMode ? validatedReq.editPrompt : prompt
    }

    // Only store signatures if we have any (Gemini may not return them in all cases)
    const thoughtSignaturesToStore = extractedThoughtSignatures.parts.length > 0
      ? extractedThoughtSignatures
      : null

    if (thoughtSignaturesToStore) {
      console.log(`Extracted ${extractedThoughtSignatures.parts.length} thought signatures for future editing`)
    }

    // Convert base64 to buffer
    const avatarBuffer = Uint8Array.from(atob(generatedImageData), c => c.charCodeAt(0))

    // Upload generated avatar to Supabase storage
    const bannerSuffix = bannerConfig ? `_${requestedRatio}` : ''
    const avatarFilename = `${user.id}/${Date.now()}_${crypto.randomUUID()}${bannerSuffix}.png`

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

    // Generate and upload thumbnail with correct aspect ratio
    let thumbnailFilename: string | null = null
    try {
      console.log('Generating thumbnail...')
      // Decode image to get actual dimensions for aspect-ratio-aware thumbnail
      const decodedImage = await Image.decode(avatarBuffer)
      const { width: thumbW, height: thumbH } = calculateThumbnailDimensions(decodedImage.width, decodedImage.height)
      console.log(`Original: ${decodedImage.width}x${decodedImage.height}, Thumbnail: ${thumbW}x${thumbH}`)
      const thumbnailBuffer = await generateThumbnail(avatarBuffer, thumbW, thumbH, 98)
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

    // Generate public share URL for public avatars (bucket is now public)
    let shareUrl: string | null = null
    if (thumbnailFilename && validatedReq.isPublic !== false) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
      shareUrl = `${supabaseUrl}/storage/v1/object/public/avatar-thumbnails/${thumbnailFilename}`
    }

    // Create generation record in database
    // isPublic defaults to true if not specified
    const isPublic = validatedReq.isPublic !== false

    // Build metadata for banner formats
    const metadata = bannerConfig ? {
      banner_format: requestedRatio,
      original_ratio: bannerConfig.geminiRatio,
      width: bannerConfig.width,
      height: bannerConfig.height,
    } : null

    const { data: generation, error: dbError } = await supabaseAdmin
      .from('generations')
      .insert({
        user_id: user.id,
        input_photo_id: validatedReq.inputPhotoId || null,
        photo_ids: validatedReq.photoIds || null,  // NEW: array of photo IDs
        input_values: validatedReq.inputValues || null,  // NEW: dynamic input values
        output_storage_path: avatarFilename,
        thumbnail_storage_path: thumbnailFilename,
        style: validatedReq.style,
        crop_type: validatedReq.cropType || 'portrait',
        name_text: validatedReq.name || null,
        name_placement: validatedReq.namePlacement || null,
        custom_style: validatedReq.customStyle || null,
        custom_placement: validatedReq.customPlacement || null,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: totalTokens,
        cost_usd: cost,
        is_public: isPublic,
        share_url: shareUrl,
        metadata: metadata,
        // Avatar editing support
        thought_signatures: thoughtSignaturesToStore,
        parent_generation_id: parentGenerationId,
        full_prompt: isEditMode ? validatedReq.editPrompt : prompt,
        system_prompt: systemPromptForStorage,
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

    // Build public thumbnail URL (bucket is now public)
    let thumbnailUrl: string | undefined
    if (thumbnailFilename) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
      thumbnailUrl = `${supabaseUrl}/storage/v1/object/public/avatar-thumbnails/${thumbnailFilename}`
    }

    // Build invite code URL if generated
    let inviteUrl: string | undefined
    if (generatedInviteCode) {
      inviteUrl = `https://avatarz.tigz.me/#/invite/${generatedInviteCode}`
    }

    return new Response(
      JSON.stringify({
        success: true,
        image: `data:image/png;base64,${generatedImageData}`,
        avatarPath: avatarFilename,
        avatarUrl: signedUrlData?.signedUrl,
        thumbnailPath: thumbnailFilename,
        thumbnailUrl: thumbnailUrl,
        shareUrl: shareUrl,
        generationId: generation?.id,
        quota: {
          limit: quota.limit,
          used: quota.used + 1,
          remaining: quota.is_admin ? -1 : Math.max(0, quota.remaining - 1),
          is_admin: quota.is_admin,
        },
        // Include generated invite code info if created
        inviteCode: generatedInviteCode || undefined,
        inviteUrl: inviteUrl,
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
