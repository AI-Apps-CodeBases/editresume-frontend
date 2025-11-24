-- Migration: Add job_type and work_type columns to job_descriptions table
-- Run this SQL to add the new columns

ALTER TABLE job_descriptions 
ADD COLUMN IF NOT EXISTS job_type VARCHAR,
ADD COLUMN IF NOT EXISTS work_type VARCHAR;


