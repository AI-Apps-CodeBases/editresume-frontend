-- Add LinkedIn integration fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS linkedin_token TEXT,
ADD COLUMN IF NOT EXISTS linkedin_profile_url VARCHAR(255),
ADD COLUMN IF NOT EXISTS linkedin_id VARCHAR(255);

-- Create index on linkedin_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_linkedin_id ON users(linkedin_id) WHERE linkedin_id IS NOT NULL;

