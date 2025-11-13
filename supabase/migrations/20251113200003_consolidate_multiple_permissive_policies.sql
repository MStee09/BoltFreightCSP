/*
  # Consolidate Multiple Permissive Policies

  1. Changes
    - Combines multiple permissive policies into single policies with OR conditions
    - Improves query performance by reducing policy evaluation overhead
    - Maintains exact same access control logic

  2. Affected Tables
    - calendar_events: 4 actions (SELECT, INSERT, UPDATE, DELETE)
    - email_threads: 2 actions (UPDATE, DELETE)

  3. Security
    - No security changes, only performance optimization
    - Maintains same access control: users can access their own data OR mock user data
*/

-- =========================================
-- Calendar Events Policies
-- =========================================

-- SELECT: Combine "Mock user can view" and "Users can view own"
DROP POLICY IF EXISTS "Mock user can view calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Users can view own calendar events" ON calendar_events;
CREATE POLICY "Users can view calendar events"
  ON calendar_events FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid()) OR
    user_id = '00000000-0000-0000-0000-000000000000'::uuid
  );

-- INSERT: Combine "Mock user can insert" and "Users can insert own"
DROP POLICY IF EXISTS "Mock user can insert calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Users can insert own calendar events" ON calendar_events;
CREATE POLICY "Users can insert calendar events"
  ON calendar_events FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid()) OR
    user_id = '00000000-0000-0000-0000-000000000000'::uuid
  );

-- UPDATE: Combine "Mock user can update" and "Users can update own"
DROP POLICY IF EXISTS "Mock user can update calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Users can update own calendar events" ON calendar_events;
CREATE POLICY "Users can update calendar events"
  ON calendar_events FOR UPDATE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid()) OR
    user_id = '00000000-0000-0000-0000-000000000000'::uuid
  )
  WITH CHECK (
    user_id = (SELECT auth.uid()) OR
    user_id = '00000000-0000-0000-0000-000000000000'::uuid
  );

-- DELETE: Combine "Mock user can delete" and "Users can delete own"
DROP POLICY IF EXISTS "Mock user can delete calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Users can delete own calendar events" ON calendar_events;
CREATE POLICY "Users can delete calendar events"
  ON calendar_events FOR DELETE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid()) OR
    user_id = '00000000-0000-0000-0000-000000000000'::uuid
  );

-- =========================================
-- Email Threads Policies
-- =========================================

-- UPDATE: Combine "Admins can update any" and "Thread owners can update their threads"
DROP POLICY IF EXISTS "Admins can update any thread" ON email_threads;
DROP POLICY IF EXISTS "Thread owners can update their threads" ON email_threads;
CREATE POLICY "Users can update email threads"
  ON email_threads FOR UPDATE
  TO authenticated
  USING (
    owner_id = (SELECT auth.uid()) OR
    (SELECT auth.jwt()->>'app_role') = 'admin'
  )
  WITH CHECK (
    owner_id = (SELECT auth.uid()) OR
    (SELECT auth.jwt()->>'app_role') = 'admin'
  );

-- DELETE: Combine "Admins can delete any" and "Thread owners can delete their threads"
DROP POLICY IF EXISTS "Admins can delete any thread" ON email_threads;
DROP POLICY IF EXISTS "Thread owners can delete their threads" ON email_threads;
CREATE POLICY "Users can delete email threads"
  ON email_threads FOR DELETE
  TO authenticated
  USING (
    owner_id = (SELECT auth.uid()) OR
    (SELECT auth.jwt()->>'app_role') = 'admin'
  );
