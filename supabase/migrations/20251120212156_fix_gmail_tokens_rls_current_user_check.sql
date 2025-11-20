/*
  # Fix Gmail Tokens RLS - Current User Check
  
  ## Problem
  The RLS policies check `CURRENT_USER = 'service_role'::name` which only works
  for service_role connections. When the frontend (authenticated user) tries to
  insert, CURRENT_USER is 'authenticated' not 'service_role', so the check fails.
  
  ## Solution
  Remove the CURRENT_USER check entirely. The policies should:
  - Allow authenticated users to insert/update/delete their own records (auth.uid() check)
  - Service role can do anything (bypasses RLS entirely by default)
  
  ## Changes
  1. Drop existing policies
  2. Create simpler policies without CURRENT_USER checks
  3. Trust that service role bypasses RLS by default
*/

-- Drop existing policies
DROP POLICY IF EXISTS "gmail_tokens_select" ON user_gmail_tokens;
DROP POLICY IF EXISTS "gmail_tokens_insert" ON user_gmail_tokens;
DROP POLICY IF EXISTS "gmail_tokens_update" ON user_gmail_tokens;
DROP POLICY IF EXISTS "gmail_tokens_delete" ON user_gmail_tokens;

-- SELECT: Users can read their own tokens
-- (Service role bypasses RLS so doesn't need explicit check)
CREATE POLICY "gmail_tokens_select" 
  ON user_gmail_tokens 
  FOR SELECT 
  TO authenticated
  USING (user_id = auth.uid());

-- INSERT: Users can insert their own tokens
-- This is critical for the OAuth callback to work
CREATE POLICY "gmail_tokens_insert" 
  ON user_gmail_tokens 
  FOR INSERT 
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- UPDATE: Users can update their own tokens
CREATE POLICY "gmail_tokens_update" 
  ON user_gmail_tokens 
  FOR UPDATE 
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: Users can delete their own tokens
CREATE POLICY "gmail_tokens_delete" 
  ON user_gmail_tokens 
  FOR DELETE 
  TO authenticated
  USING (user_id = auth.uid());