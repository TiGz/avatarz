-- ============================================================================
-- ADD CARTOON STYLE VARIATIONS
-- Expands styles with 22 new options from the 23 Cartoon Styles reference
-- (Pixel Art excluded as it already exists)
-- ============================================================================

-- Update existing cartoon style to be more specific
UPDATE public.styles
SET prompt = 'Transform into a vibrant cartoon character with bold black outlines, exaggerated features, and bright flat colors. Keep the face recognizable but stylized with simplified shapes. Clean thick-line vector-art style with smooth curves. Square 1:1 avatar format.'
WHERE id = 'cartoon';

-- ============================================================================
-- ANIMATED CATEGORY - Add vintage and TV animation styles
-- ============================================================================

INSERT INTO public.styles (id, category_id, label, emoji, prompt, sort_order) VALUES
  ('rubber-hose', 'animated', 'Rubber Hose', '📽',
   'Transform into a vintage 1930s rubber hose animation character. Noodle-like limbs without joints, pie-cut eyes, simple rounded body shape. Black and white with heavy film grain, flickering scratches, and vignetted edges. Keep the face recognizable in classic cartoon style.',
   5),
  ('ligne-claire', 'animated', 'Ligne Claire', '✏',
   'Transform into a Clear Line (Ligne Claire) illustration style like Tintin. Precise continuous black outlines of equal width, flat vivid saturated colors without gradient shading. Clean and readable composition. Keep the face recognizable with simple elegant lines.',
   6),
  ('mid-century', 'animated', 'Mid-Century Modern', '🎷',
   'Transform into a Mid-Century Modern UPA style character. Geometric abstraction, off-register color blocks, flat graphic design aesthetic. Retro palette of mustard yellow, teal, and charcoal gray. Keep facial features recognizable but heavily stylized.',
   7),
  ('adult-sitcom', 'animated', 'Adult Sitcom', '📺',
   'Transform into a modern adult animated sitcom character style. Loose slightly crude hand-drawn linework, flat coloring, exaggerated facial features. Simple but expressive character design. Keep the face recognizable with sitcom animation aesthetic.',
   8),
  ('saturday-morning', 'animated', 'Saturday Morning', '⭐',
   'Transform into an 80s Saturday morning cartoon hero. Heavy black shadows, cel-shaded coloring, vibrant saturated colors. Slightly low-budget hand-drawn animation look with dynamic pose. Keep facial features recognizable.',
   9),
  ('thick-line-vector', 'animated', 'Bold Vector', '🔷',
   'Transform into a thick-line vector art illustration. Very bold distinct black outlines with smooth clean vector curves. Bright flat colors with minimal shading. Style resembling high-quality flash animation or sticker art. Keep facial features recognizable.',
   10);

-- ============================================================================
-- NOSTALGIC CATEGORY - Add retro media styles
-- ============================================================================

INSERT INTO public.styles (id, category_id, label, emoji, prompt, sort_order) VALUES
  ('retro-90s-anime', 'nostalgic', 'Retro 90s Anime', '📼',
   'Transform into a retro 90s anime screenshot. VHS film grain effect, hand-painted textures, distinct high-contrast white highlights on hair and eyes. Muted color palette with nostalgic feel. Keep facial features recognizable in classic anime style.',
   2),
  ('synthwave', 'nostalgic', 'Synthwave', '🌃',
   'Transform into a Synthwave style portrait. Neon magenta, cyan, and deep purple color palette. Glowing vector lines against dark background. Reflective elements and retro-futuristic aesthetic. Keep the face recognizable with neon glow accents.',
   3),
  ('linocut', 'nostalgic', 'Linocut Print', '🖨',
   'Transform into a Linocut woodblock print illustration. High contrast black and white, white lines carved from black ink background. Stamped rough organic texture. Keep facial features recognizable in bold graphic style.',
   4),
  ('low-poly', 'nostalgic', 'Low Poly', '🔺',
   'Transform into a low poly 3D style portrait. Made of visible geometric polygons with sharp edges and no smoothing. Pixelated texture mapping mimicking late 90s video game graphics. Keep facial features recognizable within the angular polygon constraints.',
   5);

-- ============================================================================
-- ARTISTIC CATEGORY - Add craft and illustration styles
-- ============================================================================

