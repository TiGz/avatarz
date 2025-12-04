-- Move styles to photoshoot category
UPDATE public.styles SET category_id = 'photoshoot', sort_order = 3 WHERE id = 'kodak-portra';
UPDATE public.styles SET category_id = 'photoshoot', sort_order = 4 WHERE id = 'magazine-cover';
UPDATE public.styles SET category_id = 'photoshoot', sort_order = 5 WHERE id = 'glamour-photoshoot';
