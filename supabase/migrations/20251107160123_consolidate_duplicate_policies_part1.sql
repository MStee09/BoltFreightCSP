/*
  # Consolidate Duplicate Permissive Policies - Part 1

  1. Security Enhancement
    - Merge duplicate permissive policies into single policies
    - Combines "mock user" and regular user access into one policy per action
  
  2. Tables Affected
    - alerts
    - carriers
    - csp_events
    - customers
*/

-- ============================================================
-- ALERTS TABLE
-- ============================================================

DROP POLICY IF EXISTS "Mock user can view alerts" ON public.alerts;
DROP POLICY IF EXISTS "Users can view own alerts" ON public.alerts;
CREATE POLICY "Users can view alerts"
  ON public.alerts
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Mock user can insert alerts" ON public.alerts;
DROP POLICY IF EXISTS "Users can insert own alerts" ON public.alerts;
CREATE POLICY "Users can insert alerts"
  ON public.alerts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Mock user can update alerts" ON public.alerts;
DROP POLICY IF EXISTS "Users can update own alerts" ON public.alerts;
CREATE POLICY "Users can update alerts"
  ON public.alerts
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Mock user can delete alerts" ON public.alerts;
DROP POLICY IF EXISTS "Users can delete own alerts" ON public.alerts;
CREATE POLICY "Users can delete alerts"
  ON public.alerts
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================
-- CARRIERS TABLE
-- ============================================================

DROP POLICY IF EXISTS "Mock user can view carriers" ON public.carriers;
DROP POLICY IF EXISTS "Users can view own carriers" ON public.carriers;
CREATE POLICY "Users can view carriers"
  ON public.carriers
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Mock user can insert carriers" ON public.carriers;
DROP POLICY IF EXISTS "Users can insert own carriers" ON public.carriers;
CREATE POLICY "Users can insert carriers"
  ON public.carriers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Mock user can update carriers" ON public.carriers;
DROP POLICY IF EXISTS "Users can update own carriers" ON public.carriers;
CREATE POLICY "Users can update carriers"
  ON public.carriers
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Mock user can delete carriers" ON public.carriers;
DROP POLICY IF EXISTS "Users can delete own carriers" ON public.carriers;
CREATE POLICY "Users can delete carriers"
  ON public.carriers
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================
-- CSP_EVENTS TABLE
-- ============================================================

DROP POLICY IF EXISTS "Mock user can view csp_events" ON public.csp_events;
DROP POLICY IF EXISTS "Users can view own csp_events" ON public.csp_events;
CREATE POLICY "Users can view csp_events"
  ON public.csp_events
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Mock user can insert csp_events" ON public.csp_events;
DROP POLICY IF EXISTS "Users can insert own csp_events" ON public.csp_events;
CREATE POLICY "Users can insert csp_events"
  ON public.csp_events
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Mock user can update csp_events" ON public.csp_events;
DROP POLICY IF EXISTS "Users can update own csp_events" ON public.csp_events;
CREATE POLICY "Users can update csp_events"
  ON public.csp_events
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Mock user can delete csp_events" ON public.csp_events;
DROP POLICY IF EXISTS "Users can delete own csp_events" ON public.csp_events;
CREATE POLICY "Users can delete csp_events"
  ON public.csp_events
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================
-- CUSTOMERS TABLE
-- ============================================================

DROP POLICY IF EXISTS "Mock user can view customers" ON public.customers;
DROP POLICY IF EXISTS "Users can view own customers" ON public.customers;
CREATE POLICY "Users can view customers"
  ON public.customers
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Mock user can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Users can insert own customers" ON public.customers;
CREATE POLICY "Users can insert customers"
  ON public.customers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Mock user can update customers" ON public.customers;
DROP POLICY IF EXISTS "Users can update own customers" ON public.customers;
CREATE POLICY "Users can update customers"
  ON public.customers
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Mock user can delete customers" ON public.customers;
DROP POLICY IF EXISTS "Users can delete own customers" ON public.customers;
CREATE POLICY "Users can delete customers"
  ON public.customers
  FOR DELETE
  TO authenticated
  USING (true);
