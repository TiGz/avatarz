-- Add photo requirements, dynamic schema, and legacy options flag to styles
ALTER TABLE styles
ADD COLUMN input_schema JSONB,
ADD COLUMN min_photos INTEGER NOT NULL DEFAULT 1 CHECK (min_photos >= 1 AND min_photos <= 6),
ADD COLUMN max_photos INTEGER NOT NULL DEFAULT 1 CHECK (max_photos >= 1 AND max_photos <= 6),
ADD COLUMN use_legacy_options BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE styles ADD CONSTRAINT photos_range CHECK (min_photos <= max_photos);

-- Store photo IDs as array and input values on generations
ALTER TABLE generations
ADD COLUMN photo_ids UUID[],
ADD COLUMN input_values JSONB;
