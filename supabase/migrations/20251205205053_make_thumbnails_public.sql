-- Make avatar-thumbnails bucket public for faster gallery loading
-- Eliminates the need for signed URLs on thumbnails

-- Make the bucket public
UPDATE storage.buckets
SET public = true
WHERE id = 'avatar-thumbnails';

-- Add public read policy (anyone can view thumbnails via direct URL)
CREATE POLICY "Public can view avatar thumbnails"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatar-thumbnails');
