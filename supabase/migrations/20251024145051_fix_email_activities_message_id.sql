/*
  # Fix email_activities message_id constraint

  ## Changes
  - Make `message_id` column nullable for outbound emails
  - Outbound emails don't have a Gmail message_id until after they're sent
  - Keep it unique but allow NULL values

  ## Security
  - No changes to RLS policies
*/

-- Make message_id nullable
ALTER TABLE email_activities 
  ALTER COLUMN message_id DROP NOT NULL;
