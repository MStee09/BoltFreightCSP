/*
  # Fix user_profiles RLS Policies
  
  Update policies to use correct column name 'id' instead of 'user_id'
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins view all" ON user_profiles;
DROP POLICY IF EXISTS "Users update own" ON user_profiles;
DROP POLICY IF EXISTS "Admins update any" ON user_profiles;
DROP POLICY IF EXISTS "Trigger creates" ON user_profiles;
DROP POLICY IF EXISTS "Admins delete" ON user_profiles;

-- Recreate with correct column references
CREATE POLICY "Users view own profile"
  ON user_profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admins view all"
  ON user_profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles p
      WHERE p.id = auth.uid() AND p.role::text IN ('admin', 'elite')
    )
  );

CREATE POLICY "Users update own"
  ON user_profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Admins update any"
  ON user_profiles FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles p WHERE p.id = auth.uid() AND p.role::text = 'admin')
  );

CREATE POLICY "Trigger creates"
  ON user_profiles FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins delete"
  ON user_profiles FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles p WHERE p.id = auth.uid() AND p.role::text = 'admin')
  );

-- Update helper functions to use correct column
CREATE OR REPLACE FUNCTION user_has_permission(permission_name text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_profiles up
    JOIN role_permissions rp ON rp.role = up.role::text
    JOIN permissions p ON p.id = rp.permission_id
    WHERE up.id = auth.uid()
    AND p.name = permission_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text AS $$
BEGIN
  RETURN (
    SELECT role::text
    FROM user_profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_permissions()
RETURNS SETOF text AS $$
BEGIN
  RETURN QUERY
  SELECT p.name
  FROM user_profiles up
  JOIN role_permissions rp ON rp.role = up.role::text
  JOIN permissions p ON p.id = rp.permission_id
  WHERE up.id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
