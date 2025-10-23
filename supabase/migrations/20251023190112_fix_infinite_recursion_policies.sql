/*
  # Fix Infinite Recursion in User Profiles Policies
  
  The issue: policies were checking role by querying the same table, causing infinite recursion.
  Solution: Allow all authenticated users to read all profiles (we'll handle visibility in app layer).
*/

-- Drop the problematic recursive policies
DROP POLICY IF EXISTS "allow_select_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "allow_select_all_for_admin_elite" ON user_profiles;
DROP POLICY IF EXISTS "allow_insert_from_trigger" ON user_profiles;
DROP POLICY IF EXISTS "allow_update_own" ON user_profiles;
DROP POLICY IF EXISTS "allow_update_all_for_admin" ON user_profiles;
DROP POLICY IF EXISTS "allow_delete_for_admin" ON user_profiles;

-- Simple, non-recursive policies
-- SELECT: All authenticated users can read all profiles
CREATE POLICY "authenticated_users_can_read_profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: Allow trigger to create profiles
CREATE POLICY "allow_profile_creation"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- UPDATE: Users can update their own profile
CREATE POLICY "users_update_own_profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- DELETE: Only allow from service role (no user can delete profiles)
-- Admin deletes would be handled through a service function if needed
