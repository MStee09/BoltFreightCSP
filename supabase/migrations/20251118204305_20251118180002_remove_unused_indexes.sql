/*
  # Remove Unused Indexes - Security Audit

  1. Purpose
    - Remove indexes that are not being used by queries
    - Reduces storage overhead and improves write performance
    - Addresses security audit findings

  2. Indexes Removed
    - idx_automation_rules_created_by
    - idx_csp_event_carriers_awarded_by
    - idx_csp_event_carriers_proposed_tariff_id
    - idx_email_threads_owner_id
    - idx_tariff_activities_user_id
    - idx_tariff_audit_log_changed_by
    - idx_tariff_families_active_version_id
    - idx_tariff_families_carrier_id
    - idx_tariffs_activated_by
    - idx_user_impersonation_sessions_admin_user_id
    - idx_user_impersonation_sessions_impersonated_user_id

  3. Performance Impact
    - Reduced storage space
    - Faster INSERT, UPDATE, DELETE operations
    - No negative impact on queries (indexes were not being used)
*/

DROP INDEX IF EXISTS public.idx_automation_rules_created_by;
DROP INDEX IF EXISTS public.idx_csp_event_carriers_awarded_by;
DROP INDEX IF EXISTS public.idx_csp_event_carriers_proposed_tariff_id;
DROP INDEX IF EXISTS public.idx_email_threads_owner_id;
DROP INDEX IF EXISTS public.idx_tariff_activities_user_id;
DROP INDEX IF EXISTS public.idx_tariff_audit_log_changed_by;
DROP INDEX IF EXISTS public.idx_tariff_families_active_version_id;
DROP INDEX IF EXISTS public.idx_tariff_families_carrier_id;
DROP INDEX IF EXISTS public.idx_tariffs_activated_by;
DROP INDEX IF EXISTS public.idx_user_impersonation_sessions_admin_user_id;
DROP INDEX IF EXISTS public.idx_user_impersonation_sessions_impersonated_user_id;