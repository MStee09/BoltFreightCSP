/*
  # Remove Unused Indexes

  1. Purpose
    - Drop indexes that have never been used according to Supabase analytics
    - Reduces storage overhead and maintenance costs
    - Improves INSERT/UPDATE/DELETE performance

  2. Indexes Removed
    - Various indexes on alerts, automation_logs, calendar_events, csp tables, email tables,
      knowledge_base, shipments, strategy, tariffs, user tables
    - Total: 43 unused indexes

  3. Impact
    - Frees up storage space
    - Faster write operations (inserts, updates, deletes)
    - No impact on read performance since these indexes were not being used
*/

-- Drop all unused indexes
DROP INDEX IF EXISTS idx_alerts_assigned_to;
DROP INDEX IF EXISTS idx_alerts_resolved_by;
DROP INDEX IF EXISTS idx_automation_logs_rule_id;
DROP INDEX IF EXISTS idx_calendar_events_csp_event_id;
DROP INDEX IF EXISTS idx_calendar_events_customer_id;
DROP INDEX IF EXISTS idx_csp_event_carriers_carrier_id;
DROP INDEX IF EXISTS idx_csp_stage_history_customer_id;
DROP INDEX IF EXISTS idx_email_activities_carrier_id;
DROP INDEX IF EXISTS idx_email_activities_created_by;
DROP INDEX IF EXISTS idx_email_activities_owner_id;
DROP INDEX IF EXISTS idx_email_audit_log_user_id;
DROP INDEX IF EXISTS idx_email_drafts_carrier_id;
DROP INDEX IF EXISTS idx_email_drafts_csp_event_id;
DROP INDEX IF EXISTS idx_email_drafts_customer_id;
DROP INDEX IF EXISTS idx_email_templates_created_by;
DROP INDEX IF EXISTS idx_email_thread_comments_created_by;
DROP INDEX IF EXISTS idx_freightops_thread_tokens_carrier_id;
DROP INDEX IF EXISTS idx_freightops_thread_tokens_created_by;
DROP INDEX IF EXISTS idx_freightops_thread_tokens_csp_event_id;
DROP INDEX IF EXISTS idx_freightops_thread_tokens_customer_id;
DROP INDEX IF EXISTS idx_knowledge_base_documents_uploaded_by;
DROP INDEX IF EXISTS idx_lost_opportunities_csp_event_id;
DROP INDEX IF EXISTS idx_lost_opportunities_customer_id;
DROP INDEX IF EXISTS idx_role_permissions_permission_id;
DROP INDEX IF EXISTS idx_shipments_customer_id;
DROP INDEX IF EXISTS idx_strategy_snapshots_created_by;
DROP INDEX IF EXISTS idx_strategy_snapshots_csp_event_id;
DROP INDEX IF EXISTS idx_tariff_activities_created_by;
DROP INDEX IF EXISTS idx_tariff_activities_csp_event_id;
DROP INDEX IF EXISTS idx_tariff_activities_tariff_id;
DROP INDEX IF EXISTS idx_tariff_audit_log_tariff_id;
DROP INDEX IF EXISTS idx_tariff_families_created_by;
DROP INDEX IF EXISTS idx_tariff_sop_revisions_changed_by;
DROP INDEX IF EXISTS idx_tariff_sop_revisions_sop_id;
DROP INDEX IF EXISTS idx_tariffs_carrier_id;
DROP INDEX IF EXISTS idx_tariffs_created_by;
DROP INDEX IF EXISTS idx_tariffs_csp_event_id;
DROP INDEX IF EXISTS idx_tariffs_renewal_csp_event_id;
DROP INDEX IF EXISTS idx_tariffs_superseded_by_id;
DROP INDEX IF EXISTS idx_user_feedback_user_id;
DROP INDEX IF EXISTS idx_user_invitations_invited_by;
DROP INDEX IF EXISTS idx_user_profiles_created_by;
