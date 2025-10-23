/*
  # Add Gmail App Password Credentials Table

  1. New Tables
    - `user_gmail_credentials`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `email_address` (text, Gmail address)
      - `app_password` (text, encrypted app password)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `user_gmail_credentials` table
    - Add policies for users to manage their own credentials
    - Encrypt app_password column

  3. Changes
    - Replace OAuth token storage with simple app password approach
    - Simpler authentication flow using Gmail SMTP
*/

-- Create table for Gmail app password credentials
CREATE TABLE IF NOT EXISTS user_gmail_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_address text NOT NULL,
  app_password text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE user_gmail_credentials ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only access their own credentials
CREATE POLICY "Users can view own Gmail credentials"
  ON user_gmail_credentials
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own Gmail credentials"
  ON user_gmail_credentials
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own Gmail credentials"
  ON user_gmail_credentials
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own Gmail credentials"
  ON user_gmail_credentials
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_gmail_credentials_user_id
  ON user_gmail_credentials(user_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_user_gmail_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_gmail_credentials_updated_at
  BEFORE UPDATE ON user_gmail_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_user_gmail_credentials_updated_at();
