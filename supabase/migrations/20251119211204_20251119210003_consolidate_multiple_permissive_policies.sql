/*
  # Consolidate Multiple Permissive Policies

  Consolidates multiple permissive RLS policies into single policies where appropriate.
  Multiple permissive policies on the same table/action can cause confusion and are redundant.
  
  ## Consolidated policies:
  
  ### documents (4 actions)
  - SELECT, INSERT, UPDATE, DELETE: Merges mock user and regular user policies
  
  ### user_gmail_credentials (SELECT action)
  - Merges admin and user view policies
  
  ### user_gmail_tokens (SELECT action)
  - Merges admin and user view policies
  
  ## Performance impact:
  - Simplifies policy evaluation logic
  - Reduces number of policy checks per query
*/

-- documents: Consolidate SELECT policies
DROP POLICY IF EXISTS "Mock user can view documents" ON documents;
DROP POLICY IF EXISTS "Users can view their own documents" ON documents;
CREATE POLICY "Users and mock can view documents"
  ON documents FOR SELECT
  TO authenticated
  USING (
    uploaded_by = (SELECT auth.uid()::text)
    OR uploaded_by = '00000000-0000-0000-0000-000000000000'
  );

-- documents: Consolidate INSERT policies
DROP POLICY IF EXISTS "Mock user can insert documents" ON documents;
DROP POLICY IF EXISTS "Users can insert their own documents" ON documents;
CREATE POLICY "Users and mock can insert documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = (SELECT auth.uid()::text)
    OR uploaded_by = '00000000-0000-0000-0000-000000000000'
  );

-- documents: Consolidate UPDATE policies
DROP POLICY IF EXISTS "Mock user can update documents" ON documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON documents;
CREATE POLICY "Users and mock can update documents"
  ON documents FOR UPDATE
  TO authenticated
  USING (
    uploaded_by = (SELECT auth.uid()::text)
    OR uploaded_by = '00000000-0000-0000-0000-000000000000'
  )
  WITH CHECK (
    uploaded_by = (SELECT auth.uid()::text)
    OR uploaded_by = '00000000-0000-0000-0000-000000000000'
  );

-- documents: Consolidate DELETE policies
DROP POLICY IF EXISTS "Mock user can delete documents" ON documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON documents;
CREATE POLICY "Users and mock can delete documents"
  ON documents FOR DELETE
  TO authenticated
  USING (
    uploaded_by = (SELECT auth.uid()::text)
    OR uploaded_by = '00000000-0000-0000-0000-000000000000'
  );

-- user_gmail_credentials: Consolidate SELECT policies
DROP POLICY IF EXISTS "Admins can view any gmail credentials for impersonation" ON user_gmail_credentials;
DROP POLICY IF EXISTS "Users can view own Gmail credentials" ON user_gmail_credentials;
CREATE POLICY "Users can view own credentials, admins can view all"
  ON user_gmail_credentials FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR ((SELECT auth.jwt() ->> 'app_role') = 'admin')
  );

-- user_gmail_tokens: Consolidate SELECT policies
DROP POLICY IF EXISTS "Admins can view any gmail tokens for impersonation" ON user_gmail_tokens;
DROP POLICY IF EXISTS "Users can view own gmail tokens" ON user_gmail_tokens;
CREATE POLICY "Users can view own tokens, admins can view all"
  ON user_gmail_tokens FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR ((SELECT auth.jwt() ->> 'app_role') = 'admin')
  );
