-- Rename movie-poster label to "Movie Poster" (ensure it's consistent)
UPDATE public.styles
SET label = 'Movie Poster'
WHERE id = 'movie-poster';

-- Add Movie Scene style: 1 photo, inserts you into a movie scene
INSERT INTO public.styles (
  id, category_id, label, emoji, prompt,
  use_legacy_options, input_schema, min_photos, max_photos, sort_order
)
VALUES (
  'movie-scene',
  'special',
  'Movie Scene',
  E'\U0001F3AC',
  'Create a cinematic scene from the movie "{{movie_name}}" featuring the person from the photo as a character in the film. They appear as {{character_description}}. {{customization}} Match the visual style, cinematography, color grading, and aesthetic of the original movie perfectly. The person''s face must be clearly recognizable and naturally integrated into the scene. Hollywood-quality film production with appropriate lighting, composition, and cinematic framing.',
  false,
  '{
    "fields": [
      {
        "id": "movie_name",
        "label": "Movie Name",
        "type": "text",
        "required": true,
        "placeholder": "e.g., The Matrix, Titanic, Star Wars"
      },
      {
        "id": "character_description",
        "label": "Your Role/Character",
        "type": "text",
        "required": true,
        "placeholder": "e.g., a Jedi knight, the ship captain, a secret agent"
      },
      {
        "id": "customization",
        "label": "Additional Details (optional)",
        "type": "text",
        "required": false,
        "placeholder": "e.g., in an action scene, with the main cast"
      }
    ]
  }'::jsonb,
  1,
  1,
  3
) ON CONFLICT (id) DO UPDATE SET
  prompt = EXCLUDED.prompt,
  use_legacy_options = EXCLUDED.use_legacy_options,
  input_schema = EXCLUDED.input_schema,
  min_photos = EXCLUDED.min_photos,
  max_photos = EXCLUDED.max_photos,
  sort_order = EXCLUDED.sort_order;
