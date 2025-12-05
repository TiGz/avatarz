-- Add share_url column for permanent shareable thumbnail URLs
ALTER TABLE generations
ADD COLUMN IF NOT EXISTS share_url TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN generations.share_url IS 'Long-lived signed URL for sharing public avatar thumbnails (~100 year expiry)';
