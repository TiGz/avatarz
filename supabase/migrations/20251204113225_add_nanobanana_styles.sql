-- Add new styles from Awesome Nano Banana Pro curated prompts
-- Source: prompt-ideas/awesome-nanobanana.md

-- 1. Add new photoshoot category
INSERT INTO public.style_categories (id, label, emoji, description, sort_order, is_active)
VALUES ('photoshoot', 'Photoshoot', '📷', 'Professional photography styles', 7, true);

-- 2. Add styles to existing categories

-- Nostalgic category (5 new styles)
INSERT INTO public.styles (id, category_id, label, emoji, prompt, sort_order, is_active)
VALUES
  ('2000s-mirror-selfie', 'nostalgic', '2000s Mirror Selfie', '📱',
   'Transform into a 2000s mirror selfie photo. Style: early digital camera aesthetic with harsh flash creating bright blown-out highlights. Setting: nostalgic 2000s bedroom with pastel walls, chunky wooden dresser, CD player, and cluttered vanity. Keep facial features recognizable. Subtle grain, retro highlights, crisp details with soft shadows.',
   6, true),

  ('1990s-film-portrait', 'nostalgic', '90s Film Portrait', '📸',
   'Transform into a 1990s film portrait captured with a direct front flash. Style: 35mm lens flash creating a nostalgic glow, porcelain-lit skin. Keep facial features recognizable with messy hair tied up and calm yet playful expression. Background: dark wall covered with aesthetic magazine posters and stickers, evoking a cozy bedroom atmosphere under dim lighting.',
   7, true),

  ('kodak-portra', 'nostalgic', 'Kodak Portra 400', '🎞️',
   'Transform into a cinematic portrait shot on Kodak Portra 400 film. Setting: urban coffee shop window at golden hour sunset. Style: subtle film grain, soft focus, dreamy storytelling vibe. Warm nostalgic lighting hitting the side of the face. Keep facial features recognizable with relaxed candid expression. High quality depth of field with bokeh background of city lights.',
   8, true),

  ('disposable-camera', 'nostalgic', 'Disposable Camera', '📷',
   'Transform into a snapshot taken with a low-quality disposable camera. Style: clumsy photo aesthetic like those taken by a Japanese high school student. Slightly off-center framing, flash visible in reflective surfaces, characteristic disposable camera color tones. Keep facial features recognizable. Aspect ratio 3:2.',
   9, true),

  ('compact-digicam', 'nostalgic', 'Compact Digicam', '📹',
   'Transform into a photo displayed on the screen of a compact Canon digital camera. The camera body surrounds the image with buttons, dials, and textured surface visible. Photo shows flash illumination creating sharp highlights. Keep facial features recognizable. Mood: candid, raw, nostalgic early 2000s digital camera snapshot. Colors slightly muted with cool undertones, strong flash contrast, natural grain from display.',
   10, true);

-- Professional category (3 new styles)
INSERT INTO public.styles (id, category_id, label, emoji, prompt, sort_order, is_active)
VALUES
  ('silicon-valley-headshot', 'professional', 'Silicon Valley Headshot', '👔',
   'Transform into a professional Silicon Valley style headshot. Keep facial features exactly consistent. Dress in a professional navy blue business suit with white shirt. Background: clean solid dark gray studio backdrop with subtle gradient vignette. Shot on Sony A7III with 85mm f/1.4 lens. Classic three-point lighting with soft defining shadows. Natural skin texture with visible pores, not airbrushed. Natural catchlights in eyes. Ultra-realistic 8K professional headshot.',
   4, true),

  ('magazine-cover', 'professional', 'Magazine Cover', '📰',
   'Transform into a glossy magazine cover portrait. Dynamic pose with high-end fashion styling. Clean serif font magazine title above. Professional studio lighting, strong contrast, dramatic shadows. Keep facial features recognizable. Cinematic color grading, 8K UHD, professional photography.',
   5, true),

  ('glamour-photoshoot', 'professional', 'Glamour Photoshoot', '✨',
   'Transform into a glamorous backstage photoshoot portrait. Style: luxury fashion aesthetic with elegance and glamour. Darkly lit room with flash from camera emphasizing shine and texture. Keep facial features 100% accurate and recognizable. Expressive gaze with luxurious styling. Very detailed, professional fashion photography lighting.',
   6, true);

