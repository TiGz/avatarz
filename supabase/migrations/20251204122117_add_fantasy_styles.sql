-- ============================================================================
-- ADD FANTASY STYLES
-- Expand the fantasy category with 20 new styles based on Gemini Pro 3/Nano Banana Pro research
-- Source: prompt-ideas/fantasy-research.md and web research
-- ============================================================================

-- ============================================================================
-- MEDIEVAL FANTASY (4 styles)
-- ============================================================================

INSERT INTO public.styles (id, category_id, label, emoji, prompt, sort_order, is_active)
VALUES
  ('medieval-knight', 'fantasy', 'Medieval Knight', E'\u2694\uFE0F',
   'Transform into a noble medieval knight in gleaming silver plate armor with intricate engravings. Holding a legendary sword with ornate crossguard. Background: misty castle courtyard at dawn. Dramatic lighting with golden hour glow. Battle-worn but heroic, determined expression. Chain mail visible at joints. Keep facial features recognizable. Hyper-realistic, cinematic, 8K quality.',
   5, true),

  ('dark-ruler', 'fantasy', 'Dark Ruler', E'\U0001F451',
   'Transform into a dark fantasy ruler sitting on an ancient stone throne wearing a black crystal crown. Surrounded by mystical fog and glowing embers. Dark atmospheric lighting with deep shadows and dramatic highlights. Gothic medieval aesthetic, regal pose. Keep facial features recognizable. Hyper-realistic, cinematic, 4K quality.',
   6, true),

  ('ice-warrior', 'fantasy', 'Ice Warrior', E'\u2744\uFE0F',
   'Transform into an ice warrior holding a frozen crystal sword. Snow floating in the air. Frost on hair and clothes. Background: icy mountain storm. Bright icy blue and white lighting, ultra realistic facial texture and cinematic atmosphere. Keep facial features recognizable. Hyper-realistic, 8K quality.',
   7, true),

  ('dragon-rider', 'fantasy', 'Dragon Rider', E'\U0001F409',
   'Transform into a dragon rider standing beside a massive dragon with glowing scales. Stormy mountain scene with lightning in the sky, fire sparks floating around. Leather armor with dragon motifs, wind-swept hair. Epic cinematic composition, dramatic lighting with orange and blue tones. Keep facial features recognizable. 8K photorealism.',
   8, true);

-- ============================================================================
-- HIGH FANTASY CHARACTERS (5 styles)
-- ============================================================================

INSERT INTO public.styles (id, category_id, label, emoji, prompt, sort_order, is_active)
VALUES
  ('forest-elf', 'fantasy', 'Forest Elf', E'\U0001F9DD',
   'Transform into a mystical forest elf with pointed ears, glowing green eyes, and leaf-designed armor. Background: bioluminescent plants and glowing forest spirits. Soft green and blue ambient light on the face. Keep facial features recognizable with ethereal elven enhancement. Hyper-realistic, 8K quality.',
   9, true),

  ('fire-mage', 'fantasy', 'Fire Mage', E'\U0001F525',
   'Transform into a powerful fire mage casting flames from both hands with sparks flying around. Dark smoky background with orange and red glowing embers. Intense warm lighting on face, dramatic shadows. Hair and clothes moving as if caught in magical wind. Keep facial features recognizable. Hyper-realistic, 4K, cinematic atmosphere.',
   10, true),

  ('mystic-wizard', 'fantasy', 'Mystic Wizard', E'\U0001F9D9',
   'Transform into a wise wizard with long flowing robes adorned with mystical symbols, holding a glowing staff topped with a magical crystal. Swirling magical aura surrounds the figure. Background: cluttered mystical workshop with floating spell books and glowing potions. Warm candlelight, volumetric fog. Keep facial features recognizable. Hyper-realistic detail, 4K.',
   11, true),

  ('shadow-assassin', 'fantasy', 'Shadow Assassin', E'\U0001F5E1\uFE0F',
   'Transform into a shadow assassin with half face hidden in darkness, one eye glowing mysteriously. Wearing a hooded dark cloak. Background: dark foggy alley with dim lantern light. Cinematic noir lighting, deep blacks and subtle highlights. Mysterious and dangerous atmosphere. Keep facial features recognizable. Hyper-realistic, 8K quality.',
   12, true),

  ('dragonborn-paladin', 'fantasy', 'Dragonborn Paladin', E'\U0001F6E1\uFE0F',
   'Transform into a powerful dragonborn paladin clad in gleaming platinum armor with dragon scale accents, holding a massive shield with a dragon emblem. Standing at entrance of ancient temple with glowing blue crystals illuminating the scene. Heroic pose, divine light streaming from above. Keep facial features recognizable. Hyper-realistic, 8K quality.',
   13, true);

-- ============================================================================
-- CELESTIAL & DIVINE (3 styles)
-- ============================================================================

