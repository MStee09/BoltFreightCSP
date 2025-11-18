/*
  # Consolidate Multiple Permissive Policies - Security Audit

  1. Purpose
    - Consolidate duplicate permissive policies into single policies
    - Simplifies RLS policy management
    - Improves query planning performance

  2. Changes
    - user_alert_preferences: Consolidate 4 duplicate policies into 1 comprehensive policy
    - user_gmail_credentials: Keep both policies (serve different purposes: admin vs user access)
    - user_gmail_tokens: Keep both policies (serve different purposes: admin vs user access)

  3. Policies Modified
    - user_alert_preferences: Remove duplicate policies, keep single "manage" policy
    
  Note: The gmail policies are intentionally kept separate as they serve different security purposes
  (admin impersonation vs user self-access)
*/

-- user_alert_preferences: Remove individual policies and create one comprehensive policy
DROP POLICY IF EXISTS "Users can delete own alert preferences" ON public.user_alert_preferences;
DROP POLICY IF EXISTS "Users can insert own alert preferences" ON public.user_alert_preferences;
DROP POLICY IF EXISTS "Users can view own alert preferences" ON public.user_alert_preferences;
DROP POLICY IF EXISTS "Users can update own alert preferences" ON public.user_alert_preferences;

-- Keep/recreate the comprehensive management policy
DROP POLICY IF EXISTS "Users can manage own alert preferences" ON public.user_alert_preferences;
CREATE POLICY "Users can manage own alert preferences"
  ON public.user_alert_preferences
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());