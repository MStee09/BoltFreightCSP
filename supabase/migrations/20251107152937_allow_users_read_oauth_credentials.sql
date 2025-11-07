/*
  # Allow authenticated users to read OAuth credentials

  1. Changes
    - Drop existing "Admins can view system settings" policy
    - Create new policy allowing all authenticated users to read system settings
    - This allows the Gmail integration to work for all users
    
  2. Security
    - Write access still restricted to admins only
    - Only read access is opened to authenticated users
*/

-- Drop the admin-only read policy
DROP POLICY IF EXISTS "Admins can view system settings" ON system_settings;

-- Create new policy allowing all authenticated users to read
CREATE POLICY "Authenticated users can view system settings"
  ON system_settings FOR SELECT
  TO authenticated
  USING (true);
