/*
  # Optimize RLS Policies - Add SELECT Wrapper for Auth Functions

  1. Changes
    - Wrap all auth.uid() and auth.jwt() calls with SELECT to prevent re-evaluation per row
    - Improves query performance at scale by caching the auth value

  2. Tables Updated
    - automation_rules (3 policies)
    - user_profiles (1 policy)
    - email_audit_log (1 policy)
    - user_invitations (3 policies)
    - email_threads (2 policies)
    - user_impersonation_sessions (2 policies)

  3. Performance Impact
    - Reduces function calls from O(n) to O(1) where n is number of rows
    - Significant improvement for queries returning many rows
*/

-- automation_rules policies
DROP POLICY IF EXISTS "admins_can_delete_rules" ON automation_rules;
CREATE POLICY "admins_can_delete_rules"
  ON automation_rules
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "admins_can_insert_rules" ON automation_rules;
CREATE POLICY "admins_can_insert_rules"
  ON automation_rules
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "admins_can_update_rules" ON automation_rules;
CREATE POLICY "admins_can_update_rules"
  ON automation_rules
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.role = 'admin'
    )
  );

-- user_profiles policy
DROP POLICY IF EXISTS "users_can_update_profiles" ON user_profiles;
CREATE POLICY "users_can_update_profiles"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid())
      AND up.role = 'admin'
    )
  )
  WITH CHECK (
    id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid())
      AND up.role = 'admin'
    )
  );

-- email_audit_log policy
DROP POLICY IF EXISTS "Admins can view audit log" ON email_audit_log;
CREATE POLICY "Admins can view audit log"
  ON email_audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.role = 'admin'
    )
  );

-- user_invitations policies
DROP POLICY IF EXISTS "Admins can create invitations" ON user_invitations;
CREATE POLICY "Admins can create invitations"
  ON user_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.jwt()->>'app_metadata')::jsonb->>'role' = 'admin'
  );

DROP POLICY IF EXISTS "Admins can delete invitations" ON user_invitations;
CREATE POLICY "Admins can delete invitations"
  ON user_invitations
  FOR DELETE
  TO authenticated
  USING (
    (SELECT auth.jwt()->>'app_metadata')::jsonb->>'role' = 'admin'
  );

DROP POLICY IF EXISTS "Users can update invitations" ON user_invitations;
CREATE POLICY "Users can update invitations"
  ON user_invitations
  FOR UPDATE
  TO authenticated
  USING (
    email = (SELECT auth.jwt()->>'email') OR
    (SELECT auth.jwt()->>'app_metadata')::jsonb->>'role' = 'admin'
  )
  WITH CHECK (
    email = (SELECT auth.jwt()->>'email') OR
    (SELECT auth.jwt()->>'app_metadata')::jsonb->>'role' = 'admin'
  );

-- email_threads policies
DROP POLICY IF EXISTS "Users can delete email threads" ON email_threads;
CREATE POLICY "Users can delete email threads"
  ON email_threads
  FOR DELETE
  TO authenticated
  USING (owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update email threads" ON email_threads;
CREATE POLICY "Users can update email threads"
  ON email_threads
  FOR UPDATE
  TO authenticated
  USING (owner_id = (SELECT auth.uid()))
  WITH CHECK (owner_id = (SELECT auth.uid()));

-- user_impersonation_sessions policies
DROP POLICY IF EXISTS "Admins can update their own impersonation sessions" ON user_impersonation_sessions;
CREATE POLICY "Admins can update their own impersonation sessions"
  ON user_impersonation_sessions
  FOR UPDATE
  TO authenticated
  USING (
    admin_user_id = (SELECT auth.uid()) AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    admin_user_id = (SELECT auth.uid()) AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can view all impersonation sessions" ON user_impersonation_sessions;
CREATE POLICY "Admins can view all impersonation sessions"
  ON user_impersonation_sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.role = 'admin'
    )
  );
