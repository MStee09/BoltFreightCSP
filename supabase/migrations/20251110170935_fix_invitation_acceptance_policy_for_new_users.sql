/*
  # Fix invitation acceptance for newly registered users

  1. Changes
    - Update "Users can accept their own invitation" policy to work for new signups
    - Allow users to update invitations where their auth email matches the invitation email
    - This avoids dependency on user_profiles which may not exist yet during registration
  
  2. Security
    - Users can only update invitations that match their authenticated email
    - Prevents users from accepting other people's invitations
*/

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can accept their own invitation" ON user_invitations;

-- Recreate with a policy that works for newly signed up users
-- Use auth.email() instead of checking user_profiles
CREATE POLICY "Users can accept their own invitation"
  ON user_invitations
  FOR UPDATE
  TO authenticated
  USING (
    email = (
      SELECT au.email 
      FROM auth.users au 
      WHERE au.id = auth.uid()
    )
  )
  WITH CHECK (
    email = (
      SELECT au.email 
      FROM auth.users au 
      WHERE au.id = auth.uid()
    )
  );

-- Also fix the INSERT policy to not use is_admin() function
DROP POLICY IF EXISTS "Admins can create invitations" ON user_invitations;

CREATE POLICY "Admins can create invitations"
  ON user_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM user_profiles 
      WHERE id = auth.uid() 
        AND role = 'admin' 
        AND is_active = true
    )
  );
