-- ============================================================================
-- STYLE CATEGORIES AND STYLES TABLES
-- Move styles from hard-coded Edge Function arrays to database tables
-- ============================================================================

-- ============================================================================
-- STYLE CATEGORIES TABLE
-- ============================================================================

CREATE TABLE public.style_categories (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  emoji TEXT NOT NULL,
  description TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.style_categories ENABLE ROW LEVEL SECURITY;

-- Public read access for active categories (needed by Edge Function)
CREATE POLICY "Anyone can view active categories"
ON public.style_categories FOR SELECT
USING (is_active = true);

-- ============================================================================
-- STYLES TABLE
-- ============================================================================

CREATE TABLE public.styles (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES public.style_categories(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  emoji TEXT NOT NULL,
  prompt TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_styles_category ON public.styles(category_id);
CREATE INDEX idx_styles_active ON public.styles(is_active) WHERE is_active = true;

ALTER TABLE public.styles ENABLE ROW LEVEL SECURITY;

-- Public read access for active styles (needed by Edge Function)
CREATE POLICY "Anyone can view active styles"
ON public.styles FOR SELECT
USING (is_active = true);

-- ============================================================================
-- SEED CATEGORIES
-- ============================================================================

INSERT INTO public.style_categories (id, label, emoji, description, sort_order) VALUES
  ('animated', 'Animated', '🎬', 'Cartoons, anime, and 3D characters', 1),
  ('artistic', 'Artistic', '🎨', 'Hand-drawn and painterly styles', 2),
  ('professional', 'Professional', '💼', 'Business and corporate looks', 3),
  ('nostalgic', 'Nostalgic', '📻', 'Retro and vintage aesthetics', 4),
  ('fantasy', 'Fantasy', '🔮', 'Magical and otherworldly', 5),
  ('fun', 'Fun & Unique', '🎁', 'Playful and creative styles', 6),
  ('custom', 'Custom', '✨', 'Write your own prompt', 99);

-- ============================================================================
-- SEED STYLES (existing 14 styles from Edge Function)
-- ============================================================================

-- Animated Category
INSERT INTO public.styles (id, category_id, label, emoji, prompt, sort_order) VALUES
  ('ghibli', 'animated', 'Studio Ghibli', '🌸',
   'Transform into a Studio Ghibli-inspired anime character. Style: hand-painted watercolor aesthetic with soft cel-shading. Keep the face recognizable but with large emotional anime eyes, wind-swept hair with individual strands visible. Soft natural lighting with a dreamy atmosphere.',
   1),
  ('3d-pixar', 'animated', '3D Animated', '🎬',
   'Transform into a cinematic 3D animated movie character like Pixar or DreamWorks style. High-quality CGI with oversized expressive eyes, smooth skin textures, soft volumetric lighting. Keep the face recognizable. Vibrant gradient background.',
   2),
  ('cartoon', 'animated', 'Cartoon', '🎨',
   'Transform into a vibrant cartoon character with bold outlines, exaggerated features, and bright flat colors. Keep the face recognizable but stylized with simplified shapes. Clean vector-art style with dynamic pose.',
   3),
  ('anime', 'animated', 'Anime', '⚔️',
   'Transform into a modern anime character with sharp features, dramatic shading, and vibrant colors. Large expressive eyes, detailed hair with highlights. Keep facial features recognizable. Dynamic anime lighting with rim lights.',
   4);

-- Artistic Category
INSERT INTO public.styles (id, category_id, label, emoji, prompt, sort_order) VALUES
  ('watercolor', 'artistic', 'Watercolor', '🖌️',
   'Transform into a beautiful watercolor painting with soft edges, visible brush strokes, and gentle color bleeds. Keep the face recognizable with delicate features. Artistic splashes and drips around the edges. Fine art portrait style.',
   1),
  ('oil-painting', 'artistic', 'Oil Painting', '🖼️',
   'Transform into a classical oil painting portrait in the style of Dutch masters. Rich colors, dramatic chiaroscuro lighting, visible brush strokes with impasto technique. Keep the face recognizable. Museum-quality fine art aesthetic.',
   2),
  ('pop-art', 'artistic', 'Pop Art', '💥',
   'Transform into bold pop art in the style of Andy Warhol and Roy Lichtenstein. Bright primary colors, halftone dot patterns, thick black outlines. Keep the face recognizable but highly stylized. Comic book aesthetic with Ben-Day dots.',
   3);

-- Professional Category
INSERT INTO public.styles (id, category_id, label, emoji, prompt, sort_order) VALUES
  ('realistic', 'professional', 'Enhanced Photo', '📸',
   'Enhance this photo with professional studio lighting, subtle skin retouching, and cinematic color grading. Keep the person looking natural but elevated - like a high-end magazine portrait. Soft bokeh background.',
   1);

-- Nostalgic Category
INSERT INTO public.styles (id, category_id, label, emoji, prompt, sort_order) VALUES
  ('vintage', 'nostalgic', 'Vintage Photo', '📻',
   'Transform into a vintage photograph from the 1950s-60s. Sepia or faded color tones, film grain, soft focus, and nostalgic lighting. Keep the face recognizable. Classic portrait photography aesthetic with period-appropriate styling.',
   1);

-- Fantasy Category
INSERT INTO public.styles (id, category_id, label, emoji, prompt, sort_order) VALUES
  ('fantasy', 'fantasy', 'Fantasy Hero', '🧙',
   'Transform into an epic fantasy character - a hero from a magical realm. Keep the face recognizable but add fantasy elements like ethereal lighting, magical aura, or subtle fantasy attire hints. Dramatic cinematic lighting with a mystical atmosphere.',
   1),
  ('cyberpunk', 'fantasy', 'Cyberpunk', '🤖',
   'Transform into a cyberpunk character with neon accents, holographic elements, and futuristic tech accessories. Dramatic teal and orange rim lighting. Keep the face recognizable but add subtle cyber enhancements. Rainy neon-lit city background.',
   2);

-- Fun Category
INSERT INTO public.styles (id, category_id, label, emoji, prompt, sort_order) VALUES
  ('pixel-art', 'fun', 'Pixel Art', '👾',
   'Transform into a detailed pixel art portrait in 32-bit retro game style. Visible pixels with careful dithering for shading. Keep facial features recognizable within the pixel constraints. Retro game aesthetic with limited color palette.',
   1),
  ('figurine', 'fun', 'Collectible Figure', '🎁',
   'Transform into a 3D collectible figurine with an oversized head, simplified but recognizable facial features, and a cute stylized look. Modern designer toy aesthetic. Show as if displayed on a shelf or in collectible box packaging.',
   2),
  ('storybook', 'fun', 'Children''s Book', '📚',
   'Transform into a cute illustrated character for a children''s book. Keep the face recognizable but soften all features into a friendly, approachable illustrated style. Hand-drawn aesthetic with soft colors, whimsical details like stars or clouds.',
   3);
