/*
  # Fix Impersonation RLS Policy to Read JWT Correctly

  1. Changes
    - Drop existing impersonation INSERT policy
    - Recreate with correct JWT path: raw_app_meta_data->>'app_role'
    - The app_role is stored in raw_app_meta_data, not at root level of JWT

  2. Security
    - Only users with app_role = 'admin' in their JWT metadata can create impersonation sessions
*/

-- Drop the existing policy
DROP POLICY IF EXISTS "Admins can create impersonation sessions" ON user_impersonation_sessions;

-- Recreate with correct JWT path
CREATE POLICY "Admins can create impersonation sessions"
  ON user_impersonation_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'app_role') = 'admin'
    OR
    (auth.jwt() -> 'user_metadata' ->> 'app_role') = 'admin'
  );
