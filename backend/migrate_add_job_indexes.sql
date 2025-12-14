-- Add indexes for job_descriptions table to improve query performance
-- These indexes optimize the common query pattern: filter by user_id and order by created_at

CREATE INDEX IF NOT EXISTS idx_job_descriptions_user_id ON job_descriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_job_descriptions_created_at ON job_descriptions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_descriptions_user_created ON job_descriptions(user_id, created_at DESC);

-- Add index for jobs table created_at if missing (for ordering)
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_user_created ON jobs(user_id, created_at DESC);

