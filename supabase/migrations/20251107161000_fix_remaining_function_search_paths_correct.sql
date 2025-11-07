/*
  # Fix Remaining Function Search Paths (Corrected)

  1. Security Enhancement
    - Add immutable search_path to remaining functions with correct signatures
    - Prevents search_path hijacking attacks
  
  2. Functions Updated
    - Email/thread functions
    - Alert functions
    - Tariff functions
    - Invitation functions
    - SOP functions
*/

-- Email and thread functions (with correct signatures)
ALTER FUNCTION public.generate_thread_id(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_inbound_reply() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_user_email_settings(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_email_awaiting_reply(uuid, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.find_parent_thread(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.check_awaiting_reply() SET search_path = public, pg_temp;
ALTER FUNCTION public.merge_email_threads(text, text) SET search_path = public, pg_temp;

-- Alert functions
ALTER FUNCTION public.get_default_alert_preferences() SET search_path = public, pg_temp;

-- Tariff functions
ALTER FUNCTION public.generate_tariff_family_id(uuid, uuid[], text) SET search_path = public, pg_temp;

-- Invitation functions
ALTER FUNCTION public.cancel_existing_invitations() SET search_path = public, pg_temp;

-- SOP functions
ALTER FUNCTION public.create_sop_revision() SET search_path = public, pg_temp;
