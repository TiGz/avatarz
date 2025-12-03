import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// SECURITY: Define allowed values to prevent prompt injection
const ALLOWED_STYLES = new Set([
  'cartoon', 'realistic', 'anime', 'pixel-art', 'watercolor',
  'oil-painting', 'cyberpunk', 'vintage', 'pop-art'
])
const ALLOWED_CROP_TYPES = new Set(['headshot', 'half', 'full'])
const ALLOWED_NAME_PLACEMENTS = new Set(['graffiti', 'headband', 'necklace', 'corner'])

// Type definitions
interface GenerateAvatarRequest {
  imageData: string
  style: string
  cropType: string
  name?: string
  namePlacement?: string
  customStyle?: string
  customPlacement?: string
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
}

// SECURITY: Validate and sanitize all inputs
function validateRequest(payload: unknown): GenerateAvatarRequest {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid request payload')
  }

  const req = payload as GenerateAvatarRequest

  // Validate imageData
  if (!req.imageData || typeof req.imageData !== 'string') {
    throw new Error('Missing or invalid imageData')
  }

  if (!req.imageData.startsWith('data:image/')) {
    throw new Error('Invalid image format')
  }

  // Check size (10MB limit)
  const base64Data = req.imageData.split(',')[1] || ''
  const sizeInBytes = (base64Data.length * 3) / 4
  if (sizeInBytes > 10 * 1024 * 1024) {
    throw new Error('Image exceeds 10MB limit')
  }

  // Validate style
  if (!req.style || typeof req.style !== 'string') {
    throw new Error('Missing or invalid style')
  }

  // Allow custom style OR preset style
  if (req.style !== 'custom' && !ALLOWED_STYLES.has(req.style)) {
    throw new Error('Invalid style option')
  }

  // Sanitize custom style (max 100 chars, alphanumeric + spaces only)
  if (req.customStyle) {
    if (typeof req.customStyle !== 'string' || req.customStyle.length > 100) {
      throw new Error('Custom style must be under 100 characters')
    }
    if (!/^[a-zA-Z0-9\s\-]+$/.test(req.customStyle)) {
      throw new Error('Custom style contains invalid characters')
    }
  }

  // Validate cropType
  if (!req.cropType || !ALLOWED_CROP_TYPES.has(req.cropType)) {
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
    if (req.namePlacement !== 'custom' && !ALLOWED_NAME_PLACEMENTS.has(req.namePlacement)) {
      throw new Error('Invalid name placement')
    }
    // Sanitize custom placement
    if (req.customPlacement) {
      if (typeof req.customPlacement !== 'string' || req.customPlacement.length > 100) {
        throw new Error('Custom placement must be under 100 characters')
      }
      if (!/^[a-zA-Z0-9\s\-]+$/.test(req.customPlacement)) {
        throw new Error('Custom placement contains invalid characters')
      }
    }
  }

  return req
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Parse and validate request
    const payload = await req.json()
    const validatedReq = validateRequest(payload)

    // Build prompt with sanitized inputs
    const style = validatedReq.style === 'custom' && validatedReq.customStyle
      ? validatedReq.customStyle.trim()
      : validatedReq.style.replace('-', ' ')

    let prompt = `Transform this photo into a ${style} style avatar.`

    const cropDescriptions: Record<string, string> = {
      headshot: 'only the head and shoulders',
      half: 'from the waist up',
      full: 'the full body'
    }
    prompt += ` Show ${cropDescriptions[validatedReq.cropType]}.`

    if (validatedReq.name && validatedReq.namePlacement) {
      const placement = validatedReq.namePlacement === 'custom' && validatedReq.customPlacement
        ? validatedReq.customPlacement.trim()
        : validatedReq.namePlacement
      const placementDescriptions: Record<string, string> = {
        graffiti: 'as graffiti in the background',
        headband: 'on a headband',
        necklace: 'on a necklace',
        corner: 'as a watermark in the corner'
      }
      const placementDesc = placementDescriptions[placement] || placement
      prompt += ` Include the name "${validatedReq.name}" ${placementDesc}.`
    }

    prompt += ' Make it high quality and visually striking. Ensure appropriate content only.'

    console.log('Prompt:', prompt)

    // Call Gemini API
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API key not configured')
    }

    // Extract base64 data and mime type
    const imageMatch = validatedReq.imageData.match(/^data:(image\/\w+);base64,(.+)$/)
    if (!imageMatch) {
      throw new Error('Invalid image data format')
    }
    const [, mimeType, base64Data] = imageMatch

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
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
            responseModalities: ['image', 'text'],
            responseMimeType: 'image/png',
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

    // Extract generated image
    const generatedImageData = result.candidates?.[0]?.content?.parts?.find(
      (part) => part.inlineData?.mimeType?.startsWith('image/')
    )?.inlineData?.data

    if (!generatedImageData) {
      console.error('No image in response:', JSON.stringify(result).substring(0, 1000))
      throw new Error('No image generated')
    }

    return new Response(
      JSON.stringify({
        success: true,
        image: `data:image/png;base64,${generatedImageData}`,
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
