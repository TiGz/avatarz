-- Move "special" category to the first position in the UI
UPDATE public.style_categories
SET sort_order = 0
WHERE id = 'special';
