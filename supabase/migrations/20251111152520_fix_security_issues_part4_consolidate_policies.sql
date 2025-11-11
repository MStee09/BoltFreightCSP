/*
  # Fix Security Issues - Part 4: Consolidate Multiple Permissive Policies

  1. Problem
    - Multiple permissive policies for same role/action
    - Can lead to unexpected access patterns

  2. Solution
    - Consolidate into single policies with OR conditions
    - Makes access control more explicit

  3. Tables Fixed
    - automation_rules (SELECT policies)
    - user_profiles (UPDATE policies)
*/

-- ==========================================
-- AUTOMATION RULES - Consolidate SELECT policies
-- ==========================================

-- Remove existing permissive policies
DROP POLICY IF EXISTS "admins_manage_rules" ON automation_rules;
DROP POLICY IF EXISTS "authenticated_users_view_rules" ON automation_rules;

-- Create consolidated SELECT policy
CREATE POLICY "users_view_automation_rules"
  ON automation_rules
  FOR SELECT
  TO authenticated
  USING (
    -- Admins see all rules
    (SELECT (auth.jwt()->>'app_metadata')::jsonb->>'role') = 'admin'
    OR
    -- All authenticated users can view rules (read-only)
    true
  );

-- Recreate admin management policy (INSERT, UPDATE, DELETE)
CREATE POLICY "admins_manage_automation_rules"
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
-- USER PROFILES - Consolidate UPDATE policies
-- ==========================================

-- Remove existing permissive policies
DROP POLICY IF EXISTS "users_update_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "admins_can_update_any_user" ON user_profiles;

-- Create consolidated UPDATE policy
CREATE POLICY "users_can_update_profiles"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    -- Users can update their own profile
    id = (SELECT auth.uid())
    OR
    -- Admins can update any profile
    (SELECT (auth.jwt()->>'app_metadata')::jsonb->>'role') = 'admin'
  )
  WITH CHECK (
    -- Users can update their own profile
    id = (SELECT auth.uid())
    OR
    -- Admins can update any profile
    (SELECT (auth.jwt()->>'app_metadata')::jsonb->>'role') = 'admin'
  );
