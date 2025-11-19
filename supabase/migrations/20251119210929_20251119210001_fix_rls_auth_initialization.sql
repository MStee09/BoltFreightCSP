/*
  # Fix RLS Auth Function Initialization

  Optimizes RLS policies by wrapping auth function calls in SELECT statements.
  This prevents re-evaluation of auth functions for each row, improving performance at scale.
  
  ## Fixed policies:
  
  ### user_invitations (3 policies)
  - "Admins can create invitations"
  - "Admins can delete invitations"
  - "Users can update invitations"
  
  ### user_gmail_tokens (1 policy)
  - "Admins can view any gmail tokens for impersonation"
  
  ### user_gmail_credentials (1 policy)
  - "Admins can view any gmail credentials for impersonation"
  
  ### user_alert_preferences (1 policy)
  - "Users can manage own alert preferences"
  
  ### notes (4 policies)
  - "Admins can update any note"
  - "Users can create notes"
  - "Users can soft-delete their own notes"
  - "Users can update their own notes within 1 hour"
  
  ## Performance impact:
  - Auth functions are evaluated once per query instead of once per row
  - Significantly improves performance for large result sets
*/

-- user_invitations policies
DROP POLICY IF EXISTS "Admins can create invitations" ON user_invitations;
CREATE POLICY "Admins can create invitations"
  ON user_invitations FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT (auth.jwt() ->> 'app_role'::text)) = 'admin'::text);

DROP POLICY IF EXISTS "Admins can delete invitations" ON user_invitations;
CREATE POLICY "Admins can delete invitations"
  ON user_invitations FOR DELETE
  TO authenticated
  USING ((SELECT (auth.jwt() ->> 'app_role'::text)) = 'admin'::text);

DROP POLICY IF EXISTS "Users can update invitations" ON user_invitations;
CREATE POLICY "Users can update invitations"
  ON user_invitations FOR UPDATE
  TO authenticated
  USING ((SELECT auth.jwt() ->> 'email'::text) = email)
  WITH CHECK ((SELECT auth.jwt() ->> 'email'::text) = email);

-- user_gmail_tokens policies
DROP POLICY IF EXISTS "Admins can view any gmail tokens for impersonation" ON user_gmail_tokens;
CREATE POLICY "Admins can view any gmail tokens for impersonation"
  ON user_gmail_tokens FOR SELECT
  TO authenticated
  USING ((SELECT (auth.jwt() ->> 'app_role'::text)) = 'admin'::text);

-- user_gmail_credentials policies
DROP POLICY IF EXISTS "Admins can view any gmail credentials for impersonation" ON user_gmail_credentials;
CREATE POLICY "Admins can view any gmail credentials for impersonation"
  ON user_gmail_credentials FOR SELECT
  TO authenticated
  USING ((SELECT (auth.jwt() ->> 'app_role'::text)) = 'admin'::text);

-- user_alert_preferences policies
DROP POLICY IF EXISTS "Users can manage own alert preferences" ON user_alert_preferences;
CREATE POLICY "Users can manage own alert preferences"
  ON user_alert_preferences
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- notes policies
DROP POLICY IF EXISTS "Admins can update any note" ON notes;
CREATE POLICY "Admins can update any note"
  ON notes FOR UPDATE
  TO authenticated
  USING ((SELECT (auth.jwt() ->> 'app_role'::text)) = 'admin'::text)
  WITH CHECK ((SELECT (auth.jwt() ->> 'app_role'::text)) = 'admin'::text);

DROP POLICY IF EXISTS "Users can create notes" ON notes;
CREATE POLICY "Users can create notes"
  ON notes FOR INSERT
  TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can soft-delete their own notes" ON notes;
CREATE POLICY "Users can soft-delete their own notes"
  ON notes FOR UPDATE
  TO authenticated
  USING (created_by = (SELECT auth.uid()) AND is_deleted = false)
  WITH CHECK (created_by = (SELECT auth.uid()) AND is_deleted = true);

DROP POLICY IF EXISTS "Users can update their own notes within 1 hour" ON notes;
CREATE POLICY "Users can update their own notes within 1 hour"
  ON notes FOR UPDATE
  TO authenticated
  USING (
    created_by = (SELECT auth.uid()) 
    AND created_at > (now() - interval '1 hour')
    AND is_deleted = false
  )
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND is_deleted = false
  );
