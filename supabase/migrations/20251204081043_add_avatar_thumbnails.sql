-- Add thumbnail support for avatars
-- Generates 300x300 JPEG thumbnails at creation time for faster gallery loading

-- Add thumbnail storage path to generations table
ALTER TABLE generations
ADD COLUMN thumbnail_storage_path TEXT;

-- Create thumbnail bucket (private like avatars bucket)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatar-thumbnails',
  'avatar-thumbnails',
  FALSE,
  524288,  -- 512KB max (thumbnails are small JPEGs)
  ARRAY['image/jpeg']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- RLS: Users can view their own thumbnails
CREATE POLICY "Users can view own avatar thumbnails"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'avatar-thumbnails' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Note: Service role can insert by default (no policy needed for service_role)
-- The edge function uses service role key for uploads
