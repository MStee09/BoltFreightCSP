/*
  # Fix Security Issues - Part 4: Consolidate Multiple Permissive Policies

  1. Changes
    - Consolidate multiple permissive policies into single policies
    - This prevents policy conflicts and improves performance

  2. Tables Updated
    - automation_rules: Merge SELECT policies
    - user_profiles: Merge UPDATE policies
*/

-- automation_rules: Consolidate SELECT policies
DROP POLICY IF EXISTS "admins_manage_rules" ON automation_rules;
DROP POLICY IF EXISTS "authenticated_users_view_rules" ON automation_rules;

-- Create single consolidated policy for SELECT
CREATE POLICY "users_can_view_rules"
  ON automation_rules FOR SELECT
  TO authenticated
  USING (true);

-- Recreate admin management policies for other operations
CREATE POLICY "admins_can_insert_rules"
  ON automation_rules FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.jwt()->>'app_role') = 'admin');

CREATE POLICY "admins_can_update_rules"
  ON automation_rules FOR UPDATE
  TO authenticated
  USING ((SELECT auth.jwt()->>'app_role') = 'admin')
  WITH CHECK ((SELECT auth.jwt()->>'app_role') = 'admin');

CREATE POLICY "admins_can_delete_rules"
  ON automation_rules FOR DELETE
  TO authenticated
  USING ((SELECT auth.jwt()->>'app_role') = 'admin');

-- user_profiles: Consolidate UPDATE policies
DROP POLICY IF EXISTS "admins_can_update_any_user" ON user_profiles;
DROP POLICY IF EXISTS "users_update_own_profile" ON user_profiles;

-- Create single consolidated policy for UPDATE
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