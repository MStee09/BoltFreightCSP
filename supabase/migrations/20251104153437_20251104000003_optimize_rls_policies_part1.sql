/*
  # Optimize RLS Policies - Part 3a
  
  Optimizes RLS policies by wrapping auth.uid() calls in SELECT subqueries
  to prevent per-row re-evaluation, improving query performance at scale.
  
  This part covers: customers, csp_events, tasks, interactions, shipments
*/

-- CUSTOMERS
DROP POLICY IF EXISTS "Users can view own customers" ON public.customers;
DROP POLICY IF EXISTS "Users can insert own customers" ON public.customers;
DROP POLICY IF EXISTS "Users can update own customers" ON public.customers;
DROP POLICY IF EXISTS "Users can delete own customers" ON public.customers;

CREATE POLICY "Users can view own customers"
  ON public.customers FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own customers"
  ON public.customers FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own customers"
  ON public.customers FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own customers"
  ON public.customers FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- CSP_EVENTS
DROP POLICY IF EXISTS "Users can view own csp_events" ON public.csp_events;
DROP POLICY IF EXISTS "Users can insert own csp_events" ON public.csp_events;
DROP POLICY IF EXISTS "Users can update own csp_events" ON public.csp_events;
DROP POLICY IF EXISTS "Users can delete own csp_events" ON public.csp_events;

CREATE POLICY "Users can view own csp_events"
  ON public.csp_events FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own csp_events"
  ON public.csp_events FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own csp_events"
  ON public.csp_events FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own csp_events"
  ON public.csp_events FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- TASKS
DROP POLICY IF EXISTS "Users can view own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can insert own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;

CREATE POLICY "Users can view own tasks"
  ON public.tasks FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own tasks"
  ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own tasks"
  ON public.tasks FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own tasks"
  ON public.tasks FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- INTERACTIONS
DROP POLICY IF EXISTS "Users can view own interactions" ON public.interactions;
DROP POLICY IF EXISTS "Users can insert own interactions" ON public.interactions;
DROP POLICY IF EXISTS "Users can update own interactions" ON public.interactions;
DROP POLICY IF EXISTS "Users can delete own interactions" ON public.interactions;

CREATE POLICY "Users can view own interactions"
  ON public.interactions FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own interactions"
  ON public.interactions FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own interactions"
  ON public.interactions FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own interactions"
  ON public.interactions FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- SHIPMENTS
DROP POLICY IF EXISTS "Users can view own shipments" ON public.shipments;
DROP POLICY IF EXISTS "Users can insert own shipments" ON public.shipments;
DROP POLICY IF EXISTS "Users can update own shipments" ON public.shipments;
DROP POLICY IF EXISTS "Users can delete own shipments" ON public.shipments;

CREATE POLICY "Users can view own shipments"
  ON public.shipments FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own shipments"
  ON public.shipments FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own shipments"
  ON public.shipments FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own shipments"
  ON public.shipments FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));
