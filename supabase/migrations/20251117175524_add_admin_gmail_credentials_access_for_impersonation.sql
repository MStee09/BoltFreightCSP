/*
  # Allow Admin Gmail Credentials Access for Impersonation

  ## Overview
  Allows admins to access any user's Gmail app password credentials when impersonating them.
  This enables admins to send emails on behalf of users during impersonation (for users using app passwords).

  ## Changes
  1. Add new SELECT policy for admins to access any user's Gmail credentials
  2. This works alongside the existing user-specific policy

  ## Security
  - Only users with admin role can access other users' credentials
  - Checked via JWT metadata app_role field
  - Maintains existing user access to their own credentials
*/

-- Allow admins to view any user's gmail credentials (for impersonation)
CREATE POLICY "Admins can view any gmail credentials for impersonation"
  ON user_gmail_credentials
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'app_role') = 'admin'
  );
