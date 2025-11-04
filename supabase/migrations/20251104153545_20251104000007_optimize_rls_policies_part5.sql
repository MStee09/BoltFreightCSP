/*
  # Optimize RLS Policies - Part 3e
  
  Optimizes RLS policies by wrapping auth.uid() calls in SELECT subqueries.
  
  This part covers: user_alert_preferences, user_email_notification_settings,
  user_feedback, tariff_sops, tariff_sop_revisions
*/

-- USER_ALERT_PREFERENCES
DROP POLICY IF EXISTS "Users can view own alert preferences" ON public.user_alert_preferences;
DROP POLICY IF EXISTS "Users can insert own alert preferences" ON public.user_alert_preferences;
DROP POLICY IF EXISTS "Users can update own alert preferences" ON public.user_alert_preferences;
DROP POLICY IF EXISTS "Users can delete own alert preferences" ON public.user_alert_preferences;

CREATE POLICY "Users can view own alert preferences"
  ON public.user_alert_preferences FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own alert preferences"
  ON public.user_alert_preferences FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own alert preferences"
  ON public.user_alert_preferences FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own alert preferences"
  ON public.user_alert_preferences FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- USER_EMAIL_NOTIFICATION_SETTINGS
DROP POLICY IF EXISTS "Users can view own email settings" ON public.user_email_notification_settings;
DROP POLICY IF EXISTS "Admin and elite can modify email settings" ON public.user_email_notification_settings;

CREATE POLICY "Users can view own email settings"
  ON public.user_email_notification_settings FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Admin and elite can modify email settings"
  ON public.user_email_notification_settings FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'elite')
    )
  );

-- USER_FEEDBACK
DROP POLICY IF EXISTS "Users can view own feedback" ON public.user_feedback;
DROP POLICY IF EXISTS "Users can insert own feedback" ON public.user_feedback;
DROP POLICY IF EXISTS "Admins can view all feedback" ON public.user_feedback;
DROP POLICY IF EXISTS "Admins can update all feedback" ON public.user_feedback;

CREATE POLICY "Users can view own feedback"
  ON public.user_feedback FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid()) OR EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  );

CREATE POLICY "Users can insert own feedback"
  ON public.user_feedback FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Admins can update all feedback"
  ON public.user_feedback FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  );

-- TARIFF_SOPS
DROP POLICY IF EXISTS "Users can view their SOPs" ON public.tariff_sops;
DROP POLICY IF EXISTS "Users can create SOPs" ON public.tariff_sops;
DROP POLICY IF EXISTS "Users can update their SOPs" ON public.tariff_sops;
DROP POLICY IF EXISTS "Users can delete their SOPs" ON public.tariff_sops;

CREATE POLICY "Users can view their SOPs"
  ON public.tariff_sops FOR SELECT TO authenticated
  USING (created_by = (SELECT auth.uid()));

CREATE POLICY "Users can create SOPs"
  ON public.tariff_sops FOR INSERT TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY "Users can update their SOPs"
  ON public.tariff_sops FOR UPDATE TO authenticated
  USING (created_by = (SELECT auth.uid()))
  WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY "Users can delete their SOPs"
  ON public.tariff_sops FOR DELETE TO authenticated
  USING (created_by = (SELECT auth.uid()));

-- TARIFF_SOP_REVISIONS
DROP POLICY IF EXISTS "Users can view SOP revisions" ON public.tariff_sop_revisions;

CREATE POLICY "Users can view SOP revisions"
  ON public.tariff_sop_revisions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tariff_sops
      WHERE tariff_sops.id = tariff_sop_revisions.sop_id
      AND tariff_sops.created_by = (SELECT auth.uid())
    )
  );
