-- ============================================================================
-- SURREAL STYLES
-- 10 fun surreal photo prompts from Imagine with Rashid
-- https://imaginewithrashid.com/10-gemini-nano-banana-pro-prompts-for-fun-surreal-photos/
-- ============================================================================

-- Add surreal category
INSERT INTO public.style_categories (id, label, emoji, description, sort_order)
VALUES ('surreal', 'Surreal', '🌀', 'Mind-bending impossible scenes', 7)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  emoji = EXCLUDED.emoji,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  is_active = true;

-- Add surreal styles (use_legacy_options = false since these have complete scene descriptions)
INSERT INTO public.styles (id, category_id, label, emoji, prompt, sort_order, use_legacy_options)
VALUES
  ('fishbowl-swim', 'surreal', 'Swimming in Fishbowl', '🐠',
   'Create a hyper-realistic, surreal image of the person in the attached photo swimming underwater inside a large, crystal-clear glass fishbowl that is sitting on a vintage wooden table. The person is wearing colorful swimwear and snorkeling goggles. They are surrounded by three giant, friendly-looking goldfish who are looking at the person curiously. Light refracts through the water and glass, creating beautiful caustics on the table. 8k resolution, cinematic lighting.',
   1, false),

  ('ice-cream-mountain', 'surreal', 'Ice Cream Mountain', '🍦',
   'Create a fun, whimsical photo showing a tiny version of the person in the attached photo climbing a massive mountain made of three giant scoops of strawberry, vanilla, and mint ice cream. The person is dressed in winter hiking gear. Multi-colored sprinkles are falling from the sky like snow. The background is a bright, candy-colored sky. High detail, macro photography style.',
   2, false),

  ('saturn-surfer', 'surreal', 'Surfing Saturn''s Rings', '🪐',
   'Create a breathtaking surreal photo of the person in the attached photo surfing on the icy, translucent rings of the planet Saturn. The person is balancing on a surfboard made of stardust and looks thrilled. The background is the deep void of space filled with vibrant purple and blue nebulae and distant twinkling stars. Dreamy, sci-fi aesthetic.',
   3, false),

  ('fishing-stars', 'surreal', 'Fishing for Stars', '🌙',
   'Create a whimsical and hyperrealistic tiny version of the person in the attached photo sitting on the edge of a glowing crescent moon that hangs in a starry night sky. The person is holding a fishing rod, but instead of a hook, the line is catching a glowing star. The person is wearing casual night dress. Magical atmosphere with sparkling particles.',
   4, false),

  ('inside-lightbulb', 'surreal', 'Inside a Lightbulb', '💡',
   'Create a creative surreal image of the person in the attached photo trapped inside a large, clear Edison lightbulb. Instead of a filament, the person is standing there holding a glowing orb. The lightbulb is hanging from the ceiling in a dark room, illuminating the person''s face. High contrast, dramatic lighting.',
   5, false),

  ('dandelion-parachute', 'surreal', 'Dandelion Parachute', '🌬️',
   'Create a dynamic surreal photo of the person in the attached photo holding onto the stem of a giant dandelion seed as if it were a parachute, floating away into a blue summer sky. The person looks small, tiny and weightless. Other dandelion seeds are floating around them. Bright and airy feel.',
   6, false),

  ('flower-hair', 'surreal', 'Flower Hair', '🌸',
   'Create an artistic surreal portrait where their hair is transforming into a vibrant bouquet of blooming peonies, roses, and vines. Butterflies are resting on the flowers. The person has a serene expression. The background is a soft, blurred garden green. Fantasy art style, highly detailed textures.',
   7, false),

  ('keyboard-janitor', 'surreal', 'Keyboard Janitor', '⌨️',
   'Create a funny miniature scene of the person in the attached photo dressed as a janitor, scrubbing the ''Enter'' key of a mechanical keyboard. They are using a Q-tip (cotton swab) as a mop. The RGB lights from the keyboard cast a neon glow on their face. The depth of field is shallow, blurring the surrounding keys.',
   8, false),

  ('mushroom-house', 'surreal', 'Mushroom House', '🍄',
   'Create a cozy miniature image of the person in the attached photo sitting on the doorstep of a house carved into the stem of a red spotted mushroom. They are reading a tiny newspaper. Tall blades of grass tower over them like trees. Fireflies are starting to glow in the background. Magical atmosphere.',
   9, false),

  ('pocket-portrait', 'surreal', 'Pocket Portrait', '👖',
   'Create a cute miniature portrait of the person in the attached photo peeking out of the front pocket of a blue denim jacket. They are resting their arms on the stitching of the pocket. The texture of the denim is highly detailed and huge compared to the person. Studio lighting.',
   10, false)

ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  label = EXCLUDED.label,
  emoji = EXCLUDED.emoji,
  prompt = EXCLUDED.prompt,
  sort_order = EXCLUDED.sort_order,
  use_legacy_options = EXCLUDED.use_legacy_options,
  is_active = true;
