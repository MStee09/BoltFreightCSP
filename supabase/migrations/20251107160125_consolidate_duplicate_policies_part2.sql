/*
  # Consolidate Duplicate Permissive Policies - Part 2

  1. Security Enhancement
    - Merge duplicate permissive policies into single policies
  
  2. Tables Affected
    - interactions
    - report_snapshots
    - shipments
    - tariffs
*/

-- ============================================================
-- INTERACTIONS TABLE
-- ============================================================

DROP POLICY IF EXISTS "Mock user can view interactions" ON public.interactions;
DROP POLICY IF EXISTS "Users can view own interactions" ON public.interactions;
CREATE POLICY "Users can view interactions"
  ON public.interactions
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Mock user can insert interactions" ON public.interactions;
DROP POLICY IF EXISTS "Users can insert own interactions" ON public.interactions;
CREATE POLICY "Users can insert interactions"
  ON public.interactions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Mock user can delete interactions" ON public.interactions;
DROP POLICY IF EXISTS "Users can delete own interactions" ON public.interactions;
CREATE POLICY "Users can delete interactions"
  ON public.interactions
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================
-- REPORT_SNAPSHOTS TABLE
-- ============================================================

DROP POLICY IF EXISTS "Mock user can view report_snapshots" ON public.report_snapshots;
DROP POLICY IF EXISTS "Users can view own report_snapshots" ON public.report_snapshots;
CREATE POLICY "Users can view report_snapshots"
  ON public.report_snapshots
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Mock user can insert report_snapshots" ON public.report_snapshots;
DROP POLICY IF EXISTS "Users can insert own report_snapshots" ON public.report_snapshots;
CREATE POLICY "Users can insert report_snapshots"
  ON public.report_snapshots
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Mock user can update report_snapshots" ON public.report_snapshots;
DROP POLICY IF EXISTS "Users can update own report_snapshots" ON public.report_snapshots;
CREATE POLICY "Users can update report_snapshots"
  ON public.report_snapshots
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Mock user can delete report_snapshots" ON public.report_snapshots;
DROP POLICY IF EXISTS "Users can delete own report_snapshots" ON public.report_snapshots;
CREATE POLICY "Users can delete report_snapshots"
  ON public.report_snapshots
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================
-- SHIPMENTS TABLE
-- ============================================================

DROP POLICY IF EXISTS "Mock user can view shipments" ON public.shipments;
DROP POLICY IF EXISTS "Users can view own shipments" ON public.shipments;
CREATE POLICY "Users can view shipments"
  ON public.shipments
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Mock user can insert shipments" ON public.shipments;
DROP POLICY IF EXISTS "Users can insert own shipments" ON public.shipments;
CREATE POLICY "Users can insert shipments"
  ON public.shipments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Mock user can delete shipments" ON public.shipments;
DROP POLICY IF EXISTS "Users can delete own shipments" ON public.shipments;
CREATE POLICY "Users can delete shipments"
  ON public.shipments
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================
-- TARIFFS TABLE
-- ============================================================

DROP POLICY IF EXISTS "Mock user can view tariffs" ON public.tariffs;
DROP POLICY IF EXISTS "Users can view own tariffs" ON public.tariffs;
CREATE POLICY "Users can view tariffs"
  ON public.tariffs
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Mock user can insert tariffs" ON public.tariffs;
DROP POLICY IF EXISTS "Users can insert own tariffs" ON public.tariffs;
CREATE POLICY "Users can insert tariffs"
  ON public.tariffs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Mock user can update tariffs" ON public.tariffs;
DROP POLICY IF EXISTS "Users can update own tariffs" ON public.tariffs;
CREATE POLICY "Users can update tariffs"
  ON public.tariffs
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Mock user can delete tariffs" ON public.tariffs;
DROP POLICY IF EXISTS "Users can delete own tariffs" ON public.tariffs;
CREATE POLICY "Users can delete tariffs"
  ON public.tariffs
  FOR DELETE
  TO authenticated
  USING (true);
