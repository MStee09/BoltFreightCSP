/*
  # Fix invitation update policy JWT path

  1. Changes
    - Fix the update policy to check auth.jwt()->'app_metadata'->>'app_role' instead of auth.jwt()->>'app_role'
    - Also fix the email check to use auth.jwt()->>'email' (which is at the root level, not in app_metadata)
    - This allows admins to cancel invitations by updating status to 'cancelled'
*/

DROP POLICY IF EXISTS "Users can update invitations" ON user_invitations;

CREATE POLICY "Users can update invitations"
  ON user_invitations
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'app_role') = 'admin'
    OR (
      auth.jwt() ->> 'email' = email 
      AND status = 'pending'
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'app_role') = 'admin'
    OR (
      auth.jwt() ->> 'email' = email 
      AND status = 'accepted'
    )
  );
