/*
  # Remove Unused Indexes

  1. Purpose
    - Remove database indexes that are not being used by queries
    - Unused indexes consume storage and slow down write operations
    - Improves overall database performance

  2. Indexes Being Removed
    - idx_tariffs_created_by
    - idx_tariffs_csp_event_id
    - idx_tariffs_superseded_by_id
    - idx_user_invitations_invited_by
    - idx_user_profiles_created_by
    - idx_alerts_resolved_by
    - idx_email_activities_created_by
    - idx_email_templates_created_by
    - idx_knowledge_base_documents_uploaded_by
    - idx_lost_opportunities_csp_event_id
    - idx_lost_opportunities_customer_id
    - idx_role_permissions_permission_id
    - idx_shipments_carrier_id
    - idx_strategy_snapshots_created_by
    - idx_strategy_snapshots_csp_event_id
    - idx_tariff_activities_created_by
    - idx_tariff_sop_revisions_changed_by
    - idx_alerts_assigned_to
    - idx_calendar_events_csp_event_id
    - idx_calendar_events_customer_id
    - idx_csp_event_carriers_carrier_id
    - idx_csp_stage_history_customer_id
    - idx_email_activities_carrier_id
    - idx_shipments_customer_id
    - idx_tariff_activities_tariff_id
    - idx_tariff_sop_revisions_sop_id
    - idx_user_feedback_user_id
*/

-- Remove unused indexes from tariffs table
DROP INDEX IF EXISTS idx_tariffs_created_by;
DROP INDEX IF EXISTS idx_tariffs_csp_event_id;
DROP INDEX IF EXISTS idx_tariffs_superseded_by_id;

-- Remove unused indexes from user_invitations table
DROP INDEX IF EXISTS idx_user_invitations_invited_by;

-- Remove unused indexes from user_profiles table
DROP INDEX IF EXISTS idx_user_profiles_created_by;

-- Remove unused indexes from alerts table
DROP INDEX IF EXISTS idx_alerts_resolved_by;
DROP INDEX IF EXISTS idx_alerts_assigned_to;

-- Remove unused indexes from email_activities table
DROP INDEX IF EXISTS idx_email_activities_created_by;
DROP INDEX IF EXISTS idx_email_activities_carrier_id;

-- Remove unused indexes from email_templates table
DROP INDEX IF EXISTS idx_email_templates_created_by;

-- Remove unused indexes from knowledge_base_documents table
DROP INDEX IF EXISTS idx_knowledge_base_documents_uploaded_by;

-- Remove unused indexes from lost_opportunities table
DROP INDEX IF EXISTS idx_lost_opportunities_csp_event_id;
DROP INDEX IF EXISTS idx_lost_opportunities_customer_id;

-- Remove unused indexes from role_permissions table
DROP INDEX IF EXISTS idx_role_permissions_permission_id;

-- Remove unused indexes from shipments table
DROP INDEX IF EXISTS idx_shipments_carrier_id;
DROP INDEX IF EXISTS idx_shipments_customer_id;

-- Remove unused indexes from strategy_snapshots table
DROP INDEX IF EXISTS idx_strategy_snapshots_created_by;
DROP INDEX IF EXISTS idx_strategy_snapshots_csp_event_id;

-- Remove unused indexes from tariff_activities table
DROP INDEX IF EXISTS idx_tariff_activities_created_by;
DROP INDEX IF EXISTS idx_tariff_activities_tariff_id;

-- Remove unused indexes from tariff_sop_revisions table
DROP INDEX IF EXISTS idx_tariff_sop_revisions_changed_by;
DROP INDEX IF EXISTS idx_tariff_sop_revisions_sop_id;

-- Remove unused indexes from calendar_events table
DROP INDEX IF EXISTS idx_calendar_events_csp_event_id;
DROP INDEX IF EXISTS idx_calendar_events_customer_id;

-- Remove unused indexes from csp_event_carriers table
DROP INDEX IF EXISTS idx_csp_event_carriers_carrier_id;

-- Remove unused indexes from csp_stage_history table
DROP INDEX IF EXISTS idx_csp_stage_history_customer_id;

-- Remove unused indexes from user_feedback table
DROP INDEX IF EXISTS idx_user_feedback_user_id;
