-- Delete musician-star style and replace with Band at Concert and DJ styles

-- Delete the old musician-star style
DELETE FROM public.styles WHERE id = 'musician-star';

-- Add Band at Concert style (1-5 photos)
INSERT INTO public.styles (
  id, category_id, label, emoji, prompt,
  use_legacy_options, input_schema, min_photos, max_photos, sort_order, is_active
) VALUES (
  'band-concert',
  'special',
  'Band at Concert',
  '🎸',
  'Create an ultra-realistic concert photograph featuring exactly {{photo_count}} band member(s) from the provided photo(s) performing as the band "{{band_name}}" on stage. {{scene_style}} Each person''s face must be clearly recognizable with their exact features preserved. The band name "{{band_name}}" should be prominently visible on a large LED screen behind the stage, on stage banners, or on a tour poster in the scene. {{customization}} Professional concert photography aesthetic with dramatic stage lighting, visible film grain, and high production value. Make them look like genuine rock stars.',
  false,
  '{
    "fields": [
      {
        "id": "band_name",
        "label": "Band Name",
        "type": "text",
        "required": true,
        "placeholder": "e.g., The Electric Dreams, Midnight Echo"
      },
      {
        "id": "scene_style",
        "label": "Concert Scene",
        "type": "radio",
        "required": true,
        "defaultValue": "festival",
        "options": [
          {
            "value": "festival",
            "label": "Festival Main Stage",
            "prompt": "Gritty, high-ISO photo of the band performing on a massive outdoor festival stage at night, screaming into microphones with guitars and drums in sharp focus, chaotic stage lights casting colorful beams, pyrotechnics bursting, lasers sweeping over massive crowd, confetti exploding, visible film grain, motion blur on cheering crowd of thousands, raw energy, ultra-realistic 8K."
          },
          {
            "value": "sunset",
            "label": "Golden Hour Festival",
            "prompt": "Full band on main stage at sunset festival: LED screens with visuals, confetti exploding, waving crowd, warm golden lighting with lens flare, cinematic depth-of-field, photorealistic 8K concert vibe. Soft sunlight casting long shadows, relaxed crowd energy transitioning to excitement."
          },
          {
            "value": "warehouse",
            "label": "Underground Warehouse",
            "prompt": "Cinematic shot of band jamming in warehouse rave venue: behind amps and mics under strobe lights, fog machine haze, industrial vibe with red-blue neons, crowd hands raised in background blur, high-contrast photorealistic 8K. Metal reflections, low-key contrast, raw authentic energy."
          },
          {
            "value": "intimate",
            "label": "Intimate Club",
            "prompt": "Front-row audience POV of band at intimate club venue: lead guitarist shredding solo, drummer in motion blur, singer engaging crowd, stage lights flaring, sweat details visible, shallow depth-of-field, moody atmospheric lighting, close audience connection, energetic 8K realism."
          },
          {
            "value": "music_video",
            "label": "Music Video Set",
            "prompt": "Stylized music video scene with creative cinematography: artistic lighting setups, fog machines, visually striking set design with neon accents. Band performing with dramatic poses, cinematic color grading, professional production quality, high-contrast 8K imagery."
          }
        ]
      },
      {
        "id": "customization",
        "label": "Additional Details (optional)",
        "type": "text",
        "required": false,
        "placeholder": "e.g., playing guitar, 80s glam rock style, leather jackets, acoustic set"
      }
    ]
  }'::jsonb,
  1,
  5,
  10,
  true
);

-- Add DJ style (1 photo only)
INSERT INTO public.styles (
  id, category_id, label, emoji, prompt,
  use_legacy_options, input_schema, min_photos, max_photos, sort_order, is_active
) VALUES (
  'dj',
  'special',
  'DJ / Producer',
  '🎧',
  'Create an ultra-realistic photograph of the person from the provided photo as a professional DJ performing as "{{dj_name}}". {{scene_style}} The person''s face must be clearly recognizable with their exact features preserved. The DJ name "{{dj_name}}" should be prominently visible on LED screens, booth signage, or backdrop visuals. {{customization}} Professional concert photography with dramatic lighting and high production value.',
  false,
  '{
    "fields": [
      {
        "id": "dj_name",
        "label": "DJ / Artist Name",
        "type": "text",
        "required": true,
        "placeholder": "e.g., DJ Nova, The Soundwave"
      },
      {
        "id": "scene_style",
        "label": "Scene",
        "type": "radio",
        "required": true,
        "defaultValue": "festival",
        "options": [
          {
            "value": "festival",
            "label": "Festival Main Stage",
            "prompt": "Ultra-realistic fisheye top-angle shot of DJ behind massive booth with turntables, mixers, giant LED screen displaying visuals, dramatic lighting with lasers and strobe lights sweeping over crowd of thousands, cool streetwear outfit, purple-blue-neon red colors, motion blur on crowd, pyrotechnics, confetti cannons, 8K concert style."
          },
          {
            "value": "club",
            "label": "Nightclub Booth",
            "prompt": "Cinematic DJ portrait behind mixer in premium nightclub under neon pink-blue lights, laser beams cutting through fog, VIP crowd in motion blur behind velvet ropes, glowing LED screens, colorful reflections on skin, bottle service sparklers in background, photorealistic 8K high contrast."
          },
          {
            "value": "warehouse",
            "label": "Underground Rave",
            "prompt": "Moody underground warehouse rave DJ: dark industrial setting with blue-red lights, thick smoke haze from fog machines, massive speaker stacks, metal reflections, low-key contrast, realistic spotlight on face, cyberpunk tone, crowd hands raised, cinematic 4K depth, raw rave energy."
          }
        ]
      },
      {
        "id": "customization",
        "label": "Additional Details (optional)",
        "type": "text",
        "required": false,
        "placeholder": "e.g., wearing headphones around neck, hands on mixer, dramatic pose"
      }
    ]
  }'::jsonb,
  1,
  1,
  11,
  true
);
