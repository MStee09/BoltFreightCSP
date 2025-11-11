/*
  # Fix Security Issues - Part 2: RLS Policy Optimization

  1. Changes
    - Optimize RLS policies to prevent re-evaluation of auth functions
    - Replace auth.<function>() with (select auth.<function>())
    - This significantly improves query performance at scale

  2. Tables Updated
    - user_profiles
    - user_invitations
    - tariff_audit_log
    - automation_rules
    - daily_digests
    - user_pins
    - freightops_thread_tokens
    - email_audit_log
*/

-- user_profiles: admins_can_update_any_user
DROP POLICY IF EXISTS "admins_can_update_any_user" ON user_profiles;
CREATE POLICY "admins_can_update_any_user"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING ((SELECT auth.jwt()->>'app_role') = 'admin')
  WITH CHECK ((SELECT auth.jwt()->>'app_role') = 'admin');

-- user_invitations: Admins can create invitations
DROP POLICY IF EXISTS "Admins can create invitations" ON user_invitations;
CREATE POLICY "Admins can create invitations"
  ON user_invitations FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.jwt()->>'app_role') = 'admin');

-- user_invitations: Admins can delete invitations
DROP POLICY IF EXISTS "Admins can delete invitations" ON user_invitations;
CREATE POLICY "Admins can delete invitations"
  ON user_invitations FOR DELETE
  TO authenticated
  USING ((SELECT auth.jwt()->>'app_role') = 'admin');

-- user_invitations: Users can update invitations
DROP POLICY IF EXISTS "Users can update invitations" ON user_invitations;
CREATE POLICY "Users can update invitations"
  ON user_invitations FOR UPDATE
  TO authenticated
  USING (email = (SELECT auth.jwt()->>'email'))
  WITH CHECK (email = (SELECT auth.jwt()->>'email'));

-- tariff_audit_log: System can insert audit logs
DROP POLICY IF EXISTS "System can insert audit logs" ON tariff_audit_log;
CREATE POLICY "System can insert audit logs"
  ON tariff_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (changed_by = (SELECT auth.uid()));

-- automation_rules: admins_manage_rules
DROP POLICY IF EXISTS "admins_manage_rules" ON automation_rules;
CREATE POLICY "admins_manage_rules"
  ON automation_rules
  FOR ALL
  TO authenticated
  USING ((SELECT auth.jwt()->>'app_role') = 'admin')
  WITH CHECK ((SELECT auth.jwt()->>'app_role') = 'admin');

-- daily_digests: users_update_own_digests
DROP POLICY IF EXISTS "users_update_own_digests" ON daily_digests;
CREATE POLICY "users_update_own_digests"
  ON daily_digests FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- daily_digests: users_view_own_digests
DROP POLICY IF EXISTS "users_view_own_digests" ON daily_digests;
CREATE POLICY "users_view_own_digests"
  ON daily_digests FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- user_pins: Users can create own pins
DROP POLICY IF EXISTS "Users can create own pins" ON user_pins;
CREATE POLICY "Users can create own pins"
  ON user_pins FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- user_pins: Users can delete own pins
DROP POLICY IF EXISTS "Users can delete own pins" ON user_pins;
CREATE POLICY "Users can delete own pins"
  ON user_pins FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- user_pins: Users can view own pins
DROP POLICY IF EXISTS "Users can view own pins" ON user_pins;
CREATE POLICY "Users can view own pins"
  ON user_pins FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- freightops_thread_tokens: Users can create tracking tokens
DROP POLICY IF EXISTS "Users can create tracking tokens" ON freightops_thread_tokens;
CREATE POLICY "Users can create tracking tokens"
  ON freightops_thread_tokens FOR INSERT
  TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid()));

-- freightops_thread_tokens: Users can update their own tracking tokens
DROP POLICY IF EXISTS "Users can update their own tracking tokens" ON freightops_thread_tokens;
CREATE POLICY "Users can update their own tracking tokens"
  ON freightops_thread_tokens FOR UPDATE
  TO authenticated
  USING (created_by = (SELECT auth.uid()))
  WITH CHECK (created_by = (SELECT auth.uid()));

-- email_audit_log: Admins can view audit log
DROP POLICY IF EXISTS "Admins can view audit log" ON email_audit_log;
CREATE POLICY "Admins can view audit log"
  ON email_audit_log FOR SELECT
  TO authenticated
  USING ((SELECT auth.jwt()->>'app_role') = 'admin');