-- Artistic category (2 new styles)
INSERT INTO public.styles (id, category_id, label, emoji, prompt, sort_order, is_active)
VALUES
  ('museum-oil-painting', 'artistic', 'Museum Oil Painting', '🖼️',
   'Transform into a museum exhibition portrait. You are posing inside a high-end museum space. Behind you hangs a large ornate framed classical oil painting depicting yourself in traditional oil painting style with thick visible impasto brushstrokes, deep textures, and rich color palettes on canvas. Gallery spotlights hit the textured paint surface. Keep facial features recognizable in both the photo and painting. Masterpiece quality, ultra-detailed, cinematic lighting, 8K UHD.',
   7, true),

  ('torn-paper-art', 'artistic', 'Torn Paper Art', '📄',
   'Transform into a torn paper art portrait. Add widened torn-paper layered effect across the image. Torn areas reveal a monochrome line-art interior on notebook paper with subtle ruled lines. Clean crisp line quality, visible pencil grain. The torn paper edges look natural and organic. Keep facial features and expression fully recognizable. Mixed media artistic effect.',
   8, true);

-- Animated category (1 new style)
INSERT INTO public.styles (id, category_id, label, emoji, prompt, sort_order, is_active)
VALUES
  ('anime-spotlight', 'animated', 'Anime Spotlight', '🔦',
   'Transform into a hyperrealistic anime portrait with dramatic spotlight lighting. Use a narrow beam spotlight focused only on the center of the face with sharp dramatic edges. All areas outside the spotlight fall quickly into deep darkness with high falloff shadow, almost blending into the black background. Not soft lighting. Keep facial features recognizable with mysterious mood. Long dark hair with strands falling over face fading into shadows. Dark clothing disappearing into darkness. High-contrast only in lit portion of face.',
   11, true);

-- Fun category (3 new styles)
INSERT INTO public.styles (id, category_id, label, emoji, prompt, sort_order, is_active)
VALUES
  ('pop-mart-blindbox', 'fun', 'Pop Mart Blind Box', '🎁',
   'Transform into a cute 3D Pop Mart style blind box character. Style: C4D rendering with occlusion render and cute Q-version proportions. Keep key features recognizable including hair color and hairstyle. Soft studio lighting with pastel colors. Simple solid matte background. Smooth plastic toy texture with slight glossy finish. Facing forward with friendly expression.',
   9, true),

  ('y2k-scrapbook', 'fun', 'Y2K Scrapbook', '🌸',
   'Transform into a Y2K scrapbook poster collage. Vibrant colorful aesthetic with multiple poses of the same person in cutouts. Heart, star, and butterfly stickers, retro sparkles, polaroid frames, neon outlines, doodle borders. Magazine cutout texts like SO CUTE and VIBES. Keep facial features recognizable across all cutouts. Soft flash lighting, 8K quality, holographic textures, pastel gradients, glitter accents.',
   10, true),

  ('fisheye-selfie', 'fun', 'Fisheye Selfie', '🐟',
   'Transform into a hyper-realistic fisheye wide-angle selfie captured with vintage 35mm fisheye lens. Heavy barrel distortion creating exaggerated close-up effect. Keep facial features recognizable with wild exaggerated expression. Harsh direct on-camera flash creating hard shadows. Authentic film grain, slight motion blur on edges, chromatic aberration. Candid amateur snapshot aesthetic.',
   11, true);

-- Photoshoot category (2 new styles)
INSERT INTO public.styles (id, category_id, label, emoji, prompt, sort_order, is_active)
VALUES
  ('winter-portrait', 'photoshoot', 'Winter Portrait', '❄️',
   'Transform into a winter outdoor portrait. Setting: snowy scene with snow covering the ground, bare trees in background, clear light blue sky. Keep facial features recognizable. Cozy winter styling with hood. Soft depth of field, natural daylight, subtle winter tones. Cute natural outdoor moment atmosphere.',
   1, true),

  ('bathroom-selfie', 'photoshoot', 'Bathroom Selfie', '🪞',
   'Transform into a casual bathroom mirror selfie. iPhone camera quality - good but not studio, realistic social media aesthetic. Regular apartment bathroom with white subway tile walls, basic mirror with good vanity lighting above. Keep facial features recognizable with casual expression. 9:16 vertical aspect ratio. Natural slightly grainy iPhone look, not over-processed.',
   2, true);
