/*
  # OAuth Error Logging System

  ## Overview
  Creates a table to log OAuth connection attempts and errors for debugging without requiring users to check browser console.

  ## New Tables
  
  ### `oauth_error_logs`
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid, foreign key, nullable) - User attempting OAuth (null if session lost)
  - `user_email` (text, nullable) - Email from session if available
  - `error_type` (text) - Type of error (session_lost, token_exchange_failed, etc.)
  - `error_message` (text) - Detailed error message
  - `error_details` (jsonb) - Additional context (URLs, attempts, etc.)
  - `oauth_provider` (text) - Which OAuth provider (gmail, etc.)
  - `callback_url` (text) - The callback URL that was hit
  - `user_agent` (text) - Browser user agent
  - `created_at` (timestamptz) - When error occurred

  ## Security
  - Enable RLS
  - Admins can view all logs
  - Users can view their own logs
  - System can insert logs without authentication (for session lost errors)
*/

CREATE TABLE IF NOT EXISTS oauth_error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email text,
  error_type text NOT NULL,
  error_message text NOT NULL,
  error_details jsonb DEFAULT '{}'::jsonb,
  oauth_provider text NOT NULL DEFAULT 'gmail',
  callback_url text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_oauth_error_logs_user_id ON oauth_error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_error_logs_created_at ON oauth_error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_oauth_error_logs_error_type ON oauth_error_logs(error_type);

ALTER TABLE oauth_error_logs ENABLE ROW LEVEL SECURITY;

-- Allow system to insert errors even without authentication (for session lost scenarios)
CREATE POLICY "System can insert oauth error logs"
  ON oauth_error_logs
  FOR INSERT
  WITH CHECK (true);

-- Admins can view all error logs
CREATE POLICY "Admins can view all oauth error logs"
  ON oauth_error_logs
  FOR SELECT
  TO authenticated
  USING ((auth.jwt()->>'app_role') = 'admin');

-- Users can view their own error logs
CREATE POLICY "Users can view own oauth error logs"
  ON oauth_error_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());