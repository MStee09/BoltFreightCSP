/*
  # Fix User Invitations Unique Constraint
  
  ## Problem
  The UNIQUE(email, status) constraint prevents multiple cancelled invitations
  for the same email, which causes errors when trying to cancel invitations.
  
  ## Solution
  1. Drop the problematic UNIQUE(email, status) constraint
  2. Create a partial unique index that only applies to 'pending' invitations
  3. This allows only one pending invitation per email, but unlimited cancelled/expired/accepted invitations
  
  ## Changes
  - Drop `user_invitations_email_status_key` constraint
  - Create partial unique index on (email) WHERE status = 'pending'
*/

-- Drop the existing unique constraint
ALTER TABLE user_invitations 
  DROP CONSTRAINT IF EXISTS user_invitations_email_status_key;

-- Create a partial unique index that only applies to pending invitations
-- This allows only one pending invitation per email, but multiple cancelled/expired/accepted
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_invitations_email_pending 
  ON user_invitations(email) 
  WHERE status = 'pending';