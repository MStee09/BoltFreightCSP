/*
  # Fix invitation acceptance using JWT email

  1. Changes
    - Update policy to use auth.jwt() to get email from JWT token
    - This avoids querying auth.users table which causes permission errors
    - Works immediately after signup since email is in the JWT
  
  2. Security
    - Users can only update invitations matching their JWT email
    - No access to auth.users needed
*/

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can accept their own invitation" ON user_invitations;

-- Recreate using JWT email instead of querying tables
CREATE POLICY "Users can accept their own invitation"
  ON user_invitations
  FOR UPDATE
  TO authenticated
  USING (email = (auth.jwt()->>'email')::text)
  WITH CHECK (email = (auth.jwt()->>'email')::text);
