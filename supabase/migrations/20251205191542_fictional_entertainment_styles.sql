-- Delete Movie Scene (redundant with Movie Poster, and problematic)
DELETE FROM public.styles WHERE id = 'movie-scene';

-- Update TV Program: Create original fictional TV show (like Movie Poster approach)
UPDATE public.styles
SET
  label = 'TV Show Star',
  prompt = 'Create a promotional still or key art for a TV series called "{{show_name}}" starring the person from the photo. They play the role of {{character_role}} in a {{genre}} series. {{customization}} Design includes: dramatic TV promotional photography, the show title prominently displayed, network logo styling, cinematic lighting appropriate to the genre. The person''s face must be clearly recognizable as the star of the show. Professional television production quality.',
  input_schema = '{
    "fields": [
      {
        "id": "show_name",
        "label": "TV Show Title",
        "type": "text",
        "required": true,
        "placeholder": "e.g., The Night Watch, Desert Rose"
      },
      {
        "id": "character_role",
        "label": "Your Character Role",
        "type": "text",
        "required": true,
        "placeholder": "e.g., a brilliant detective, the reluctant hero"
      },
      {
        "id": "genre",
        "label": "Genre",
        "type": "radio",
        "required": true,
        "defaultValue": "drama",
        "options": [
          {"value": "drama", "label": "Drama", "prompt": "prestige drama"},
          {"value": "comedy", "label": "Comedy", "prompt": "comedy"},
          {"value": "scifi", "label": "Sci-Fi", "prompt": "science fiction"},
          {"value": "fantasy", "label": "Fantasy", "prompt": "fantasy"},
          {"value": "thriller", "label": "Thriller", "prompt": "thriller"},
          {"value": "horror", "label": "Horror", "prompt": "horror"}
        ]
      },
      {
        "id": "customization",
        "label": "Additional Details (optional)",
        "type": "text",
        "required": false,
        "placeholder": "e.g., holding a badge, in medieval armor, futuristic setting"
      }
    ]
  }'::jsonb
WHERE id = 'tv-program';

-- Update Musician/Pop Star: Create original fictional artist/band
UPDATE public.styles
SET
  prompt = 'Create a professional concert photo {{venue}} featuring the person(s) from the provided photo(s) as the musician/band members of "{{artist_name}}". They are performing as {{music_style}} artists. {{customization}} Include the band/artist name "{{artist_name}}" prominently visible on a large LED screen behind the stage, on stage banners, or on a tour poster in the scene. Dress them in stage-appropriate attire matching their music style. Each person''s face must be clearly recognizable with their features preserved. Professional concert photography aesthetic with dramatic stage lighting, lens flares, and high production value. Make them look like genuine music superstars.',
  input_schema = '{
    "fields": [
      {
        "id": "artist_name",
        "label": "Your Artist / Band Name",
        "type": "text",
        "required": true,
        "placeholder": "e.g., The Electric Dreams, Midnight Echo"
      },
      {
        "id": "music_style",
        "label": "Music Style",
        "type": "radio",
        "required": true,
        "defaultValue": "pop",
        "options": [
          {"value": "pop", "label": "Pop Star", "prompt": "mainstream pop"},
          {"value": "rock", "label": "Rock Band", "prompt": "rock"},
          {"value": "hiphop", "label": "Hip-Hop Artist", "prompt": "hip-hop"},
          {"value": "country", "label": "Country Artist", "prompt": "country"},
          {"value": "edm", "label": "DJ / EDM", "prompt": "electronic/DJ"},
          {"value": "indie", "label": "Indie Artist", "prompt": "indie"}
        ]
      },
      {
        "id": "venue",
        "label": "Setting",
        "type": "radio",
        "required": true,
        "defaultValue": "festival",
        "options": [
          {"value": "festival", "label": "Music Festival", "prompt": "performing on a massive outdoor festival stage with huge crowds, pyrotechnics, giant LED screens, confetti cannons"},
          {"value": "music_video", "label": "Music Video", "prompt": "in a stylized music video scene with creative cinematography, artistic lighting setups, fog machines, and visually striking set design"},
          {"value": "intimate", "label": "Intimate Venue", "prompt": "performing at an intimate concert venue or club with moody atmospheric lighting, close audience connection, and raw authentic energy"}
        ]
      },
      {
        "id": "customization",
        "label": "Additional Details (optional)",
        "type": "text",
        "required": false,
        "placeholder": "e.g., playing guitar, 80s glam rock style, leather jackets"
      }
    ]
  }'::jsonb
WHERE id = 'musician-star';
