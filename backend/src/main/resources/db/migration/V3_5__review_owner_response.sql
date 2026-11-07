ALTER TABLE reviews
    ADD COLUMN IF NOT EXISTS owner_response TEXT;

