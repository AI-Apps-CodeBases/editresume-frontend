-- Migration to add easy_apply_url column to job_descriptions table
ALTER TABLE job_descriptions ADD COLUMN IF NOT EXISTS easy_apply_url TEXT;

