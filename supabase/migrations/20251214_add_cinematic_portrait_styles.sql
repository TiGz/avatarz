-- Add cinematic portrait styles based on high-contrast photography techniques
-- Source: https://imaginewithrashid.com/10-gemini-nano-banana-pro-prompts-for-high-contrast-cinematic-portraits/

-- First, add the "portrait" category
INSERT INTO public.style_categories (id, label, emoji, description, sort_order, is_active)
VALUES ('portrait', 'Portrait', '📸', 'High-contrast cinematic portraits', 9, true)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  emoji = EXCLUDED.emoji,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

-- Add the 10 cinematic portrait styles
INSERT INTO public.styles (id, category_id, label, emoji, prompt, sort_order, is_active, use_legacy_options)
VALUES
  (
    'portrait-cyberpunk-rain',
    'portrait',
    'Cyberpunk Rain',
    '🌧️',
    'Transform the person in the photo into a stunning high-contrast portrait standing in a rainy cyberpunk alleyway. Maintain their exact facial features, gender, and likeness. Style them with a sharp bob haircut and reflective black vinyl trench coat with the collar popped up. Position them looking over their shoulder with an intense gaze. Create dramatic split-tone lighting: harsh neon blue light hitting the left side of their face, deep magenta neon highlighting the rim of their hair, with the center of the face in moody shadow. Background: bokeh blur of wet pavement and city lights. Cinematic, hyper-realistic, 8k resolution, aspect ratio 3:4.',
    1,
    true,
    true
  ),
  (
    'portrait-film-noir',
    'portrait',
    'Film Noir Elegance',
    '🎬',
    'Transform the person in the photo into a stunning cinematic portrait in 1920s style. Maintain their exact facial features, gender, and likeness. Dress them in an elegant evening gown with intricate beadwork (or tuxedo if male). Position them seated on a velvet chair in a pitch-black room. Use snoot lighting: a single focused beam of warm light illuminates only their eyes, nose, and lips, fading rapidly into complete darkness around the neck and hair. Create extreme contrast between illuminated skin and void-like background. Reminiscent of classic film noir. Aspect ratio 3:4.',
    2,
    true,
    true
  ),
  (
    'portrait-urban-architect',
    'portrait',
    'Urban Architect',
    '🏙️',
    'Transform the person in the photo into a stunning portrait of a stylish architect. Maintain their exact facial features, gender, and likeness. Dress them in a dark turtleneck and glasses. Position them in a dimly lit high-rise office at night, looking out at a glowing city skyline with an expression of inspired confidence and peace. Create strong neon highlights (cyan and magenta) from colorful city lights below casting upward onto their face, contrasting heavily with the dark interior. Add subtle reflection in the glass overlaying their face. Cinematic, hopeful, futuristic, urban elegance. Aspect ratio 3:4.',
    3,
    true,
    true
  ),
  (
    'portrait-palm-shadows',
    'portrait',
    'Palm Leaf Shadows',
    '🌴',
    'Transform the person in the photo into a stunning close-up portrait. Maintain their exact facial features, gender, and likeness. Style them with wild curly hair (or natural texture) wearing a simple white tank top, leaning against a wall under afternoon sun. Create lighting filtering through palm tree leaves, casting sharp high-contrast shadows of fronds across their face and chest. One eye illuminated by golden light patch, the other hidden in leaf shadow. Background: deep shadowed terracotta wall. Cinematic, vibrant colors, sharp focus, sun-drenched aesthetic. Aspect ratio 3:4.',
    4,
    true,
    true
  ),
  (
    'portrait-sparkler',
    'portrait',
    'Sparkler Celebration',
    '✨',
    'Transform the person in the photo into a stunning portrait holding a burning sparkler close to their face during a night celebration. Maintain their exact facial features, gender, and likeness. Dress them in a sequined party dress (or festive attire). Background: pitch black, making the sparkler sparks the sole light source. Create warm intense light illuminating their face, revealing sparkling eyes and a soft happy smile, with deep shadows falling rapidly across ears and hair. Extreme but warm and festive contrast. Cinematic, bokeh effect, magical atmosphere. Aspect ratio 3:4.',
    5,
    true,
    true
  ),
  (
    'portrait-jazz-stage',
    'portrait',
    'Jazz Stage',
    '🎤',
    'Transform the person in the photo into a stunning cinematic portrait of a jazz singer on a dark stage. Maintain their exact facial features, gender, and likeness. Dress them in a classic tuxedo (or elegant evening gown) holding a vintage microphone. Capture them mid-song with an expression of pure passion and soulfulness. Create a single crisp spotlight cutting through darkness from above, creating high contrast between illuminated face and clothing versus the black void of the auditorium. Add dust motes dancing in the light shaft. Elegant, classy, triumphant. Aspect ratio 3:4.',
    6,
    true,
    true
  ),
  (
    'portrait-morning-window',
    'portrait',
    'Morning by the Window',
    '☀️',
    'Transform the person in the photo into a stunning portrait sitting by a window with Venetian blinds. Maintain their exact facial features, gender, and likeness. Show them holding a ceramic coffee cup, wearing an oversized cozy knit sweater, looking out the window with a peaceful contented smile. Create morning sun blasting through blinds, casting sharp high-contrast horizontal stripes of bright light and dark shadow across their face and the room. Lit areas nearly overexposed with warmth, shadows rich and deep. Cinematic, cozy, optimistic, morning vibe. Aspect ratio 3:4.',
    7,
    true,
    true
  ),
  (
    'portrait-campfire',
    'portrait',
    'Campfire Stories',
    '🔥',
    'Transform the person in the photo into a stunning cinematic portrait sitting around a campfire at night. Maintain their exact facial features, gender, and likeness. Dress them in plaid flannel shirt and vest. Show them leaning forward, engaged in telling a happy story. Create fire (out of frame below) casting strong warm orange glow up onto their face, highlighting laughter lines and bright eyes. Background: dark cool-toned forest, creating color contrast between warm face and cold dark woods. Friendly, inviting, nostalgic. Aspect ratio 3:4.',
    8,
    true,
    true
  ),
  (
    'portrait-dancing-rain',
    'portrait',
    'Dancing in the Rain',
    '💃',
    'Transform the person in the photo into a stunning portrait of a dancer in a flowing red dress (or elegant suit) spinning in the rain at night under a streetlamp. Maintain their exact facial features, gender, and likeness. Show them looking euphoric, face turned to the sky with a massive smile. Create strong backlight from streetlamp catching every rain droplet, turning them into diamonds against dark night sky. High-contrast rim light around their figure, separating them from dark urban background. Cinematic, freedom, joy, frozen motion. Aspect ratio 3:4.',
    9,
    true,
    true
  ),
  (
    'portrait-fighter-pilot',
    'portrait',
    'Fighter Pilot Confidence',
    '✈️',
    'Transform the person in the photo into a stunning cinematic portrait of a fighter pilot sitting in a cockpit on a runway at sunset. Maintain their exact facial features, gender, and likeness. Show them with oxygen mask off and visor up, giving a thumbs-up and a confident charismatic smile to the ground crew. Create golden hour sun low on horizon, blasting directly into the camera lens to create a haze of golden light washing over the left side of frame. Cockpit interior in deep detailed shadow. Cinematic, heat distortion waves, 35mm film grain. Aspect ratio 3:4.',
    10,
    true,
    true
  );
