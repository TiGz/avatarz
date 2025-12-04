-- Add RPC function to get random public avatars filtered by style
-- This enables showing example avatars for a specific style in the wizard

CREATE OR REPLACE FUNCTION get_random_public_avatars_by_style(
  p_count INTEGER DEFAULT 3,
  p_style_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  avatar_id UUID,
  thumbnail_path TEXT,
  avatar_style TEXT
)
LANGUAGE SQL STABLE SECURITY DEFINER
AS $$
  SELECT id, thumbnail_storage_path, style
  FROM generations
  WHERE is_public = true
    AND thumbnail_storage_path IS NOT NULL
    AND (p_style_id IS NULL OR style = p_style_id)
  ORDER BY RANDOM()
  LIMIT LEAST(p_count, 10);
$$;

-- Grant execute to both anon and authenticated roles
GRANT EXECUTE ON FUNCTION get_random_public_avatars_by_style(INTEGER, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_random_public_avatars_by_style(INTEGER, TEXT) TO authenticated;

-- Add index for efficient style-filtered queries on public avatars
CREATE INDEX IF NOT EXISTS idx_generations_public_style
ON generations(is_public, style)
WHERE is_public = true AND thumbnail_storage_path IS NOT NULL;
