/*
  # Fix Security Issues - Part 3: Remove Unused Indexes

  1. Problem
    - Multiple indexes exist that have never been used
    - Unused indexes slow down writes and consume storage

  2. Solution
    - Drop unused indexes
    - Keep only indexes that are actually used by queries

  3. Indexes Removed
    - Automation system indexes (new feature, not used yet)
    - Various foreign key indexes with alternative access patterns
    - Duplicate or redundant indexes
*/

-- Automation system (new feature, not actively used yet)
DROP INDEX IF EXISTS idx_automation_rules_type;
DROP INDEX IF EXISTS idx_automation_rules_enabled;
DROP INDEX IF EXISTS idx_automation_rules_next_run;
DROP INDEX IF EXISTS idx_automation_logs_rule_id;
DROP INDEX IF EXISTS idx_automation_logs_created_at;
DROP INDEX IF EXISTS idx_automation_logs_status;

-- Daily digests
DROP INDEX IF EXISTS idx_daily_digests_unread;

-- Alerts
DROP INDEX IF EXISTS idx_alerts_assigned_to;
DROP INDEX IF EXISTS idx_alerts_resolved_by;

-- Calendar events
DROP INDEX IF EXISTS idx_calendar_events_csp_event_id;
DROP INDEX IF EXISTS idx_calendar_events_customer_id;

-- CSP relationships
DROP INDEX IF EXISTS idx_csp_event_carriers_carrier_id;
DROP INDEX IF EXISTS idx_csp_stage_history_customer_id;
DROP INDEX IF EXISTS idx_csp_events_related_family;

-- Email activities
DROP INDEX IF EXISTS idx_email_activities_carrier_id;
DROP INDEX IF EXISTS idx_email_activities_created_by;

-- Email templates
DROP INDEX IF EXISTS idx_email_templates_created_by;

-- Knowledge base
DROP INDEX IF EXISTS idx_knowledge_base_documents_uploaded_by;

-- Lost opportunities
DROP INDEX IF EXISTS idx_lost_opportunities_csp_event_id;
DROP INDEX IF EXISTS idx_lost_opportunities_customer_id;

-- Role permissions
DROP INDEX IF EXISTS idx_role_permissions_permission_id;

-- Shipments
DROP INDEX IF EXISTS idx_shipments_customer_id;

-- Strategy snapshots
DROP INDEX IF EXISTS idx_strategy_snapshots_created_by;
DROP INDEX IF EXISTS idx_strategy_snapshots_csp_event_id;

-- Tariff activities
DROP INDEX IF EXISTS idx_tariff_activities_created_by;
DROP INDEX IF EXISTS idx_tariff_activities_tariff_id;
DROP INDEX IF EXISTS idx_tariff_activities_csp_event_id;
DROP INDEX IF EXISTS idx_tariff_activities_family_id;

-- Tariff SOP revisions
DROP INDEX IF EXISTS idx_tariff_sop_revisions_changed_by;
DROP INDEX IF EXISTS idx_tariff_sop_revisions_sop_id;

-- Tariffs
DROP INDEX IF EXISTS idx_tariffs_created_by;
DROP INDEX IF EXISTS idx_tariffs_csp_event_id;
DROP INDEX IF EXISTS idx_tariffs_superseded_by_id;
DROP INDEX IF EXISTS idx_tariffs_carrier_id;
DROP INDEX IF EXISTS idx_tariffs_reference_id;
DROP INDEX IF EXISTS idx_tariffs_renewal_csp;

-- Tariff audit log
DROP INDEX IF EXISTS idx_tariff_audit_log_tariff_id;
DROP INDEX IF EXISTS idx_tariff_audit_log_changed_at;

-- User tables
DROP INDEX IF EXISTS idx_user_feedback_user_id;
DROP INDEX IF EXISTS idx_user_invitations_invited_by;
DROP INDEX IF EXISTS idx_user_profiles_created_by;
