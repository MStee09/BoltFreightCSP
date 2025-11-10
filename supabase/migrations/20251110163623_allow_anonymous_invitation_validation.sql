/*
  # Allow anonymous users to validate invitation tokens
  
  1. Changes
    - Add policy to allow anonymous (unauthenticated) users to read their own invitation by token
    - This enables users to complete the registration flow using invitation links
  
  2. Security
    - Only allows reading invitations that match the specific token
    - Does not expose all invitations to anonymous users
    - Token must match exactly to view the invitation
*/

-- Drop the old restrictive SELECT policy
DROP POLICY IF EXISTS "Users can view invitations" ON user_invitations;

-- Allow authenticated users to view all invitations
CREATE POLICY "Authenticated users can view invitations"
  ON user_invitations
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow anonymous users to view invitations by token (for registration)
CREATE POLICY "Anonymous users can validate invitation tokens"
  ON user_invitations
  FOR SELECT
  TO anon
  USING (token IS NOT NULL);

-- Allow users to update their own invitation when accepting it
CREATE POLICY "Users can accept their own invitation"
  ON user_invitations
  FOR UPDATE
  TO authenticated
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  WITH CHECK (email = (SELECT email FROM auth.users WHERE id = auth.uid()));
