/*
  # Fix User Profile Creation Trigger

  ## Changes
  - Update handle_new_user() function to properly bypass RLS
  - Ensure trigger can create user profiles without policy conflicts
  - Add created_by to track who created the profile (self for signups)

  ## Security
  - Function uses SECURITY DEFINER to bypass RLS for user creation
  - Only triggered on new auth.users inserts (controlled by Supabase Auth)
*/

-- Drop and recreate the function with proper permissions
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count integer;
  user_role text;
BEGIN
  -- Check if this is the first user
  SELECT COUNT(*) INTO user_count FROM user_profiles;
  
  -- First user becomes admin, others are basic by default
  IF user_count = 0 THEN
    user_role := 'admin';
  ELSE
    user_role := 'basic';
  END IF;

  -- Create user profile (bypasses RLS because of SECURITY DEFINER)
  INSERT INTO user_profiles (id, email, full_name, role, created_by)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    user_role,
    NEW.id
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Add policy to allow the function to insert (belt and suspenders approach)
DROP POLICY IF EXISTS "Allow trigger to create user profiles" ON user_profiles;
CREATE POLICY "Allow trigger to create user profiles"
  ON user_profiles
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (id = auth.uid() OR auth.uid() IS NULL);
