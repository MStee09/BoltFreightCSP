/*
  # Optimize RLS Auth Function Calls

  1. Changes
    - Updates RLS policies to use (select auth.uid()) instead of auth.uid()
    - Updates RLS policies to use (select auth.jwt()) instead of auth.jwt()
    - Prevents re-evaluation of auth functions for each row
    - Significantly improves query performance at scale

  2. Affected Tables
    - automation_rules (3 policies)
    - user_profiles (1 policy)
    - email_audit_log (1 policy)
    - user_invitations (3 policies)
    - email_threads (2 policies)
    - user_impersonation_sessions (3 policies)

  3. Security
    - No security changes, only performance optimization
    - Maintains exact same access control logic
*/

-- =========================================
-- Automation Rules Policies
-- =========================================

DROP POLICY IF EXISTS "admins_can_delete_rules" ON automation_rules;
CREATE POLICY "admins_can_delete_rules"
  ON automation_rules FOR DELETE
  TO authenticated
  USING (
    (SELECT auth.jwt()->>'app_role') = 'admin'
  );

DROP POLICY IF EXISTS "admins_can_insert_rules" ON automation_rules;
CREATE POLICY "admins_can_insert_rules"
  ON automation_rules FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.jwt()->>'app_role') = 'admin'
  );

DROP POLICY IF EXISTS "admins_can_update_rules" ON automation_rules;
CREATE POLICY "admins_can_update_rules"
  ON automation_rules FOR UPDATE
  TO authenticated
  USING (
    (SELECT auth.jwt()->>'app_role') = 'admin'
  )
  WITH CHECK (
    (SELECT auth.jwt()->>'app_role') = 'admin'
  );

-- =========================================
-- User Profiles Policies
-- =========================================

DROP POLICY IF EXISTS "users_can_update_profiles" ON user_profiles;
CREATE POLICY "users_can_update_profiles"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (
    id = (SELECT auth.uid()) OR
    (SELECT auth.jwt()->>'app_role') = 'admin'
  )
  WITH CHECK (
    id = (SELECT auth.uid()) OR
    (SELECT auth.jwt()->>'app_role') = 'admin'
  );

-- =========================================
-- Email Audit Log Policies
-- =========================================

DROP POLICY IF EXISTS "Admins can view audit log" ON email_audit_log;
CREATE POLICY "Admins can view audit log"
  ON email_audit_log FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.jwt()->>'app_role') = 'admin'
  );

-- =========================================
-- User Invitations Policies
-- =========================================

DROP POLICY IF EXISTS "Admins can create invitations" ON user_invitations;
CREATE POLICY "Admins can create invitations"
  ON user_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.jwt()->>'app_role') = 'admin'
  );

DROP POLICY IF EXISTS "Admins can delete invitations" ON user_invitations;
CREATE POLICY "Admins can delete invitations"
  ON user_invitations FOR DELETE
  TO authenticated
  USING (
    (SELECT auth.jwt()->>'app_role') = 'admin'
  );

DROP POLICY IF EXISTS "Users can update invitations" ON user_invitations;
CREATE POLICY "Users can update invitations"
  ON user_invitations FOR UPDATE
  TO authenticated
  USING (
    email = (SELECT auth.jwt()->>'email') OR
    (SELECT auth.jwt()->>'app_role') = 'admin'
  )
  WITH CHECK (
    email = (SELECT auth.jwt()->>'email') OR
    (SELECT auth.jwt()->>'app_role') = 'admin'
  );

-- =========================================
-- Email Threads Policies
-- =========================================

DROP POLICY IF EXISTS "Admins can delete any thread" ON email_threads;
CREATE POLICY "Admins can delete any thread"
  ON email_threads FOR DELETE
  TO authenticated
  USING (
    (SELECT auth.jwt()->>'app_role') = 'admin'
  );

DROP POLICY IF EXISTS "Admins can update any thread" ON email_threads;
CREATE POLICY "Admins can update any thread"
  ON email_threads FOR UPDATE
  TO authenticated
  USING (
    (SELECT auth.jwt()->>'app_role') = 'admin'
  )
  WITH CHECK (
    (SELECT auth.jwt()->>'app_role') = 'admin'
  );

-- =========================================
-- User Impersonation Sessions Policies
-- =========================================

DROP POLICY IF EXISTS "Admins can create impersonation sessions" ON user_impersonation_sessions;
CREATE POLICY "Admins can create impersonation sessions"
  ON user_impersonation_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.jwt()->>'app_role') = 'admin'
  );

DROP POLICY IF EXISTS "Admins can update their own impersonation sessions" ON user_impersonation_sessions;
CREATE POLICY "Admins can update their own impersonation sessions"
  ON user_impersonation_sessions FOR UPDATE
  TO authenticated
  USING (
    admin_user_id = (SELECT auth.uid()) AND
    (SELECT auth.jwt()->>'app_role') = 'admin'
  )
  WITH CHECK (
    admin_user_id = (SELECT auth.uid()) AND
    (SELECT auth.jwt()->>'app_role') = 'admin'
  );

DROP POLICY IF EXISTS "Admins can view all impersonation sessions" ON user_impersonation_sessions;
CREATE POLICY "Admins can view all impersonation sessions"
  ON user_impersonation_sessions FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.jwt()->>'app_role') = 'admin'
  );
