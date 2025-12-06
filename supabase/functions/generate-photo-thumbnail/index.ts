import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Image } from 'https://deno.land/x/imagescript@1.3.0/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface GenerateThumbnailRequest {
  photoId: string
}

/**
 * Center-crops an image to a square and resizes to the target dimensions
 */
async function generateCenterCroppedThumbnail(
  imageBytes: Uint8Array,
  targetSize: number,
  quality: number
): Promise<Uint8Array> {
  const image = await Image.decode(imageBytes)

  // Calculate center crop dimensions (square)
  const size = Math.min(image.width, image.height)
  const offsetX = Math.floor((image.width - size) / 2)
  const offsetY = Math.floor((image.height - size) / 2)

  // Crop to center square
  image.crop(offsetX, offsetY, size, size)

  // Resize to target dimensions
  image.resize(targetSize, targetSize)

  // Encode as JPEG
  const jpegBytes = await image.encodeJPEG(quality)
  return jpegBytes
}

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

    // Parse request
    const payload: GenerateThumbnailRequest = await req.json()

    if (!payload.photoId) {
      return new Response(JSON.stringify({ error: 'photoId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch photo record (RLS ensures user can only access their own photos)
    const { data: photo, error: photoError } = await supabase
      .from('photos')
      .select('id, storage_path, thumbnail_path')
      .eq('id', payload.photoId)
      .single()

    if (photoError || !photo) {
      console.error('Photo lookup error:', photoError)
      return new Response(JSON.stringify({ error: 'Photo not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Skip if thumbnail already exists
    if (photo.thumbnail_path) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
      const thumbnailUrl = `${supabaseUrl}/storage/v1/object/public/photo-thumbnails/${photo.thumbnail_path}`
      return new Response(
        JSON.stringify({
          success: true,
          thumbnailPath: photo.thumbnail_path,
          thumbnailUrl,
          skipped: true,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Download original photo from storage
    console.log('Downloading original photo:', photo.storage_path)
    const { data: photoData, error: downloadError } = await supabaseAdmin.storage
      .from('input-photos')
      .download(photo.storage_path)

    if (downloadError || !photoData) {
      console.error('Download error:', downloadError)
      return new Response(JSON.stringify({ error: 'Failed to download photo' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Convert to Uint8Array
    const arrayBuffer = await photoData.arrayBuffer()
    const imageBytes = new Uint8Array(arrayBuffer)

    // Generate center-cropped 300x300 thumbnail
    console.log('Generating thumbnail...')
    const thumbnailBytes = await generateCenterCroppedThumbnail(imageBytes, 300, 98)

    // Upload thumbnail to public bucket
    const thumbnailPath = `${user.id}/${Date.now()}_${crypto.randomUUID()}_thumb.jpg`
    console.log('Uploading thumbnail:', thumbnailPath)

    const { error: uploadError } = await supabaseAdmin.storage
      .from('photo-thumbnails')
      .upload(thumbnailPath, thumbnailBytes, {
        contentType: 'image/jpeg',
        cacheControl: '31536000', // 1 year cache
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return new Response(JSON.stringify({ error: 'Failed to upload thumbnail' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Update photo record with thumbnail path
    const { error: updateError } = await supabaseAdmin
      .from('photos')
      .update({ thumbnail_path: thumbnailPath })
      .eq('id', payload.photoId)

    if (updateError) {
      console.error('Update error:', updateError)
      // Continue - thumbnail was uploaded successfully
    }

    // Build public URL
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const thumbnailUrl = `${supabaseUrl}/storage/v1/object/public/photo-thumbnails/${thumbnailPath}`

    console.log('Thumbnail generated successfully:', thumbnailUrl)

    return new Response(
      JSON.stringify({
        success: true,
        thumbnailPath,
        thumbnailUrl,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    const message = error instanceof Error ? error.message : 'Thumbnail generation failed'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
