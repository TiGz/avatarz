-- Add a "special" category for multi-photo and parameterized styles
INSERT INTO public.style_categories (id, label, emoji, description, sort_order)
VALUES ('special', 'Special', ':sparkles:', 'Unique styles with special features', 100)
ON CONFLICT (id) DO NOTHING;

-- Snowglobe Couple: 2 photos, no dynamic inputs, no legacy options
INSERT INTO public.styles (
  id, category_id, label, emoji, prompt,
  use_legacy_options, input_schema, min_photos, max_photos, sort_order
)
VALUES (
  'snowglobe-couple',
  'special',
  'Snowglobe Couple',
  ':crystal_ball:',
  'Create a magical Christmas snowglobe scene featuring the two people from the provided photos as a romantic couple inside the globe. Style them as detailed 3D figures embracing or holding hands, dressed in cozy winter attire (sweaters, scarves). The snowglobe sits on an ornate golden base with "Merry Christmas" engraved. Inside: falling snow, tiny Christmas trees, warm golden lights. Background: soft bokeh Christmas lights. Photorealistic glass globe with realistic light refraction. Preserve both faces with recognizable features.',
  false,
  NULL,
  2,
  2,
  1
) ON CONFLICT (id) DO UPDATE SET
  prompt = EXCLUDED.prompt,
  use_legacy_options = EXCLUDED.use_legacy_options,
  input_schema = EXCLUDED.input_schema,
  min_photos = EXCLUDED.min_photos,
  max_photos = EXCLUDED.max_photos;

-- Movie Poster: 1 photo, dynamic inputs for movie name and character role
INSERT INTO public.styles (
  id, category_id, label, emoji, prompt,
  use_legacy_options, input_schema, min_photos, max_photos, sort_order
)
VALUES (
  'movie-poster',
  'special',
  'Movie Poster',
  ':clapper:',
  'Create a cinematic Hollywood movie poster featuring the person from the photo as the main character. The movie is titled "{{movie_name}}" and they play the role of {{character_role}}. Design includes: dramatic lighting, professional movie poster typography, tagline space, studio logos at bottom, cinematic color grading. The person''s face must be clearly recognizable as the star of the film. Epic, blockbuster aesthetic.',
  false,
  '{"fields": [{"id": "movie_name", "label": "Movie Title", "required": true, "placeholder": "e.g., The Last Guardian"}, {"id": "character_role", "label": "Your Character Role", "required": true, "placeholder": "e.g., a fearless space explorer"}]}',
  1,
  1,
  2
) ON CONFLICT (id) DO UPDATE SET
  prompt = EXCLUDED.prompt,
  use_legacy_options = EXCLUDED.use_legacy_options,
  input_schema = EXCLUDED.input_schema,
  min_photos = EXCLUDED.min_photos,
  max_photos = EXCLUDED.max_photos;

-- Single person snowglobe (standard style with legacy options)
INSERT INTO public.styles (
  id, category_id, label, emoji, prompt,
  use_legacy_options, input_schema, min_photos, max_photos, sort_order
)
VALUES (
  'snowglobe-single',
  'special',
  'Snowglobe Solo',
  ':snowflake:',
  'Create a magical Christmas snowglobe featuring the person from the photo inside the globe. Style them as a detailed 3D figure in cozy winter attire. The snowglobe sits on an ornate golden base. Inside: falling snow, tiny Christmas trees, warm golden lights. Background: soft bokeh Christmas lights. Photorealistic glass globe with realistic light refraction. Preserve facial features.',
  true,
  NULL,
  1,
  1,
  3
) ON CONFLICT (id) DO UPDATE SET
  prompt = EXCLUDED.prompt,
  use_legacy_options = EXCLUDED.use_legacy_options,
  input_schema = EXCLUDED.input_schema,
  min_photos = EXCLUDED.min_photos,
  max_photos = EXCLUDED.max_photos;
