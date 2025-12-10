-- Cleanup: Remove imageData from thought_signatures to reduce row size
-- From ~20MB to ~1KB per generation

-- Create a temporary function to clean a single thought_signatures object
CREATE OR REPLACE FUNCTION pg_temp.clean_thought_signatures(ts jsonb)
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
SET thought_signatures = pg_temp.clean_thought_signatures(thought_signatures)
WHERE thought_signatures IS NOT NULL
  AND thought_signatures->'parts' IS NOT NULL
  AND jsonb_array_length(thought_signatures->'parts') > 0;
