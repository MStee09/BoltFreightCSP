/*
  # Optimize RLS Policies - Part 3c
  
  Optimizes RLS policies by wrapping auth.uid() calls in SELECT subqueries.
  
  This part covers: email_activities, gmail_watch_subscriptions, user_profiles, 
  user_gmail_tokens, csp_stage_history, documents
*/

-- EMAIL_ACTIVITIES
DROP POLICY IF EXISTS "Users can update their own email activities" ON public.email_activities;

CREATE POLICY "Users can update their own email activities"
  ON public.email_activities FOR UPDATE TO authenticated
  USING (created_by = (SELECT auth.uid()))
  WITH CHECK (created_by = (SELECT auth.uid()));

-- GMAIL_WATCH_SUBSCRIPTIONS
DROP POLICY IF EXISTS "Users can view own gmail subscriptions" ON public.gmail_watch_subscriptions;
DROP POLICY IF EXISTS "Users can create own gmail subscriptions" ON public.gmail_watch_subscriptions;
DROP POLICY IF EXISTS "Users can update own gmail subscriptions" ON public.gmail_watch_subscriptions;
DROP POLICY IF EXISTS "Users can delete own gmail subscriptions" ON public.gmail_watch_subscriptions;

CREATE POLICY "Users can view own gmail subscriptions"
  ON public.gmail_watch_subscriptions FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can create own gmail subscriptions"
  ON public.gmail_watch_subscriptions FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own gmail subscriptions"
  ON public.gmail_watch_subscriptions FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own gmail subscriptions"
  ON public.gmail_watch_subscriptions FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- USER_PROFILES
DROP POLICY IF EXISTS "allow_profile_creation" ON public.user_profiles;
DROP POLICY IF EXISTS "users_update_own_profile" ON public.user_profiles;

CREATE POLICY "allow_profile_creation"
  ON public.user_profiles FOR INSERT TO authenticated
  WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "users_update_own_profile"
  ON public.user_profiles FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- USER_GMAIL_TOKENS
DROP POLICY IF EXISTS "Users can view own gmail tokens" ON public.user_gmail_tokens;
DROP POLICY IF EXISTS "Users can insert own gmail tokens" ON public.user_gmail_tokens;
DROP POLICY IF EXISTS "Users can update own gmail tokens" ON public.user_gmail_tokens;
DROP POLICY IF EXISTS "Users can delete own gmail tokens" ON public.user_gmail_tokens;

CREATE POLICY "Users can view own gmail tokens"
  ON public.user_gmail_tokens FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own gmail tokens"
  ON public.user_gmail_tokens FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own gmail tokens"
  ON public.user_gmail_tokens FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own gmail tokens"
  ON public.user_gmail_tokens FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- CSP_STAGE_HISTORY
DROP POLICY IF EXISTS "Users can create stage history" ON public.csp_stage_history;

CREATE POLICY "Users can create stage history"
  ON public.csp_stage_history FOR INSERT TO authenticated
  WITH CHECK (changed_by = (SELECT auth.uid()));

-- DOCUMENTS
DROP POLICY IF EXISTS "Users can view their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can insert their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON public.documents;

CREATE POLICY "Users can view their own documents"
  ON public.documents FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert their own documents"
  ON public.documents FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete their own documents"
  ON public.documents FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));
