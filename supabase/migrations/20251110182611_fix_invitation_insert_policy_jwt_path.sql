/*
  # Fix invitation insert policy JWT path

  1. Changes
    - Fix the insert policy to check auth.jwt()->'app_metadata'->>'app_role' instead of auth.jwt()->>'app_role'
    - This allows admins to create invitations
*/

DROP POLICY IF EXISTS "Admins can create invitations" ON user_invitations;

CREATE POLICY "Admins can create invitations"
  ON user_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'app_role') = 'admin'
  );