INSERT INTO public.styles (id, category_id, label, emoji, prompt, sort_order, is_active)
VALUES
  ('celestial-angel', 'fantasy', 'Celestial Angel', E'\U0001F47C',
   'Transform into a celestial angel with large soft white wings extending behind. Golden halo floating above head, light shining from above like heaven opening. Dream-like cloud setting with pastel sky. Soft ethereal lighting, white and gold color palette. Keep facial features recognizable with divine enhancement. Hyper-realistic, 8K quality.',
   14, true),

  ('mythical-deity', 'fantasy', 'Mythical Deity', E'\u26A1',
   'Transform into a god-like mythical deity standing above clouds with golden divine energy radiating from body. Lightning strikes in background, sacred glowing symbols and runes floating around. Powerful pose, flowing ethereal robes. Dramatic celestial lighting, epic scale. Keep facial features recognizable. Hyper-realistic portrait, 8K, cinematic atmosphere.',
   15, true),

  ('cosmic-sorcerer', 'fantasy', 'Cosmic Sorcerer', E'\U0001F30C',
   'Transform into a cosmic being floating in space with galaxies and nebula swirling around and emerging from body. Stars and cosmic dust particles surrounding the figure. Deep space background with purple, blue, and pink nebula clouds. Ethereal glow, mystical energy. Body partially translucent showing universe within. Keep facial features recognizable. Hyper-realistic, 8K quality.',
   16, true);

-- ============================================================================
-- DARK FANTASY (4 styles)
-- ============================================================================

INSERT INTO public.styles (id, category_id, label, emoji, prompt, sort_order, is_active)
VALUES
  ('vampire-noble', 'fantasy', 'Vampire Noble', E'\U0001F9DB',
   'Transform into a regal vampire noble with pale porcelain skin and piercing crimson eyes. Gothic Victorian attire with black and deep red velvet, ornate silver jewelry. Background: gothic castle with moonlight streaming through tall windows. Dramatic chiaroscuro lighting, deep shadows and highlights. Aristocratic pose, mysterious atmosphere. Keep facial features recognizable. Hyper-realistic, 4K quality.',
   17, true),

  ('werewolf-alpha', 'fantasy', 'Werewolf Alpha', E'\U0001F43A',
   'Transform into a fierce werewolf with glowing amber eyes, partial transformation showing both human and wolf features. Full moon in background illuminating the scene. Dark forest setting with mist. Fur texture on face and hands, fangs visible. Dramatic moonlight, deep shadows. Powerful and intimidating presence. Keep facial features recognizable. Hyper-realistic, 8K quality.',
   18, true),

  ('necromancer', 'fantasy', 'Necromancer', E'\U0001F480',
   'Transform into a mysterious necromancer with pale skin, wearing tattered dark robes adorned with bone ornaments, holding a staff topped with a glowing green crystal. Dark foggy graveyard background with ethereal spirit wisps floating around. Eerie green and purple lighting, mystical atmosphere. Keep facial features recognizable. Hyper-realistic, 4K quality.',
   19, true),

  ('phoenix-guardian', 'fantasy', 'Phoenix Guardian', E'\U0001F985',
   'Transform into a phoenix guardian surrounded by flames and glowing embers. Majestic fiery wings with orange, red, and gold feathers extending behind. Rising from ashes effect with dramatic backlighting. Intense warm glow, sparks and flame particles floating around. Powerful stance, determined expression. Keep facial features recognizable. Hyper-realistic, cinematic, 8K quality.',
   20, true);

-- ============================================================================
-- MYTHICAL CREATURES (4 styles)
-- ============================================================================

INSERT INTO public.styles (id, category_id, label, emoji, prompt, sort_order, is_active)
VALUES
  ('ocean-mermaid', 'fantasy', 'Ocean Mermaid', E'\U0001F9DC',
   'Transform into an ocean mermaid with iridescent scales in shades of turquoise, purple, and silver. Long flowing hair with seaweed and pearl ornaments. Background: underwater scene with coral reefs, rays of sunlight penetrating water, bubbles floating around. Ethereal underwater lighting, bioluminescent accents. Art Nouveau flowing aesthetic. Keep facial features recognizable. Hyper-realistic, 8K quality.',
   21, true),

  ('fairy-of-light', 'fantasy', 'Fairy of Light', E'\U0001F9DA',
   'Transform into a magical fairy with glowing transparent wings that shimmer with rainbow iridescence. Dreamlike enchanted forest setting with floating light particles and fireflies. Soft pastel colors, ethereal glow, magical sparkles around the figure. Delicate features, flower crown. Keep facial features recognizable with fantasy enhancement. Hyper-realistic, 4K quality.',
   22, true),

  ('dark-genie', 'fantasy', 'Dark Genie', E'\U0001F9DE',
   'Transform into a dark fantasy portrait with an antique brass oil lamp held close to chest. Face shows awe as golden-blue magical smoke bursts out forming a massive genie silhouette above. The genie has a glowing face and powerful torso made of swirling luminous smoke. Intense warm glow from the lamp on face and hands, deep cool blue shadows. Keep facial features recognizable. Cinematic, ultra-detailed, 4K photorealism.',
   23, true),

  ('steampunk-inventor', 'fantasy', 'Steampunk Inventor', E'\u2699\uFE0F',
   'Transform into a steampunk inventor wearing Victorian-era clothing with brass goggles, leather vest with metal gear embellishments, mechanical arm augmentation. Background: workshop filled with brass machinery, steam vents, and glowing blue energy cores. Warm amber lighting from oil lamps, brass and copper tones. Keep facial features recognizable. Hyper-realistic with industrial fantasy aesthetic, 4K quality.',
   24, true);
