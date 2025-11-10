/*
  # Add Admin Policy for Updating User Profiles

  1. Purpose
    - Allow admins to update any user's profile including role changes
    - Currently only users can update their own profile
    - This enables the User Management interface to function properly

  2. Changes
    - Create policy allowing admins to update any user profile
    - Uses JWT metadata to check for admin role
*/

-- Allow admins to update any user profile
CREATE POLICY "admins_can_update_any_user"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'app_role') = 'admin'
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'app_role') = 'admin'
  );
