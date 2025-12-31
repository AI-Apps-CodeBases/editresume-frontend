-- Migration: Add premium_purchased_at column to users table
-- This tracks when a user actually purchased their premium membership

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS premium_purchased_at TIMESTAMP NULL;

-- Create index for faster queries on purchase dates
CREATE INDEX IF NOT EXISTS idx_users_premium_purchased_at ON users(premium_purchased_at);

-- For existing premium users, set premium_purchased_at to created_at as a fallback
-- This ensures we have some date for historical data
UPDATE users 
SET premium_purchased_at = created_at 
WHERE is_premium = true AND premium_purchased_at IS NULL;

