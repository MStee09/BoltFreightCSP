/*
  # Temporarily disable all RLS checks on user_gmail_tokens
  
  This is a TEMPORARY debugging migration to verify that RLS is the issue.
  We'll make the INSERT policy completely permissive to see if data saves.
  
  WARNING: This is NOT secure and should only be used for testing!
*/

-- Make INSERT completely permissive temporarily
DROP POLICY IF EXISTS "Users can insert gmail tokens" ON user_gmail_tokens;

CREATE POLICY "TEMP: Allow all inserts for debugging" 
  ON user_gmail_tokens 
  FOR INSERT 
  TO anon, authenticated, service_role
  WITH CHECK (true);