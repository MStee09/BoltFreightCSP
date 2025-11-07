/*
  # Fix Function Search Paths (Corrected)

  1. Security Enhancement
    - Add immutable search_path to all functions
    - Prevents search_path hijacking attacks
    - Uses correct function signatures
  
  2. Functions Updated
    - All functions with mutable search paths
*/

-- Permission functions (with correct signatures)
ALTER FUNCTION public.get_user_permissions() SET search_path = public, pg_temp;
ALTER FUNCTION public.user_has_permission(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_user_role() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_user_role(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_admin() SET search_path = public, pg_temp;

-- Alert functions
ALTER FUNCTION public.resurface_dismissed_alerts() SET search_path = public, pg_temp;

-- Gmail/email functions  
ALTER FUNCTION public.update_user_gmail_credentials_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_email_settings_updated_at() SET search_path = public, pg_temp;

-- Onboarding functions
ALTER FUNCTION public.create_user_onboarding_state() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_onboarding_updated_at() SET search_path = public, pg_temp;

-- Feedback functions
ALTER FUNCTION public.update_feedback_updated_at() SET search_path = public, pg_temp;

-- Document functions
ALTER FUNCTION public.log_document_activity() SET search_path = public, pg_temp;

-- Notification functions
ALTER FUNCTION public.notify_csp_assignment() SET search_path = public, pg_temp;

-- CSP event functions
ALTER FUNCTION public.log_csp_stage_to_carriers() SET search_path = public, pg_temp;
ALTER FUNCTION public.log_carrier_to_csp_assignment() SET search_path = public, pg_temp;
ALTER FUNCTION public.track_csp_stage_change() SET search_path = public, pg_temp;
ALTER FUNCTION public.track_initial_csp_stage() SET search_path = public, pg_temp;
ALTER FUNCTION public.log_csp_event_as_interaction() SET search_path = public, pg_temp;
ALTER FUNCTION public.log_csp_event_update_as_interaction() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_csp_event_carriers_updated_date() SET search_path = public, pg_temp;

-- Tariff functions
ALTER FUNCTION public.log_tariff_activity() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_tariff_expiring_status() SET search_path = public, pg_temp;
ALTER FUNCTION public.log_tariff_as_interaction() SET search_path = public, pg_temp;
ALTER FUNCTION public.log_tariff_update_as_interaction() SET search_path = public, pg_temp;

-- SOP functions
ALTER FUNCTION public.log_sop_activity() SET search_path = public, pg_temp;

-- Invitation functions
ALTER FUNCTION public.generate_invitation_token() SET search_path = public, pg_temp;
ALTER FUNCTION public.expire_old_invitations() SET search_path = public, pg_temp;

-- Utility functions
ALTER FUNCTION public.generate_tracking_code() SET search_path = public, pg_temp;

-- AI chatbot functions
ALTER FUNCTION public.update_ai_chatbot_settings_updated_at() SET search_path = public, pg_temp;

-- Knowledge base functions
ALTER FUNCTION public.update_knowledge_base_documents_updated_at() SET search_path = public, pg_temp;

-- Carrier contact functions
ALTER FUNCTION public.update_carrier_contacts_updated_date() SET search_path = public, pg_temp;
