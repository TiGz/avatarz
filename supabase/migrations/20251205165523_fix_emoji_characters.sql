-- Fix emoji characters that were stored as text codes
UPDATE style_categories SET emoji = E'\u2728' WHERE id = 'special';
UPDATE styles SET emoji = E'\U0001F52E' WHERE id = 'snowglobe-couple';
UPDATE styles SET emoji = E'\U0001F3AC' WHERE id = 'movie-poster';
UPDATE styles SET emoji = E'\u2744\uFE0F' WHERE id = 'snowglobe-single';
