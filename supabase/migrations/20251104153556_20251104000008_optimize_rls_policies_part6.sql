/*
  # Optimize RLS Policies - Part 3f
  
  Optimizes RLS policies by wrapping auth.uid() calls in SELECT subqueries.
  
  This part covers: tariffs, notifications, user_onboarding_state
*/

-- TARIFFS
DROP POLICY IF EXISTS "Users can view own tariffs" ON public.tariffs;
DROP POLICY IF EXISTS "Users can insert own tariffs" ON public.tariffs;
DROP POLICY IF EXISTS "Users can update own tariffs" ON public.tariffs;
DROP POLICY IF EXISTS "Users can delete own tariffs" ON public.tariffs;

CREATE POLICY "Users can view own tariffs"
  ON public.tariffs FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own tariffs"
  ON public.tariffs FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own tariffs"
  ON public.tariffs FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own tariffs"
  ON public.tariffs FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- NOTIFICATIONS
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;

CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- USER_ONBOARDING_STATE
DROP POLICY IF EXISTS "Users can view own onboarding state" ON public.user_onboarding_state;
DROP POLICY IF EXISTS "Users can insert own onboarding state" ON public.user_onboarding_state;
DROP POLICY IF EXISTS "Users can update own onboarding state" ON public.user_onboarding_state;

CREATE POLICY "Users can view own onboarding state"
  ON public.user_onboarding_state FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own onboarding state"
  ON public.user_onboarding_state FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own onboarding state"
  ON public.user_onboarding_state FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
