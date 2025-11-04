/*
  # Optimize RLS Policies - Part 3b
  
  Optimizes RLS policies by wrapping auth.uid() calls in SELECT subqueries.
  
  This part covers: alerts, lost_opportunities, report_snapshots, carriers, calendar_events
*/

-- ALERTS
DROP POLICY IF EXISTS "Users can view own alerts" ON public.alerts;
DROP POLICY IF EXISTS "Users can insert own alerts" ON public.alerts;
DROP POLICY IF EXISTS "Users can update own alerts" ON public.alerts;
DROP POLICY IF EXISTS "Users can delete own alerts" ON public.alerts;

CREATE POLICY "Users can view own alerts"
  ON public.alerts FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR assigned_to = (SELECT auth.uid()));

CREATE POLICY "Users can insert own alerts"
  ON public.alerts FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own alerts"
  ON public.alerts FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()) OR assigned_to = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()) OR assigned_to = (SELECT auth.uid()));

CREATE POLICY "Users can delete own alerts"
  ON public.alerts FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- LOST_OPPORTUNITIES
DROP POLICY IF EXISTS "Users can view own lost_opportunities" ON public.lost_opportunities;
DROP POLICY IF EXISTS "Users can insert own lost_opportunities" ON public.lost_opportunities;
DROP POLICY IF EXISTS "Users can update own lost_opportunities" ON public.lost_opportunities;
DROP POLICY IF EXISTS "Users can delete own lost_opportunities" ON public.lost_opportunities;

CREATE POLICY "Users can view own lost_opportunities"
  ON public.lost_opportunities FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own lost_opportunities"
  ON public.lost_opportunities FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own lost_opportunities"
  ON public.lost_opportunities FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own lost_opportunities"
  ON public.lost_opportunities FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- REPORT_SNAPSHOTS
DROP POLICY IF EXISTS "Users can view own report_snapshots" ON public.report_snapshots;
DROP POLICY IF EXISTS "Users can insert own report_snapshots" ON public.report_snapshots;
DROP POLICY IF EXISTS "Users can update own report_snapshots" ON public.report_snapshots;
DROP POLICY IF EXISTS "Users can delete own report_snapshots" ON public.report_snapshots;

CREATE POLICY "Users can view own report_snapshots"
  ON public.report_snapshots FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own report_snapshots"
  ON public.report_snapshots FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own report_snapshots"
  ON public.report_snapshots FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own report_snapshots"
  ON public.report_snapshots FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- CARRIERS
DROP POLICY IF EXISTS "Users can view own carriers" ON public.carriers;
DROP POLICY IF EXISTS "Users can insert own carriers" ON public.carriers;
DROP POLICY IF EXISTS "Users can update own carriers" ON public.carriers;
DROP POLICY IF EXISTS "Users can delete own carriers" ON public.carriers;

CREATE POLICY "Users can view own carriers"
  ON public.carriers FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own carriers"
  ON public.carriers FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own carriers"
  ON public.carriers FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own carriers"
  ON public.carriers FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- CALENDAR_EVENTS
DROP POLICY IF EXISTS "Users can view own calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can insert own calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can update own calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can delete own calendar events" ON public.calendar_events;

CREATE POLICY "Users can view own calendar events"
  ON public.calendar_events FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own calendar events"
  ON public.calendar_events FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own calendar events"
  ON public.calendar_events FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own calendar events"
  ON public.calendar_events FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));
