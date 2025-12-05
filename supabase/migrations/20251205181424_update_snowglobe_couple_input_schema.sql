-- Update snowglobe-couple with extended input schema including radio options with prompt fragments
UPDATE public.styles
SET
  prompt = 'Create a magical Christmas snowglobe scene featuring the two people from the provided photos {{vibe}} inside the globe. Style them as detailed 3D figures {{outfit}}. The snowglobe sits on an ornate golden base with "{{base_text}}" engraved. Inside: falling snow, tiny Christmas trees, warm golden lights. Background: soft bokeh Christmas lights. Photorealistic glass globe with realistic light refraction. Preserve both faces with recognizable features.',
  input_schema = '{
    "fields": [
      {
        "id": "base_text",
        "label": "Globe Base Text",
        "type": "text",
        "required": false,
        "defaultValue": "Merry Christmas",
        "placeholder": "Text engraved on the globe base"
      },
      {
        "id": "outfit",
        "label": "Outfits",
        "type": "radio",
        "required": true,
        "defaultValue": "normal",
        "options": [
          {"value": "normal", "label": "Cozy Winter Clothes", "prompt": "dressed in cozy winter attire (sweaters, scarves)"},
          {"value": "festive", "label": "Festive Costumes", "prompt": "dressed as Santa and an Elf in full festive Christmas costumes"}
        ]
      },
      {
        "id": "vibe",
        "label": "Relationship",
        "type": "radio",
        "required": true,
        "defaultValue": "romantic",
        "options": [
          {"value": "romantic", "label": "Romantic Couple", "prompt": "as a romantic couple embracing or holding hands"},
          {"value": "friends", "label": "Best Friends", "prompt": "as best friends standing together with arms around each other''s shoulders"}
        ]
      }
    ]
  }'::jsonb
WHERE id = 'snowglobe-couple';
