/*
  # Fix RLS Auth Initialization - Security Audit

  1. Purpose
    - Optimize RLS policies that re-evaluate auth functions for each row
    - Wrap auth.jwt() calls in SELECT statements to evaluate once per query
    - Significantly improves query performance at scale

  2. Changes
    - user_gmail_tokens: Fix "Admins can view any gmail tokens for impersonation"
    - user_invitations: Fix "Admins can create invitations"
    - user_invitations: Fix "Admins can delete invitations"
    - user_invitations: Fix "Users can update invitations"
    - user_gmail_credentials: Fix "Admins can view any gmail credentials for impersonation"

  3. Performance Impact
    - Auth functions evaluated once per query instead of per row
    - Reduces CPU usage and improves response times
    - Better scalability for large datasets
*/

-- Fix user_gmail_tokens policy
DROP POLICY IF EXISTS "Admins can view any gmail tokens for impersonation" ON public.user_gmail_tokens;
CREATE POLICY "Admins can view any gmail tokens for impersonation"
  ON public.user_gmail_tokens
  FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.jwt()->>'app_role') = 'admin'
  );

-- Fix user_invitations policies
DROP POLICY IF EXISTS "Admins can create invitations" ON public.user_invitations;
CREATE POLICY "Admins can create invitations"
  ON public.user_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.jwt()->>'app_role') = 'admin'
  );

DROP POLICY IF EXISTS "Admins can delete invitations" ON public.user_invitations;
CREATE POLICY "Admins can delete invitations"
  ON public.user_invitations
  FOR DELETE
  TO authenticated
  USING (
    (SELECT auth.jwt()->>'app_role') = 'admin'
  );

DROP POLICY IF EXISTS "Users can update invitations" ON public.user_invitations;
CREATE POLICY "Users can update invitations"
  ON public.user_invitations
  FOR UPDATE
  TO authenticated
  USING (
    email = (SELECT auth.jwt()->>'email')
  )
  WITH CHECK (
    email = (SELECT auth.jwt()->>'email')
  );

-- Fix user_gmail_credentials policy
DROP POLICY IF EXISTS "Admins can view any gmail credentials for impersonation" ON public.user_gmail_credentials;
CREATE POLICY "Admins can view any gmail credentials for impersonation"
  ON public.user_gmail_credentials
  FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.jwt()->>'app_role') = 'admin'
  );