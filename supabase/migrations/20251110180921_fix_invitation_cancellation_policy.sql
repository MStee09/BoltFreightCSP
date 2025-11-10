/*
  # Fix Invitation Cancellation Policy

  1. Problem
    - Current UPDATE policy WITH CHECK only allows status='accepted' for non-admins
    - Admins need to be able to cancel invitations (set status='cancelled')

  2. Solution
    - Update WITH CHECK to allow admins to set any status including 'cancelled'
    - Keep user restriction to only 'accepted' when accepting their own invitation
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Users can update invitations" ON user_invitations;

-- Recreate with proper WITH CHECK that allows cancellation
CREATE POLICY "Users can update invitations"
  ON user_invitations
  FOR UPDATE
  TO authenticated
  USING (
    -- Admins can update any invitation
    ((select auth.jwt())->>'app_role') = 'admin'
    OR
    -- Users can accept their own invitation
    ((select auth.jwt())->>'email' = email AND status = 'pending')
  )
  WITH CHECK (
    -- Admins can update to any status (including cancelled)
    ((select auth.jwt())->>'app_role') = 'admin'
    OR
    -- Users can only mark as accepted
    ((select auth.jwt())->>'email' = email AND status = 'accepted')
  );
