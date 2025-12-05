-- Add artist_name field to musician-star style
UPDATE public.styles
SET
  prompt = 'Create a professional music artist photo {{venue}} featuring the person(s) from the provided photo(s) as the musician/band members of "{{artist_name}}". Style them as famous pop stars or rock musicians performing or posing. {{customization}} Each person''s face must be clearly recognizable with their features preserved. Professional concert/music photography aesthetic with dramatic stage lighting, lens flares, and high production value. Make them look like genuine music superstars.',
  input_schema = '{
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
  }'::jsonb
WHERE id = 'musician-star';
