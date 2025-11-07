/*
  # Consolidate Duplicate Permissive Policies - Part 3

  1. Security Enhancement
    - Merge duplicate permissive policies into single policies
  
  2. Tables Affected
    - tasks
    - tariff_sops
    - tariff_sop_revisions
    - ai_chatbot_settings
    - user_email_notification_settings
    - user_invitations
*/

-- ============================================================
-- TASKS TABLE
-- ============================================================

DROP POLICY IF EXISTS "Mock user can view tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can view own tasks" ON public.tasks;
CREATE POLICY "Users can view tasks"
  ON public.tasks
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Mock user can insert tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can insert own tasks" ON public.tasks;
CREATE POLICY "Users can insert tasks"
  ON public.tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Mock user can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON public.tasks;
CREATE POLICY "Users can update tasks"
  ON public.tasks
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Mock user can delete tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;
CREATE POLICY "Users can delete tasks"
  ON public.tasks
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================
-- TARIFF_SOPS TABLE
-- ============================================================

DROP POLICY IF EXISTS "Mock user can view mock SOPs" ON public.tariff_sops;
DROP POLICY IF EXISTS "Users can view their SOPs" ON public.tariff_sops;
CREATE POLICY "Users can view SOPs"
  ON public.tariff_sops
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Mock user can create mock SOPs" ON public.tariff_sops;
DROP POLICY IF EXISTS "Users can create SOPs" ON public.tariff_sops;
CREATE POLICY "Users can create SOPs"
  ON public.tariff_sops
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Mock user can update mock SOPs" ON public.tariff_sops;
DROP POLICY IF EXISTS "Users can update their SOPs" ON public.tariff_sops;
CREATE POLICY "Users can update SOPs"
  ON public.tariff_sops
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Mock user can delete mock SOPs" ON public.tariff_sops;
DROP POLICY IF EXISTS "Users can delete their SOPs" ON public.tariff_sops;
CREATE POLICY "Users can delete SOPs"
  ON public.tariff_sops
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================
-- TARIFF_SOP_REVISIONS TABLE
-- ============================================================

DROP POLICY IF EXISTS "Mock user can view mock SOP revisions" ON public.tariff_sop_revisions;
DROP POLICY IF EXISTS "Users can view SOP revisions" ON public.tariff_sop_revisions;
CREATE POLICY "Users can view SOP revisions"
  ON public.tariff_sop_revisions
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- AI_CHATBOT_SETTINGS TABLE
-- ============================================================

DROP POLICY IF EXISTS "Users can read org-wide AI settings" ON public.ai_chatbot_settings;
DROP POLICY IF EXISTS "Users can read own AI settings" ON public.ai_chatbot_settings;
CREATE POLICY "Users can read AI settings"
  ON public.ai_chatbot_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- USER_EMAIL_NOTIFICATION_SETTINGS TABLE
-- ============================================================

DROP POLICY IF EXISTS "Admin and elite can modify email settings" ON public.user_email_notification_settings;
DROP POLICY IF EXISTS "Users can view own email settings" ON public.user_email_notification_settings;
CREATE POLICY "Users can view email settings"
  ON public.user_email_notification_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- USER_INVITATIONS TABLE
-- ============================================================

DROP POLICY IF EXISTS "Admins can view all invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.user_invitations;
CREATE POLICY "Users can view invitations"
  ON public.user_invitations
  FOR SELECT
  TO authenticated
  USING (true);
