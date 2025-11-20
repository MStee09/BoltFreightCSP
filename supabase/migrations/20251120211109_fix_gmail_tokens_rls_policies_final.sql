/*
  # Fix Gmail Tokens RLS Policies - Final Solution
  
  ## Problem
  Multiple overlapping policies causing confusion and blocking inserts.
  The "TEMP: Allow all inserts for debugging" policy is too permissive.
  
  ## Solution
  Replace all policies with clean, simple, working policies that:
  - Allow service role full access (for edge functions)
  - Allow authenticated users to manage their own tokens
  - Support UPSERT operations properly
  
  ## Changes
  1. Drop ALL existing policies
  2. Create 4 simple policies (SELECT, INSERT, UPDATE, DELETE)
  3. Each policy checks: service_role OR own user_id
  
  ## Security
  - Service role can access all records (needed for edge functions)
  - Users can only access their own records (auth.uid() check)
  - No admin special cases - admins use service role
*/

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own gmail tokens" ON user_gmail_tokens;
DROP POLICY IF EXISTS "Users can insert own gmail tokens" ON user_gmail_tokens;
DROP POLICY IF EXISTS "Users can update own gmail tokens" ON user_gmail_tokens;
DROP POLICY IF EXISTS "Users can delete own gmail tokens" ON user_gmail_tokens;
DROP POLICY IF EXISTS "Users and service role can insert gmail tokens" ON user_gmail_tokens;
DROP POLICY IF EXISTS "Users can delete own gmail tokens, service role all" ON user_gmail_tokens;
DROP POLICY IF EXISTS "Users can view own tokens" ON user_gmail_tokens;
DROP POLICY IF EXISTS "Users can view own tokens, admins can view all" ON user_gmail_tokens;
DROP POLICY IF EXISTS "TEMP: Allow all inserts for debugging" ON user_gmail_tokens;

-- CREATE CLEAN, SIMPLE POLICIES

-- SELECT: Service role can read all, users can read their own
CREATE POLICY "gmail_tokens_select" 
  ON user_gmail_tokens 
  FOR SELECT 
  TO anon, authenticated, service_role
  USING (
    current_user = 'service_role'::name 
    OR user_id = auth.uid()
  );

-- INSERT: Service role can insert any, users can insert their own
-- This supports UPSERT operations
CREATE POLICY "gmail_tokens_insert" 
  ON user_gmail_tokens 
  FOR INSERT 
  TO anon, authenticated, service_role
  WITH CHECK (
    current_user = 'service_role'::name 
    OR user_id = auth.uid()
  );

-- UPDATE: Service role can update all, users can update their own
-- This supports UPSERT operations
CREATE POLICY "gmail_tokens_update" 
  ON user_gmail_tokens 
  FOR UPDATE 
  TO anon, authenticated, service_role
  USING (
    current_user = 'service_role'::name 
    OR user_id = auth.uid()
  )
  WITH CHECK (
    current_user = 'service_role'::name 
    OR user_id = auth.uid()
  );

-- DELETE: Service role can delete all, users can delete their own
CREATE POLICY "gmail_tokens_delete" 
  ON user_gmail_tokens 
  FOR DELETE 
  TO anon, authenticated, service_role
  USING (
    current_user = 'service_role'::name 
    OR user_id = auth.uid()
  );