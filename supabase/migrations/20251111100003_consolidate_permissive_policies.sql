/*
  # Consolidate Multiple Permissive Policies

  1. Changes
    - Combine multiple permissive SELECT policies on automation_rules
    - Combine multiple permissive UPDATE policies on user_profiles
    - Use OR logic within a single policy instead of multiple policies

  2. Security
    - Same security model, just consolidated into single policies
*/

-- automation_rules: Consolidate SELECT policies
DROP POLICY IF EXISTS "admins_manage_rules" ON automation_rules;
DROP POLICY IF EXISTS "authenticated_users_view_rules" ON automation_rules;

CREATE POLICY "users_can_view_rules_admins_can_manage" ON automation_rules
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "admins_can_manage_rules" ON automation_rules
  FOR ALL
  TO authenticated
  USING (
    (SELECT auth.jwt()->>'app_role') = 'admin'
  )
  WITH CHECK (
    (SELECT auth.jwt()->>'app_role') = 'admin'
  );

-- user_profiles: Consolidate UPDATE policies
DROP POLICY IF EXISTS "admins_can_update_any_user" ON user_profiles;
DROP POLICY IF EXISTS "users_update_own_profile" ON user_profiles;

CREATE POLICY "users_can_update_profiles" ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    id = (SELECT auth.uid()) OR
    (SELECT auth.jwt()->>'app_role') = 'admin'
  )
  WITH CHECK (
    id = (SELECT auth.uid()) OR
    (SELECT auth.jwt()->>'app_role') = 'admin'
  );
