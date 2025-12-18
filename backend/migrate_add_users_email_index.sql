-- Add index on users.email for faster user lookups
-- This is critical for performance when querying users by email in list_user_resumes and list_user_job_descriptions

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

