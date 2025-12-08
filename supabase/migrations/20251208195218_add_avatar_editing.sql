-- Add columns for avatar editing support
-- thought_signatures: Gemini's encrypted context for multi-turn editing
-- parent_generation_id: Links edits to their parent generation
-- full_prompt: The complete prompt sent to Gemini (for debugging/regeneration)
-- system_prompt: The system instructions used (face preservation, etc.)

ALTER TABLE public.generations
ADD COLUMN thought_signatures JSONB,
ADD COLUMN parent_generation_id UUID REFERENCES public.generations(id) ON DELETE SET NULL,
ADD COLUMN full_prompt TEXT,
ADD COLUMN system_prompt TEXT;
