-- Add photo thumbnail support
-- Generates 300x300 center-cropped JPEG thumbnails for faster photo library loading
-- Thumbnails are stored in a public bucket for direct URL access

-- ============================================================================
-- STORAGE BUCKET: photo-thumbnails (public)
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'photo-thumbnails',
  'photo-thumbnails',
  true,  -- Public bucket for direct URL access
  524288,  -- 512KB max (thumbnails are small JPEGs)
  ARRAY['image/jpeg']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Public read access (anyone can view thumbnails via direct URL)
CREATE POLICY "Public can view photo thumbnails"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'photo-thumbnails');

-- Users can delete their own thumbnails
CREATE POLICY "Users can delete own photo thumbnails"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'photo-thumbnails' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Note: Uploads are done via edge function using service role key

-- ============================================================================
-- UPDATE PHOTOS TABLE
-- ============================================================================

-- Add thumbnail storage path column
ALTER TABLE public.photos
ADD COLUMN IF NOT EXISTS thumbnail_path TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_photos_thumbnail_path ON public.photos(thumbnail_path) WHERE thumbnail_path IS NOT NULL;
