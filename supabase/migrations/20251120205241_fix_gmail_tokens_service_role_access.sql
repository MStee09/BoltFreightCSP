/*
  # Allow service role to insert Gmail tokens

  This migration adds explicit policies to allow the service role to bypass RLS
  for Gmail token operations, ensuring the save-gmail-tokens edge function works correctly.

  Changes:
  - Add policy allowing service role to insert into user_gmail_tokens
  - Add policy allowing service role to delete from user_gmail_tokens
*/

-- Drop existing policies and recreate with service_role support
DROP POLICY IF EXISTS "Users can insert own gmail tokens" ON user_gmail_tokens;
DROP POLICY IF EXISTS "Users can delete own gmail tokens" ON user_gmail_tokens;

-- Allow authenticated users AND service role to insert
CREATE POLICY "Users and service role can insert gmail tokens" 
  ON user_gmail_tokens 
  FOR INSERT 
  TO authenticated, service_role
  WITH CHECK (true);

-- Allow authenticated users to delete own tokens, service role can delete any
CREATE POLICY "Users can delete own gmail tokens, service role all" 
  ON user_gmail_tokens 
  FOR DELETE 
  TO authenticated, service_role
  USING (
    current_user = 'service_role'::name 
    OR user_id = auth.uid() 
    OR (auth.jwt() ->> 'app_role') = 'admin'
  );