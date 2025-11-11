/*
  # Add Gmail Polling Settings
  
  Adds fields to track last email check time and polling preferences for simple reply detection.
  
  ## Changes
  - Add `last_history_id` to user_gmail_tokens for incremental sync
  - Add `last_checked_at` to track when we last polled for new emails
  - Add `polling_enabled` to allow users to enable/disable polling
  
  ## Notes
  - Uses Gmail History API for efficient incremental syncing
  - Polling will check for new messages every 5 minutes when enabled
*/

-- Add polling fields to user_gmail_tokens
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_gmail_tokens' AND column_name = 'last_history_id'
  ) THEN
    ALTER TABLE user_gmail_tokens ADD COLUMN last_history_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_gmail_tokens' AND column_name = 'last_checked_at'
  ) THEN
    ALTER TABLE user_gmail_tokens ADD COLUMN last_checked_at timestamptz DEFAULT now();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_gmail_tokens' AND column_name = 'polling_enabled'
  ) THEN
    ALTER TABLE user_gmail_tokens ADD COLUMN polling_enabled boolean DEFAULT true;
  END IF;
END $$;
