/*
  # Fix invitation delete policy JWT path

  1. Changes
    - Fix the admin delete policy to check auth.jwt()->'app_metadata'->>'app_role' instead of auth.jwt()->>'app_role'
    - This matches the actual JWT structure where app_role is nested under app_metadata
*/

DROP POLICY IF EXISTS "Admins can delete invitations" ON user_invitations;

CREATE POLICY "Admins can delete invitations"
  ON user_invitations
  FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'app_role') = 'admin'
  );
