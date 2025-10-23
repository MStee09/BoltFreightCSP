/*
  # Clean Up User Profiles RLS Policies
  
  Remove all duplicate and conflicting policies, create clean simple policies
*/

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Admins can create user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can delete user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins delete" ON user_profiles;
DROP POLICY IF EXISTS "Admins update any" ON user_profiles;
DROP POLICY IF EXISTS "Admins view all" ON user_profiles;
DROP POLICY IF EXISTS "Allow trigger to create user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Trigger creates" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile metadata" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users update own" ON user_profiles;
DROP POLICY IF EXISTS "Users view own profile" ON user_profiles;

-- Create clean, simple policies that will work
CREATE POLICY "allow_select_own_profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "allow_select_all_for_admin_elite"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role IN ('admin', 'elite')
    )
  );

CREATE POLICY "allow_insert_from_trigger"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "allow_update_own"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "allow_update_all_for_admin"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "allow_delete_for_admin"
  ON user_profiles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
