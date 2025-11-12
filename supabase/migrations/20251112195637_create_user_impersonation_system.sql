/*
  # Create User Impersonation System for Admin Troubleshooting

  1. New Tables
    - `user_impersonation_sessions`
      - `id` (uuid, primary key)
      - `admin_user_id` (uuid) - the admin doing the impersonation
      - `impersonated_user_id` (uuid) - the user being impersonated
      - `started_at` (timestamptz) - when impersonation started
      - `ended_at` (timestamptz) - when impersonation ended
      - `reason` (text) - why the admin is impersonating (troubleshooting notes)

  2. Security
    - Enable RLS on `user_impersonation_sessions` table
    - Only admins can create/read impersonation sessions
    - Full audit trail of all impersonation activities

  3. Indexes
    - Index on admin_user_id for quick lookups
    - Index on impersonated_user_id for audit reports
*/

CREATE TABLE IF NOT EXISTS user_impersonation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  impersonated_user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  reason text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_impersonation_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all impersonation sessions"
  ON user_impersonation_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can create impersonation sessions"
  ON user_impersonation_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
    AND admin_user_id = auth.uid()
  );

CREATE POLICY "Admins can update their own impersonation sessions"
  ON user_impersonation_sessions FOR UPDATE
  TO authenticated
  USING (admin_user_id = auth.uid())
  WITH CHECK (admin_user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_impersonation_admin_user ON user_impersonation_sessions(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_impersonation_impersonated_user ON user_impersonation_sessions(impersonated_user_id);
CREATE INDEX IF NOT EXISTS idx_impersonation_started_at ON user_impersonation_sessions(started_at DESC);
