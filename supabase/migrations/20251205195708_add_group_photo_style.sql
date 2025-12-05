-- Add Group Photo style: 1-6 photos, composites everyone into one scene
INSERT INTO public.styles (
  id, category_id, label, emoji, prompt,
  use_legacy_options, input_schema, min_photos, max_photos, sort_order
)
VALUES (
  'group-photo',
  'special',
  'Group Photo',
  E'\U0001F46A',
  'Create a {{framing}} group photo featuring all the people from the provided input photos together in one scene. {{background}} Arrange them naturally as if posing together for a photo. Each person''s face must be clearly recognizable with their features preserved. Professional photography with flattering lighting and composition. Make it look like they were all photographed together at the same time and place.',
  false,
  '{
    "fields": [
      {
        "id": "framing",
        "label": "Photo Framing",
        "type": "radio",
        "required": true,
        "defaultValue": "headshot",
        "options": [
          {"value": "headshot", "label": "Head & Shoulders", "prompt": "head and shoulders"},
          {"value": "full", "label": "Full Bodies", "prompt": "full body"}
        ]
      },
      {
        "id": "background",
        "label": "Background (optional)",
        "type": "text",
        "required": false,
        "placeholder": "e.g., at the beach, in a forest, studio backdrop, at a party"
      }
    ]
  }'::jsonb,
  1,
  6,
  10
) ON CONFLICT (id) DO UPDATE SET
  prompt = EXCLUDED.prompt,
  use_legacy_options = EXCLUDED.use_legacy_options,
  input_schema = EXCLUDED.input_schema,
  min_photos = EXCLUDED.min_photos,
  max_photos = EXCLUDED.max_photos,
  sort_order = EXCLUDED.sort_order;
