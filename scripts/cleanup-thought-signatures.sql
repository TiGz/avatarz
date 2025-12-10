-- Cleanup script: Remove imageData from thought_signatures
-- This reduces row size from ~20MB to ~1KB per generation
--
-- Run with:
--   supabase db execute --file scripts/cleanup-thought-signatures.sql
--
-- Or via psql:
--   psql $DATABASE_URL -f scripts/cleanup-thought-signatures.sql

BEGIN;

-- First, let's see the current state
SELECT
  'Before cleanup' as status,
  COUNT(*) as total_generations,
  COUNT(*) FILTER (WHERE thought_signatures IS NOT NULL) as with_signatures,
  pg_size_pretty(SUM(pg_column_size(thought_signatures))) as total_signature_size
FROM generations;

-- Create a function to clean a single thought_signatures object
CREATE OR REPLACE FUNCTION clean_thought_signatures(ts jsonb)
RETURNS jsonb AS $$
DECLARE
  cleaned_parts jsonb;
BEGIN
  IF ts IS NULL OR ts->'parts' IS NULL THEN
    RETURN ts;
  END IF;

  -- Rebuild parts array without imageData
  SELECT jsonb_agg(
    CASE
      WHEN part->>'imageData' IS NOT NULL THEN
        jsonb_build_object(
          'type', part->>'type',
          'signature', part->>'signature',
          'mimeType', part->>'mimeType'
        )
      ELSE
        part
    END
  )
  INTO cleaned_parts
  FROM jsonb_array_elements(ts->'parts') AS part;

  -- Return with cleaned parts, preserving originalPrompt
  RETURN jsonb_build_object(
    'parts', COALESCE(cleaned_parts, '[]'::jsonb),
    'originalPrompt', ts->>'originalPrompt'
  );
END;
$$ LANGUAGE plpgsql;

-- Apply the cleanup
UPDATE generations
SET thought_signatures = clean_thought_signatures(thought_signatures)
WHERE thought_signatures IS NOT NULL
  AND thought_signatures->'parts' IS NOT NULL;

-- Show results
SELECT
  'After cleanup' as status,
  COUNT(*) as total_generations,
  COUNT(*) FILTER (WHERE thought_signatures IS NOT NULL) as with_signatures,
  pg_size_pretty(SUM(pg_column_size(thought_signatures))) as total_signature_size
FROM generations;

-- Show sample of cleaned data
SELECT
  id,
  created_at,
  pg_size_pretty(pg_column_size(thought_signatures)) as signature_size,
  jsonb_array_length(thought_signatures->'parts') as num_parts,
  thought_signatures->>'originalPrompt' IS NOT NULL as has_original_prompt
FROM generations
WHERE thought_signatures IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

-- Clean up the helper function
DROP FUNCTION clean_thought_signatures(jsonb);

COMMIT;
