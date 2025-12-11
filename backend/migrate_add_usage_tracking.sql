-- Migration: Add usage tracking tables and trial support
-- Run this migration to add AI usage tracking and trial period support

-- Add trial_started_at column to users table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'trial_started_at'
    ) THEN
        ALTER TABLE users ADD COLUMN trial_started_at TIMESTAMP;
    END IF;
END $$;

-- Create ai_usage table
CREATE TABLE IF NOT EXISTS ai_usage (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    session_id VARCHAR(255),
    feature_type VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for ai_usage
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_id ON ai_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_session_id ON ai_usage(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_feature_type ON ai_usage(feature_type);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created_at ON ai_usage(created_at);

-- Create trial_periods table
CREATE TABLE IF NOT EXISTS trial_periods (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id),
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- Create indexes for trial_periods
CREATE INDEX IF NOT EXISTS idx_trial_periods_user_id ON trial_periods(user_id);
CREATE INDEX IF NOT EXISTS idx_trial_periods_expires_at ON trial_periods(expires_at);
CREATE INDEX IF NOT EXISTS idx_trial_periods_is_active ON trial_periods(is_active);

-- Update export_analytics to support session_id for guest users
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'export_analytics' AND column_name = 'session_id'
    ) THEN
        ALTER TABLE export_analytics ADD COLUMN session_id VARCHAR(255);
    END IF;
END $$;

-- Make user_id nullable in export_analytics (for guest users)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'export_analytics' 
        AND column_name = 'user_id' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE export_analytics ALTER COLUMN user_id DROP NOT NULL;
    END IF;
END $$;

-- Create indexes for export_analytics session tracking
CREATE INDEX IF NOT EXISTS idx_export_analytics_session_id ON export_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_export_analytics_created_at ON export_analytics(created_at);

-- Add comment to tables
COMMENT ON TABLE ai_usage IS 'Tracks AI API calls per user or guest session';
COMMENT ON TABLE trial_periods IS 'Tracks 3-day free trial periods for users';
COMMENT ON COLUMN export_analytics.session_id IS 'Session ID for guest users (when user_id is NULL)';

