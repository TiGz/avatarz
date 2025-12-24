-- Allow authenticated users to upload thumbnails to their own folder
-- Previously only the edge function (using service role) could upload thumbnails
-- Now the client generates thumbnails and needs to upload them directly

-- RLS: Users can insert thumbnails into their own folder
CREATE POLICY "Users can upload own avatar thumbnails"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatar-thumbnails' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS: Users can update their own thumbnails (in case of re-generation)
CREATE POLICY "Users can update own avatar thumbnails"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatar-thumbnails' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatar-thumbnails' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
