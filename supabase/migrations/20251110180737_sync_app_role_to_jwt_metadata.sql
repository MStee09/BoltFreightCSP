/*
  # Sync App Role to JWT Metadata

  1. Purpose
    - Ensure all users have their role from user_profiles synced to auth.users.raw_app_meta_data
    - This makes the role available in JWT for RLS policies
    - Create trigger to keep it synced on role changes

  2. Changes
    - Update existing users to have app_role in JWT metadata
    - Create function to sync role changes
    - Create trigger on user_profiles
*/

-- Function to sync user role to JWT metadata
CREATE OR REPLACE FUNCTION sync_user_role_to_jwt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Update the auth.users raw_app_meta_data with the role
  UPDATE auth.users
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('app_role', NEW.role)
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$;

-- Create trigger on user_profiles
DROP TRIGGER IF EXISTS sync_role_to_jwt_on_insert ON user_profiles;
DROP TRIGGER IF EXISTS sync_role_to_jwt_on_update ON user_profiles;

CREATE TRIGGER sync_role_to_jwt_on_insert
  AFTER INSERT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_role_to_jwt();

CREATE TRIGGER sync_role_to_jwt_on_update
  AFTER UPDATE OF role ON user_profiles
  FOR EACH ROW
  WHEN (OLD.role IS DISTINCT FROM NEW.role)
  EXECUTE FUNCTION sync_user_role_to_jwt();

-- Sync all existing users
UPDATE auth.users
SET raw_app_meta_data = 
  COALESCE(raw_app_meta_data, '{}'::jsonb) || 
  jsonb_build_object('app_role', up.role)
FROM user_profiles up
WHERE auth.users.id = up.id;
