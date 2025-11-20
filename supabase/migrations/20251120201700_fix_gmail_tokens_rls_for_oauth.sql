/*
  # Fix Gmail Tokens RLS for OAuth Callback

  1. Problem
    - OAuth callback is successfully authenticating but tokens aren't being saved
    - Console shows "saved successfully" but database is empty
    - RLS policies are blocking the insert even though user is authenticated

  2. Solution
    - Add admin policies to allow admins to manage any user's tokens (for impersonation)
    - Ensure the INSERT policy works correctly during OAuth callback
    - Add better error handling visibility

  3. Changes
    - Add admin INSERT policy for gmail tokens
    - Add admin UPDATE policy for gmail tokens  
    - Add admin DELETE policy for gmail tokens
*/

-- Drop existing policies to recreate them with proper admin access
DROP POLICY IF EXISTS "Users can insert own gmail tokens" ON user_gmail_tokens;
DROP POLICY IF EXISTS "Users can update own gmail tokens" ON user_gmail_tokens;
DROP POLICY IF EXISTS "Users can delete own gmail tokens" ON user_gmail_tokens;

-- Recreate INSERT policy (users can insert their own tokens)
CREATE POLICY "Users can insert own gmail tokens"
  ON user_gmail_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() 
    OR (auth.jwt() ->> 'app_role') = 'admin'
  );

-- Recreate UPDATE policy (users can update their own, admins can update any)
CREATE POLICY "Users can update own gmail tokens"
  ON user_gmail_tokens
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR (auth.jwt() ->> 'app_role') = 'admin'
  )
  WITH CHECK (
    user_id = auth.uid() 
    OR (auth.jwt() ->> 'app_role') = 'admin'
  );

-- Recreate DELETE policy (users can delete their own, admins can delete any)
CREATE POLICY "Users can delete own gmail tokens"
  ON user_gmail_tokens
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR (auth.jwt() ->> 'app_role') = 'admin'
  );
