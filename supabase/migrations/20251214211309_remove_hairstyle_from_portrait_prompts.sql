-- Remove specific hairstyle references from portrait prompts
-- Users should keep their natural hair

-- Cyberpunk Rain: remove "sharp bob haircut and", add "hairstyle" to preserved features
UPDATE public.styles
SET prompt = 'Transform the person in the photo into a stunning high-contrast portrait standing in a rainy cyberpunk alleyway. Maintain their exact facial features, gender, hairstyle, and likeness. Style them in a reflective black vinyl trench coat with the collar popped up. Position them looking over their shoulder with an intense gaze. Create dramatic split-tone lighting: harsh neon blue light hitting the left side of their face, deep magenta neon highlighting the rim of their hair, with the center of the face in moody shadow. Background: bokeh blur of wet pavement and city lights. Cinematic, hyper-realistic, 8k resolution, aspect ratio 3:4.'
WHERE id = 'portrait-cyberpunk-rain';

-- Palm Leaf Shadows: remove "wild curly hair (or natural texture)", add "hairstyle" to preserved features
UPDATE public.styles
SET prompt = 'Transform the person in the photo into a stunning close-up portrait. Maintain their exact facial features, gender, hairstyle, and likeness. Show them wearing a simple white tank top, leaning against a wall under afternoon sun. Create lighting filtering through palm tree leaves, casting sharp high-contrast shadows of fronds across their face and chest. One eye illuminated by golden light patch, the other hidden in leaf shadow. Background: deep shadowed terracotta wall. Cinematic, vibrant colors, sharp focus, sun-drenched aesthetic. Aspect ratio 3:4.'
WHERE id = 'portrait-palm-shadows';
