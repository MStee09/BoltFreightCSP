/*
  # Fix Security Issues - Part 2: RLS Policy Optimization

  1. Problem
    - RLS policies calling auth.uid() directly re-evaluate for each row
    - This causes suboptimal performance at scale

  2. Solution
    - Wrap auth function calls in SELECT to evaluate once per query
    - Replace: auth.uid() with (select auth.uid())

  3. Tables Fixed
    - user_profiles
    - user_invitations
    - tariff_audit_log
    - automation_rules
    - daily_digests
    - user_pins
*/

-- ==========================================
-- USER PROFILES
-- ==========================================

DROP POLICY IF EXISTS "admins_can_update_any_user" ON user_profiles;

CREATE POLICY "admins_can_update_any_user"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT (auth.jwt()->>'app_metadata')::jsonb->>'role') = 'admin'
  )
  WITH CHECK (
    (SELECT (auth.jwt()->>'app_metadata')::jsonb->>'role') = 'admin'
  );

-- ==========================================
-- USER INVITATIONS
-- ==========================================

DROP POLICY IF EXISTS "Admins can create invitations" ON user_invitations;

CREATE POLICY "Admins can create invitations"
  ON user_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT (auth.jwt()->>'app_metadata')::jsonb->>'role') = 'admin'
  );

DROP POLICY IF EXISTS "Admins can delete invitations" ON user_invitations;

CREATE POLICY "Admins can delete invitations"
  ON user_invitations
  FOR DELETE
  TO authenticated
  USING (
    (SELECT (auth.jwt()->>'app_metadata')::jsonb->>'role') = 'admin'
  );

DROP POLICY IF EXISTS "Users can update invitations" ON user_invitations;

CREATE POLICY "Users can update invitations"
  ON user_invitations
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT auth.jwt()->>'email') = email
  )
  WITH CHECK (
    (SELECT auth.jwt()->>'email') = email
  );

-- ==========================================
-- TARIFF AUDIT LOG
-- ==========================================

DROP POLICY IF EXISTS "System can insert audit logs" ON tariff_audit_log;

CREATE POLICY "System can insert audit logs"
  ON tariff_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    changed_by = (SELECT auth.uid())
  );

-- ==========================================
-- AUTOMATION RULES
-- ==========================================

DROP POLICY IF EXISTS "admins_manage_rules" ON automation_rules;

CREATE POLICY "admins_manage_rules"
  ON automation_rules
  FOR ALL
  TO authenticated
  USING (
    (SELECT (auth.jwt()->>'app_metadata')::jsonb->>'role') = 'admin'
  )
  WITH CHECK (
    (SELECT (auth.jwt()->>'app_metadata')::jsonb->>'role') = 'admin'
  );

-- ==========================================
-- DAILY DIGESTS
-- ==========================================

DROP POLICY IF EXISTS "users_view_own_digests" ON daily_digests;

CREATE POLICY "users_view_own_digests"
  ON daily_digests
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "users_update_own_digests" ON daily_digests;

CREATE POLICY "users_update_own_digests"
  ON daily_digests
  FOR UPDATE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
  );

-- ==========================================
-- USER PINS
-- ==========================================

DROP POLICY IF EXISTS "Users can view own pins" ON user_pins;

CREATE POLICY "Users can view own pins"
  ON user_pins
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Users can create own pins" ON user_pins;

CREATE POLICY "Users can create own pins"
  ON user_pins
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete own pins" ON user_pins;

CREATE POLICY "Users can delete own pins"
  ON user_pins
  FOR DELETE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
  );
