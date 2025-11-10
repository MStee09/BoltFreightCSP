/*
  # Fix user_invitations foreign key constraint

  1. Problem
    - invited_by column references auth.users(id)
    - When users try to update invitations, PostgreSQL checks this FK constraint
    - Regular users don't have SELECT permission on auth.users
    - This causes "permission denied for table users" error

  2. Solution
    - Drop the foreign key constraint to auth.users
    - Add a new foreign key constraint to user_profiles instead
    - This is safe because user_profiles.id is the same as auth.users.id

  3. Security
    - Maintains referential integrity
    - Uses table that has proper RLS policies
*/

-- First, check if the constraint exists and drop it
DO $$ 
BEGIN
  -- Drop the constraint if it exists
  IF EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'user_invitations_invited_by_fkey'
  ) THEN
    ALTER TABLE user_invitations 
    DROP CONSTRAINT user_invitations_invited_by_fkey;
  END IF;
END $$;

-- Add new foreign key constraint to user_profiles instead
ALTER TABLE user_invitations
ADD CONSTRAINT user_invitations_invited_by_fkey
FOREIGN KEY (invited_by) 
REFERENCES user_profiles(id) 
ON DELETE SET NULL;
