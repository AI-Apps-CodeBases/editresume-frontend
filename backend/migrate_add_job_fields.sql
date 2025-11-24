-- Migration: Add new fields to job_descriptions table
-- Fields: max_salary, status, follow_up_date, important_emoji, notes

ALTER TABLE job_descriptions ADD COLUMN IF NOT EXISTS max_salary INTEGER;
ALTER TABLE job_descriptions ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'bookmarked';
ALTER TABLE job_descriptions ADD COLUMN IF NOT EXISTS follow_up_date DATETIME;
ALTER TABLE job_descriptions ADD COLUMN IF NOT EXISTS important_emoji VARCHAR(10);
ALTER TABLE job_descriptions ADD COLUMN IF NOT EXISTS notes TEXT;