INSERT INTO public.styles (id, category_id, label, emoji, prompt, sort_order) VALUES
  ('paper-cutout', 'artistic', 'Paper Cut-Out', '✂',
   'Transform into a paper cut-out style illustration. All elements look like layered construction paper with visible scissor-cut edges and drop shadows between layers. Vibrant colors with crafty handmade aesthetic. Keep facial features recognizable.',
   4),
  ('watercolor-storybook', 'artistic', 'Storybook Watercolor', '📖',
   'Transform into a whimsical watercolor storybook illustration. Soft painterly edges, gentle ink wash outlines, pastel color palette. Visible cold-press paper texture. Keep facial features recognizable with gentle charming style.',
   5),
  ('sketch-doodle', 'artistic', 'Pen Doodle', '🖊',
   'Transform into a rough ballpoint pen doodle on notebook paper. Messy scribbly linework, monochromatic blue ink style. Casual sketch aesthetic like a talented student drawing. Keep facial features recognizable in loose sketch style.',
   6);

-- ============================================================================
-- FUN CATEGORY - Add playful 3D and cute styles
-- ============================================================================

INSERT INTO public.styles (id, category_id, label, emoji, prompt, sort_order) VALUES
  ('chibi', 'fun', 'Chibi', '🍡',
   'Transform into a Chibi anime character. Super-deformed proportions with oversized head, huge sparkling eyes, tiny body and limbs. Bright cel-shaded coloring with extreme kawaii sticker aesthetic. Keep facial features recognizable but super cute.',
   4),
  ('vinyl-toy', 'fun', 'Vinyl Toy', '🧸',
   'Transform into a 3D collectible vinyl toy figure. Smooth glossy plastic surface with rounded edges. Simple paint applications, modern designer toy aesthetic. Stylized but recognizable features against pastel studio background.',
   5),
  ('claymation', 'fun', 'Claymation', '🎭',
   'Transform into a stop-motion claymation character. Texture like real plasticine with visible thumbprints and imperfections. Soft cinematic lighting mimicking miniature studio set. Keep facial features recognizable in charming clay style.',
   6),
  ('voxel', 'fun', 'Voxel Art', '🧊',
   'Transform into a voxel art portrait. Constructed entirely from tiny 3D cubes. Isometric view, vibrant colors, digital LEGO-like aesthetic. Keep facial features recognizable within the blocky cube constraints.',
   7),
  ('corporate-memphis', 'fun', 'Corporate Memphis', '🏢',
   'Transform into a Corporate Memphis flat design illustration. Abstract proportions with simplified features, non-realistic skin tones like blue or purple. Flat geometric joyful aesthetic with no outlines. Keep facial features recognizable but heavily abstracted.',
   8);

-- ============================================================================
-- PROFESSIONAL CATEGORY - Add editorial and CGI styles
-- ============================================================================

INSERT INTO public.styles (id, category_id, label, emoji, prompt, sort_order) VALUES
  ('editorial-caricature', 'professional', 'Editorial Caricature', '📰',
   'Transform into a satirical editorial caricature style. Cross-hatching ink technique typical of political newspaper cartoons. Exaggerated but recognizable features. Clean white background with traditional illustration style.',
   2),
  ('high-fidelity-cgi', 'professional', 'High-Fidelity CGI', '🤖',
   'Transform into a high-fidelity 3D CGI render. Hyper-realistic textures with subtle imperfections. Subsurface scattering on skin, soft cinematic lighting with shallow depth of field. Keep facial features recognizable with photorealistic 3D quality.',
   3);

-- ============================================================================
-- FANTASY CATEGORY - Add mecha and manga styles
-- ============================================================================

INSERT INTO public.styles (id, category_id, label, emoji, prompt, sort_order) VALUES
  ('mecha-anime', 'fantasy', 'Mecha Anime', '🦾',
   'Transform into a detailed Mecha sci-fi anime portrait. Intricate mechanical details like hydraulic elements, metallic shading. Glowing neon accents, lens flares, futuristic high-tech anime look. Keep facial features recognizable with cybernetic enhancements.',
   3),
  ('monochrome-manga', 'fantasy', 'Manga Panel', '⬛',
   'Transform into a monochrome manga panel style. Strictly black and white ink with screen-tone dots for shading and gradients. Dramatic speed lines in background conveying intense energy. Keep facial features recognizable in manga illustration style.',
   4);
