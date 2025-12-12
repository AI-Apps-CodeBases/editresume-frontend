-- Migration: Add importance field (0-5 stars) to job_descriptions table
-- Replaces important_emoji field with star-based importance rating

-- Add importance column if it doesn't exist
ALTER TABLE job_descriptions ADD COLUMN IF NOT EXISTS importance INTEGER DEFAULT 0;

-- Note: important_emoji column is kept for backward compatibility but should not be used
-- You can drop it later with: ALTER TABLE job_descriptions DROP COLUMN IF EXISTS important_emoji;

