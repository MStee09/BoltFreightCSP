/*
  # User Gmail Tokens Table

  ## Overview
  Stores OAuth tokens for Gmail API access per user, enabling email sending and inbox monitoring.

  ## New Tables
  
  ### `user_gmail_tokens`
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid, foreign key) - Links to auth.users
  - `email_address` (text) - Gmail address
  - `access_token` (text) - Gmail OAuth access token
  - `refresh_token` (text) - Gmail OAuth refresh token
  - `token_expiry` (timestamptz) - When access token expires
  - `created_at` (timestamptz) - When record was created
  - `updated_at` (timestamptz) - Last update

  ## Security
  - Enable RLS on table
  - Users can only access their own tokens
  - Tokens are sensitive and should be encrypted at rest (handled by Supabase)
*/

-- Create user_gmail_tokens table
CREATE TABLE IF NOT EXISTS user_gmail_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email_address text NOT NULL,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_expiry timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_gmail_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view their own tokens
CREATE POLICY "Users can view own gmail tokens"
  ON user_gmail_tokens
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own tokens
CREATE POLICY "Users can insert own gmail tokens"
  ON user_gmail_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own tokens
CREATE POLICY "Users can update own gmail tokens"
  ON user_gmail_tokens
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own tokens
CREATE POLICY "Users can delete own gmail tokens"
  ON user_gmail_tokens
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
