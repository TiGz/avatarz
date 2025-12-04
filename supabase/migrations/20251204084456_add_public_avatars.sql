-- Add is_public column to generations (default true = public by default)
ALTER TABLE generations ADD COLUMN is_public BOOLEAN DEFAULT true;

-- Create index for efficient random public avatar queries
CREATE INDEX idx_generations_public_thumbnail ON generations (is_public, thumbnail_storage_path)
  WHERE is_public = true AND thumbnail_storage_path IS NOT NULL;

-- Create function to get random public avatars (callable by anon)
CREATE OR REPLACE FUNCTION get_random_public_avatars(count INT DEFAULT 3)
RETURNS TABLE (
  avatar_id UUID,
  thumbnail_path TEXT,
  style TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE SQL STABLE SECURITY DEFINER
AS $$
  SELECT id, thumbnail_storage_path, style, created_at
  FROM generations
  WHERE is_public = true
    AND thumbnail_storage_path IS NOT NULL
  ORDER BY RANDOM()
  LIMIT LEAST(count, 10);
$$;

-- Grant execute to anon role for unauthenticated access
GRANT EXECUTE ON FUNCTION get_random_public_avatars(INT) TO anon;
GRANT EXECUTE ON FUNCTION get_random_public_avatars(INT) TO authenticated;
