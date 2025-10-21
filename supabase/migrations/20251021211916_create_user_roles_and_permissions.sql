/*
  # User Roles and Permissions System

  ## Overview
  Implements a role-based access control (RBAC) system with two roles:
  - Administrator: Full access to all features, user management, and system settings
  - Basic User: Standard access to CRM features but no admin capabilities

  ## New Tables

  ### `user_profiles`
  - `id` (uuid, primary key) - Links to auth.users
  - `email` (text) - User's email address
  - `full_name` (text) - User's full name
  - `role` (text) - User role: 'admin' or 'basic'
  - `is_active` (boolean) - Whether user account is active
  - `created_at` (timestamptz) - When profile was created
  - `updated_at` (timestamptz) - Last update
  - `created_by` (uuid, foreign key) - Admin who created this user
  - `metadata` (jsonb) - Additional user data

  ## Security
  - Enable RLS on user_profiles table
  - All users can view their own profile
  - Only admins can view all profiles
  - Only admins can create/update/delete user profiles
  - First user to register automatically becomes admin

  ## Helper Functions
  - `is_admin()` - Check if current user is an admin
  - `ensure_first_user_is_admin()` - Trigger to make first user admin
*/

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  role text NOT NULL DEFAULT 'basic' CHECK (role IN ('admin', 'basic')),
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create index on role for faster queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_active ON user_profiles(is_active);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role = 'admin'
    AND is_active = true
  );
END;
$$;

-- RLS Policies for user_profiles

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- Only admins can insert new user profiles
CREATE POLICY "Admins can create user profiles"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- Admins can update all profiles (except changing their own role)
CREATE POLICY "Admins can update user profiles"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (
    is_admin() AND (
      -- Admins can update others freely
      id != auth.uid() OR
      -- Admins can update their own profile but not change their role
      (id = auth.uid() AND role = (SELECT role FROM user_profiles WHERE id = auth.uid()))
    )
  );

-- Users can update their own non-privileged fields
CREATE POLICY "Users can update own profile metadata"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid() AND
    role = (SELECT role FROM user_profiles WHERE id = auth.uid())
  );

-- Only admins can delete user profiles
CREATE POLICY "Admins can delete user profiles"
  ON user_profiles
  FOR DELETE
  TO authenticated
  USING (is_admin() AND id != auth.uid());

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
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

  -- Create user profile
  INSERT INTO user_profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    user_role
  );

  RETURN NEW;
END;
$$;

-- Trigger to create user profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Function to get user role
CREATE OR REPLACE FUNCTION get_user_role(user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM user_profiles
  WHERE id = user_id;
  
  RETURN COALESCE(user_role, 'basic');
END;
$$;

-- Update existing auth.users to have profiles (if any exist)
DO $$
DECLARE
  user_record RECORD;
  user_count integer;
  is_first boolean := true;
BEGIN
  SELECT COUNT(*) INTO user_count FROM user_profiles;
  
  -- Only create profiles if none exist yet
  IF user_count = 0 THEN
    FOR user_record IN SELECT id, email, raw_user_meta_data FROM auth.users
    LOOP
      INSERT INTO user_profiles (id, email, full_name, role)
      VALUES (
        user_record.id,
        user_record.email,
        COALESCE(user_record.raw_user_meta_data->>'full_name', user_record.email),
        CASE WHEN is_first THEN 'admin' ELSE 'basic' END
      )
      ON CONFLICT (id) DO NOTHING;
      
      is_first := false;
    END LOOP;
  END IF;
END $$;
