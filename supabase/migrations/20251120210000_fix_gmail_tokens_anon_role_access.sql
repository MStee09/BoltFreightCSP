/*
  # Fix Gmail tokens access for anon role

  The Supabase JS client from the browser uses the 'anon' role, not 'authenticated'.
  Even though the JWT contains user authentication info, the role is still 'anon'.
  
  This migration updates the RLS policies to allow the 'anon' role to access
  user_gmail_tokens when authenticated via JWT.

  Changes:
  - Update INSERT policy to include 'anon' role and check auth.uid()
  - Update DELETE policy to include 'anon' role and check auth.uid()
  - Update SELECT policy to include 'anon' role
  - Update UPDATE policy to include 'anon' role
*/

-- Drop and recreate INSERT policy with anon role
DROP POLICY IF EXISTS "Users and service role can insert gmail tokens" ON user_gmail_tokens;

CREATE POLICY "Users can insert gmail tokens" 
  ON user_gmail_tokens 
  FOR INSERT 
  TO anon, authenticated, service_role
  WITH CHECK (
    current_user = 'service_role'::name 
    OR auth.uid() = user_id
  );

-- Drop and recreate DELETE policy with anon role
DROP POLICY IF EXISTS "Users can delete own gmail tokens, service role all" ON user_gmail_tokens;

CREATE POLICY "Users can delete own gmail tokens" 
  ON user_gmail_tokens 
  FOR DELETE 
  TO anon, authenticated, service_role
  USING (
    current_user = 'service_role'::name 
    OR user_id = auth.uid() 
    OR (auth.jwt() ->> 'app_role') = 'admin'
  );

-- Update SELECT policy to include anon role
DROP POLICY IF EXISTS "Users can view own tokens, admins can view all" ON user_gmail_tokens;

CREATE POLICY "Users can view own tokens" 
  ON user_gmail_tokens 
  FOR SELECT 
  TO anon, authenticated, service_role
  USING (
    current_user = 'service_role'::name
    OR user_id = auth.uid() 
    OR (auth.jwt() ->> 'app_role') = 'admin'
  );

-- Update UPDATE policy to include anon role  
DROP POLICY IF EXISTS "Users can update own gmail tokens" ON user_gmail_tokens;

CREATE POLICY "Users can update own gmail tokens" 
  ON user_gmail_tokens 
  FOR UPDATE 
  TO anon, authenticated, service_role
  USING (
    current_user = 'service_role'::name
    OR user_id = auth.uid() 
    OR (auth.jwt() ->> 'app_role') = 'admin'
  )
  WITH CHECK (
    current_user = 'service_role'::name
    OR user_id = auth.uid() 
    OR (auth.jwt() ->> 'app_role') = 'admin'
  );