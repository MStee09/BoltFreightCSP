/*
  # Fix Security Issues - Part 3: Remove Unused Indexes

  1. Changes
    - Drop indexes that are not being used by queries
    - This reduces storage overhead and improves write performance
    - Indexes can be recreated later if needed

  2. Indexes Removed
    - Various unused indexes across multiple tables
*/

-- Drop unused indexes from automation tables
DROP INDEX IF EXISTS idx_automation_rules_type;
DROP INDEX IF EXISTS idx_automation_rules_enabled;
DROP INDEX IF EXISTS idx_automation_rules_next_run;
DROP INDEX IF EXISTS idx_automation_logs_rule_id;
DROP INDEX IF EXISTS idx_automation_logs_created_at;
DROP INDEX IF EXISTS idx_automation_logs_status;

-- Drop unused indexes from daily_digests
DROP INDEX IF EXISTS idx_daily_digests_unread;

-- Drop unused indexes from alerts
DROP INDEX IF EXISTS idx_alerts_assigned_to;
DROP INDEX IF EXISTS idx_alerts_resolved_by;

-- Drop unused indexes from calendar_events
DROP INDEX IF EXISTS idx_calendar_events_csp_event_id;
DROP INDEX IF EXISTS idx_calendar_events_customer_id;

-- Drop unused indexes from csp_event_carriers
DROP INDEX IF EXISTS idx_csp_event_carriers_carrier_id;

-- Drop unused indexes from csp_stage_history
DROP INDEX IF EXISTS idx_csp_stage_history_customer_id;

-- Drop unused indexes from email_activities
DROP INDEX IF EXISTS idx_email_activities_carrier_id;
DROP INDEX IF EXISTS idx_email_activities_created_by;
DROP INDEX IF EXISTS idx_email_activities_thread_status;
DROP INDEX IF EXISTS idx_email_activities_owner_id;

-- Drop unused indexes from email_templates
DROP INDEX IF EXISTS idx_email_templates_created_by;

-- Drop unused indexes from email_thread_comments
DROP INDEX IF EXISTS idx_email_thread_comments_thread_id;
DROP INDEX IF EXISTS idx_email_thread_comments_created_by;
DROP INDEX IF EXISTS idx_email_thread_comments_mentioned;

-- Drop unused indexes from email_audit_log
DROP INDEX IF EXISTS idx_email_audit_log_event_type;
DROP INDEX IF EXISTS idx_email_audit_log_timestamp;
DROP INDEX IF EXISTS idx_email_audit_log_user_id;

-- Drop unused indexes from knowledge_base_documents
DROP INDEX IF EXISTS idx_knowledge_base_documents_uploaded_by;

-- Drop unused indexes from lost_opportunities
DROP INDEX IF EXISTS idx_lost_opportunities_csp_event_id;
DROP INDEX IF EXISTS idx_lost_opportunities_customer_id;

-- Drop unused indexes from role_permissions
DROP INDEX IF EXISTS idx_role_permissions_permission_id;

-- Drop unused indexes from shipments
DROP INDEX IF EXISTS idx_shipments_customer_id;

-- Drop unused indexes from strategy_snapshots
DROP INDEX IF EXISTS idx_strategy_snapshots_created_by;
DROP INDEX IF EXISTS idx_strategy_snapshots_csp_event_id;

-- Drop unused indexes from tariff tables
DROP INDEX IF EXISTS idx_tariff_activities_created_by;
DROP INDEX IF EXISTS idx_tariff_activities_tariff_id;
DROP INDEX IF EXISTS idx_tariff_activities_csp_event_id;
DROP INDEX IF EXISTS idx_tariff_activities_family_id;
DROP INDEX IF EXISTS idx_tariff_sop_revisions_changed_by;
DROP INDEX IF EXISTS idx_tariff_sop_revisions_sop_id;
DROP INDEX IF EXISTS idx_tariff_audit_log_tariff_id;
DROP INDEX IF EXISTS idx_tariff_audit_log_changed_at;
DROP INDEX IF EXISTS idx_tariffs_created_by;
DROP INDEX IF EXISTS idx_tariffs_csp_event_id;
DROP INDEX IF EXISTS idx_tariffs_superseded_by_id;
DROP INDEX IF EXISTS idx_tariffs_carrier_id;
DROP INDEX IF EXISTS idx_tariffs_reference_id;
DROP INDEX IF EXISTS idx_tariffs_renewal_csp;

-- Drop unused indexes from user tables
DROP INDEX IF EXISTS idx_user_feedback_user_id;
DROP INDEX IF EXISTS idx_user_invitations_invited_by;
DROP INDEX IF EXISTS idx_user_profiles_created_by;

-- Drop unused indexes from csp_events
DROP INDEX IF EXISTS idx_csp_events_related_family;

-- Drop unused indexes from freightops_thread_tokens
DROP INDEX IF EXISTS idx_freightops_thread_tokens_token;
DROP INDEX IF EXISTS idx_freightops_thread_tokens_thread_id;
DROP INDEX IF EXISTS idx_freightops_thread_tokens_csp_event_id;
DROP INDEX IF EXISTS idx_freightops_thread_tokens_customer_id;
DROP INDEX IF EXISTS idx_freightops_thread_tokens_carrier_id;
DROP INDEX IF EXISTS idx_freightops_thread_tokens_created_by;