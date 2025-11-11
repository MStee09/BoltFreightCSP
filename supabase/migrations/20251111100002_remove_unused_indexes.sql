/*
  # Remove Unused Indexes

  1. Changes
    - Drop indexes that are not being used by queries
    - Keep foreign key indexes and commonly used indexes
    - Reduce index maintenance overhead

  2. Performance
    - Less index maintenance during writes
    - Reduced storage usage
*/

-- Drop unused automation indexes
DROP INDEX IF EXISTS idx_automation_rules_type;
DROP INDEX IF EXISTS idx_automation_rules_enabled;
DROP INDEX IF EXISTS idx_automation_rules_next_run;
DROP INDEX IF EXISTS idx_automation_logs_rule_id;
DROP INDEX IF EXISTS idx_automation_logs_created_at;
DROP INDEX IF EXISTS idx_automation_logs_status;

-- Drop unused daily_digests indexes
DROP INDEX IF EXISTS idx_daily_digests_unread;

-- Drop unused alerts indexes
DROP INDEX IF EXISTS idx_alerts_assigned_to;
DROP INDEX IF EXISTS idx_alerts_resolved_by;

-- Drop unused calendar_events indexes
DROP INDEX IF EXISTS idx_calendar_events_csp_event_id;
DROP INDEX IF EXISTS idx_calendar_events_customer_id;

-- Drop unused csp_event_carriers indexes
DROP INDEX IF EXISTS idx_csp_event_carriers_carrier_id;

-- Drop unused csp_stage_history indexes
DROP INDEX IF EXISTS idx_csp_stage_history_customer_id;

-- Drop unused email indexes
DROP INDEX IF EXISTS idx_email_activities_carrier_id;
DROP INDEX IF EXISTS idx_email_activities_created_by;
DROP INDEX IF EXISTS idx_email_templates_created_by;

-- Drop unused knowledge_base indexes
DROP INDEX IF EXISTS idx_knowledge_base_documents_uploaded_by;

-- Drop unused lost_opportunities indexes
DROP INDEX IF EXISTS idx_lost_opportunities_csp_event_id;
DROP INDEX IF EXISTS idx_lost_opportunities_customer_id;

-- Drop unused role_permissions indexes
DROP INDEX IF EXISTS idx_role_permissions_permission_id;

-- Drop unused shipments indexes
DROP INDEX IF EXISTS idx_shipments_customer_id;

-- Drop unused strategy_snapshots indexes
DROP INDEX IF EXISTS idx_strategy_snapshots_created_by;
DROP INDEX IF EXISTS idx_strategy_snapshots_csp_event_id;

-- Drop unused tariff_activities indexes
DROP INDEX IF EXISTS idx_tariff_activities_created_by;
DROP INDEX IF EXISTS idx_tariff_activities_tariff_id;
DROP INDEX IF EXISTS idx_tariff_activities_csp_event_id;
DROP INDEX IF EXISTS idx_tariff_activities_family_id;

-- Drop unused tariff_sop_revisions indexes
DROP INDEX IF EXISTS idx_tariff_sop_revisions_changed_by;
DROP INDEX IF EXISTS idx_tariff_sop_revisions_sop_id;

-- Drop unused tariffs indexes
DROP INDEX IF EXISTS idx_tariffs_created_by;
DROP INDEX IF EXISTS idx_tariffs_csp_event_id;
DROP INDEX IF EXISTS idx_tariffs_superseded_by_id;
DROP INDEX IF EXISTS idx_tariffs_carrier_id;
DROP INDEX IF EXISTS idx_tariffs_reference_id;
DROP INDEX IF EXISTS idx_tariffs_renewal_csp;

-- Drop unused tariff_audit_log indexes
DROP INDEX IF EXISTS idx_tariff_audit_log_tariff_id;
DROP INDEX IF EXISTS idx_tariff_audit_log_changed_at;

-- Drop unused csp_events indexes
DROP INDEX IF EXISTS idx_csp_events_related_family;

-- Drop unused user indexes
DROP INDEX IF EXISTS idx_user_feedback_user_id;
DROP INDEX IF EXISTS idx_user_invitations_invited_by;
DROP INDEX IF EXISTS idx_user_profiles_created_by;
