/*
  # Optimize RLS Policies - System Settings Table (Final Fix)

  1. Performance Optimization
    - Replace auth.uid() with (select auth.uid()) in RLS policies
    - user_profiles uses 'id' not 'user_id'
  
  2. Table Affected
    - system_settings: 3 policies
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can insert system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Admins can update system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Admins can delete system settings" ON public.system_settings;

-- Recreate with optimized auth function calls
CREATE POLICY "Admins can insert system settings"
  ON public.system_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update system settings"
  ON public.system_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete system settings"
  ON public.system_settings
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );
