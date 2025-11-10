/*
  # Optimize User Invitations RLS Policies

  1. Performance Improvements
    - Replace auth.uid() with (select auth.uid()) to prevent re-evaluation per row
    - Replace auth.jwt() with (select auth.jwt()) for same reason
    - Consolidate multiple UPDATE policies into single policy

  2. Security
    - Maintains same security guarantees
    - Improves performance at scale
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can create invitations" ON user_invitations;
DROP POLICY IF EXISTS "Admins can update invitations" ON user_invitations;
DROP POLICY IF EXISTS "Admins can delete invitations" ON user_invitations;
DROP POLICY IF EXISTS "Users can accept their own invitation" ON user_invitations;

-- Recreate with optimized auth function calls
CREATE POLICY "Admins can create invitations"
  ON user_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    ((select auth.jwt())->>'app_role') = 'admin'
  );

CREATE POLICY "Admins can delete invitations"
  ON user_invitations
  FOR DELETE
  TO authenticated
  USING (
    ((select auth.jwt())->>'app_role') = 'admin'
  );

-- Consolidated UPDATE policy (handles both admin updates and user acceptance)
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
    -- Admins can update any invitation
    ((select auth.jwt())->>'app_role') = 'admin'
    OR
    -- Users can only mark as accepted
    ((select auth.jwt())->>'email' = email AND status = 'accepted')
  );
