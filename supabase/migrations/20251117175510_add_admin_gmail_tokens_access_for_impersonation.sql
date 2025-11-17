/*
  # Allow Admin Gmail Token Access for Impersonation

  ## Overview
  Allows admins to access any user's Gmail tokens when impersonating them.
  This enables admins to send emails on behalf of users during impersonation.

  ## Changes
  1. Add new SELECT policy for admins to access any user's Gmail tokens
  2. This works alongside the existing user-specific policy

  ## Security
  - Only users with admin role can access other users' tokens
  - Checked via JWT metadata app_role field
  - Maintains existing user access to their own tokens
*/

-- Allow admins to view any user's gmail tokens (for impersonation)
CREATE POLICY "Admins can view any gmail tokens for impersonation"
  ON user_gmail_tokens
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'app_role') = 'admin'
  );
