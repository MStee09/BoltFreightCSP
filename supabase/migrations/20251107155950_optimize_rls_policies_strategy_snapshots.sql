/*
  # Optimize RLS Policies - Strategy Snapshots Table

  1. Performance Optimization
    - Replace auth.uid() with (select auth.uid()) in RLS policies
  
  2. Table Affected
    - strategy_snapshots: 2 policies
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can update their own snapshots" ON public.strategy_snapshots;
DROP POLICY IF EXISTS "Users can delete their own snapshots" ON public.strategy_snapshots;

-- Recreate with optimized auth function calls
CREATE POLICY "Users can update their own snapshots"
  ON public.strategy_snapshots
  FOR UPDATE
  TO authenticated
  USING (created_by = (select auth.uid()))
  WITH CHECK (created_by = (select auth.uid()));

CREATE POLICY "Users can delete their own snapshots"
  ON public.strategy_snapshots
  FOR DELETE
  TO authenticated
  USING (created_by = (select auth.uid()));
