/*
  # Enable Email Polling by Default for All Users
  
  Makes email reply tracking automatic for all users, controlled by admins.
  
  ## Changes
  - Update existing users to have polling enabled
  - Change default value to true for new users
  
  ## Notes
  - Polling will now be enabled automatically when users connect Gmail
  - Admin can control this system-wide in integrations settings
*/

-- Enable polling for all existing users who have Gmail connected
UPDATE user_gmail_tokens
SET polling_enabled = true
WHERE polling_enabled IS NULL OR polling_enabled = false;

-- The default is already set to true in the previous migration
-- This just ensures all existing records are updated
