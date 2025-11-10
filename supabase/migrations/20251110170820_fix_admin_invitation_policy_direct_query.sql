/*
  # Fix admin invitation update policy with direct query

  1. Changes
    - Replace is_admin() function call with direct query in policy
    - This avoids function context issues that cause "permission denied" errors
  
  2. Security
    - Maintains same security: only admins can update any invitation
    - Direct query is more reliable than function call in policy context
*/

-- Drop the policy that uses is_admin()
DROP POLICY IF EXISTS "Admins can update invitations" ON user_invitations;

-- Recreate with direct query instead of function
CREATE POLICY "Admins can update invitations"
  ON user_invitations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM user_profiles 
      WHERE id = auth.uid() 
        AND role = 'admin' 
        AND is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM user_profiles 
      WHERE id = auth.uid() 
        AND role = 'admin' 
        AND is_active = true
    )
  );
