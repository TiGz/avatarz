-- Update movie-poster to add optional customization text field
UPDATE public.styles
SET
  prompt = 'Create a cinematic Hollywood movie poster featuring the person from the photo as the main character. The movie is titled "{{movie_name}}" and they play the role of {{character_role}}. {{customization}} Design includes: dramatic lighting, professional movie poster typography, tagline space, studio logos at bottom, cinematic color grading. The person''s face must be clearly recognizable as the star of the film. Epic, blockbuster aesthetic.',
  input_schema = '{
    "fields": [
      {
        "id": "movie_name",
        "label": "Movie Title",
        "type": "text",
        "required": true,
        "placeholder": "e.g., The Last Guardian"
      },
      {
        "id": "character_role",
        "label": "Your Character Role",
        "type": "text",
        "required": true,
        "placeholder": "e.g., a fearless space explorer"
      },
      {
        "id": "customization",
        "label": "Additional Details (optional)",
        "type": "text",
        "required": false,
        "placeholder": "e.g., wearing a leather jacket, holding a sword"
      }
    ]
  }'::jsonb
WHERE id = 'movie-poster';

-- Add TV Program style: 1 photo, inserts you into a TV show
INSERT INTO public.styles (
  id, category_id, label, emoji, prompt,
  use_legacy_options, input_schema, min_photos, max_photos, sort_order
)
VALUES (
  'tv-program',
  'special',
  'TV Program',
  E'\U0001F4FA',
  'Create a scene from the TV show "{{show_name}}" featuring the person from the photo as a character in the show. They appear as {{character_description}}. {{customization}} Match the visual style, color grading, and aesthetic of the original TV show perfectly. The person''s face must be clearly recognizable and naturally integrated into the scene. Professional TV production quality with appropriate lighting and set design.',
  false,
  '{
    "fields": [
      {
        "id": "show_name",
        "label": "TV Show Name",
        "type": "text",
        "required": true,
        "placeholder": "e.g., Game of Thrones, The Office, Stranger Things"
      },
      {
        "id": "character_description",
        "label": "Your Role/Character",
        "type": "text",
        "required": true,
        "placeholder": "e.g., a detective solving crimes, the new office manager"
      },
      {
        "id": "customization",
        "label": "Additional Details (optional)",
        "type": "text",
        "required": false,
        "placeholder": "e.g., in a dramatic scene, with other characters"
      }
    ]
  }'::jsonb,
  1,
  1,
  4
) ON CONFLICT (id) DO UPDATE SET
  prompt = EXCLUDED.prompt,
  use_legacy_options = EXCLUDED.use_legacy_options,
  input_schema = EXCLUDED.input_schema,
  min_photos = EXCLUDED.min_photos,
  max_photos = EXCLUDED.max_photos,
  sort_order = EXCLUDED.sort_order;

-- Add Musician/Pop Star style: 1-6 photos (solo artist or band), venue options
INSERT INTO public.styles (
  id, category_id, label, emoji, prompt,
  use_legacy_options, input_schema, min_photos, max_photos, sort_order
)
VALUES (
  'musician-star',
  'special',
  'Musician / Pop Star',
  E'\U0001F3A4',
  'Create a professional music artist photo {{venue}} featuring the person(s) from the provided photo(s) as the musician/band members of "{{artist_name}}". Style them as famous pop stars or rock musicians performing or posing. {{customization}} Each person''s face must be clearly recognizable with their features preserved. Professional concert/music photography aesthetic with dramatic stage lighting, lens flares, and high production value. Make them look like genuine music superstars.',
  false,
  '{
    "fields": [
      {
        "id": "artist_name",
        "label": "Artist / Band Name",
        "type": "text",
        "required": true,
        "placeholder": "e.g., The Electric Dreams, Sarah Stone"
      },
      {
        "id": "venue",
        "label": "Setting",
        "type": "radio",
        "required": true,
        "defaultValue": "festival",
        "options": [
          {"value": "festival", "label": "Music Festival", "prompt": "performing on a massive outdoor festival stage with huge crowds, pyrotechnics, giant LED screens showing their faces, confetti cannons"},
          {"value": "music_video", "label": "Music Video", "prompt": "in a stylized music video scene with creative cinematography, artistic lighting setups, fog machines, and visually striking set design"},
          {"value": "intimate", "label": "Intimate Venue", "prompt": "performing at an intimate concert venue or jazz club with moody atmospheric lighting, close audience connection, and raw authentic energy"}
        ]
      },
      {
        "id": "customization",
        "label": "Additional Details (optional)",
        "type": "text",
        "required": false,
        "placeholder": "e.g., playing guitar, in 80s rock style, wearing leather jackets"
      }
    ]
  }'::jsonb,
  1,
  6,
  5
) ON CONFLICT (id) DO UPDATE SET
  prompt = EXCLUDED.prompt,
  use_legacy_options = EXCLUDED.use_legacy_options,
  input_schema = EXCLUDED.input_schema,
  min_photos = EXCLUDED.min_photos,
  max_photos = EXCLUDED.max_photos,
  sort_order = EXCLUDED.sort_order;
