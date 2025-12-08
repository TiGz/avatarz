-- Add flexible metadata column to generations table
-- Used for storing banner_format, safe_zone, and other flexible data

ALTER TABLE public.generations
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.generations.metadata IS
'Flexible metadata: {banner_format, safe_zone, original_ratio, etc.}';

-- Add index for common queries on metadata
CREATE INDEX IF NOT EXISTS idx_generations_metadata_banner_format
ON public.generations ((metadata->>'banner_format'))
WHERE metadata->>'banner_format' IS NOT NULL;
