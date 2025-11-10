/*
  # Fix user invitation update policy to avoid auth.users access

  1. Changes
    - Update the "Users can accept their own invitation" policy to use user_profiles instead of auth.users
    - This prevents "permission denied for table users" errors
  
  2. Security
    - Maintains the same security: users can only update invitations matching their email
    - Uses user_profiles table which has proper RLS policies
    - Admins can still update any invitation via the admin policy
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can accept their own invitation" ON user_invitations;

-- Recreate with user_profiles instead of auth.users
CREATE POLICY "Users can accept their own invitation"
  ON user_invitations
  FOR UPDATE
  TO authenticated
  USING (
    email = (
      SELECT email 
      FROM user_profiles 
      WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    email = (
      SELECT email 
      FROM user_profiles 
      WHERE id = auth.uid()
    )
  );
