/*
  # Add Missing Foreign Key Indexes

  1. Changes
    - Adds indexes for all foreign keys that are missing covering indexes
    - Improves query performance for JOIN operations and foreign key constraint checks
    - Total of 41 missing foreign key indexes identified

  2. Security
    - No RLS changes
    - Indexes improve performance without affecting security

  3. Performance Impact
    - Significantly improves JOIN performance
    - Speeds up foreign key constraint validation
    - Reduces table scan operations
*/

-- Alerts table
CREATE INDEX IF NOT EXISTS idx_alerts_assigned_to ON alerts(assigned_to);
CREATE INDEX IF NOT EXISTS idx_alerts_resolved_by ON alerts(resolved_by);

-- Automation logs
CREATE INDEX IF NOT EXISTS idx_automation_logs_rule_id ON automation_logs(rule_id);

-- Calendar events
CREATE INDEX IF NOT EXISTS idx_calendar_events_csp_event_id ON calendar_events(csp_event_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_customer_id ON calendar_events(customer_id);

-- CSP event carriers
CREATE INDEX IF NOT EXISTS idx_csp_event_carriers_carrier_id ON csp_event_carriers(carrier_id);

-- CSP stage history
CREATE INDEX IF NOT EXISTS idx_csp_stage_history_customer_id ON csp_stage_history(customer_id);

-- Email activities
CREATE INDEX IF NOT EXISTS idx_email_activities_carrier_id ON email_activities(carrier_id);
CREATE INDEX IF NOT EXISTS idx_email_activities_created_by ON email_activities(created_by);
CREATE INDEX IF NOT EXISTS idx_email_activities_owner_id ON email_activities(owner_id);

-- Email audit log
CREATE INDEX IF NOT EXISTS idx_email_audit_log_user_id ON email_audit_log(user_id);

-- Email drafts
CREATE INDEX IF NOT EXISTS idx_email_drafts_carrier_id ON email_drafts(carrier_id);
CREATE INDEX IF NOT EXISTS idx_email_drafts_csp_event_id ON email_drafts(csp_event_id);
CREATE INDEX IF NOT EXISTS idx_email_drafts_customer_id ON email_drafts(customer_id);

-- Email templates
CREATE INDEX IF NOT EXISTS idx_email_templates_created_by ON email_templates(created_by);

-- Email thread comments
CREATE INDEX IF NOT EXISTS idx_email_thread_comments_created_by ON email_thread_comments(created_by);

-- FreightOps thread tokens
CREATE INDEX IF NOT EXISTS idx_freightops_thread_tokens_carrier_id ON freightops_thread_tokens(carrier_id);
CREATE INDEX IF NOT EXISTS idx_freightops_thread_tokens_created_by ON freightops_thread_tokens(created_by);
CREATE INDEX IF NOT EXISTS idx_freightops_thread_tokens_csp_event_id ON freightops_thread_tokens(csp_event_id);
CREATE INDEX IF NOT EXISTS idx_freightops_thread_tokens_customer_id ON freightops_thread_tokens(customer_id);

-- Knowledge base documents
CREATE INDEX IF NOT EXISTS idx_knowledge_base_documents_uploaded_by ON knowledge_base_documents(uploaded_by);

-- Lost opportunities
CREATE INDEX IF NOT EXISTS idx_lost_opportunities_csp_event_id ON lost_opportunities(csp_event_id);
CREATE INDEX IF NOT EXISTS idx_lost_opportunities_customer_id ON lost_opportunities(customer_id);

-- Role permissions
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);

-- Shipments
CREATE INDEX IF NOT EXISTS idx_shipments_customer_id ON shipments(customer_id);

-- Strategy snapshots
CREATE INDEX IF NOT EXISTS idx_strategy_snapshots_created_by ON strategy_snapshots(created_by);
CREATE INDEX IF NOT EXISTS idx_strategy_snapshots_csp_event_id ON strategy_snapshots(csp_event_id);

-- Tariff activities
CREATE INDEX IF NOT EXISTS idx_tariff_activities_created_by ON tariff_activities(created_by);
CREATE INDEX IF NOT EXISTS idx_tariff_activities_csp_event_id ON tariff_activities(csp_event_id);
CREATE INDEX IF NOT EXISTS idx_tariff_activities_tariff_id ON tariff_activities(tariff_id);

-- Tariff audit log
CREATE INDEX IF NOT EXISTS idx_tariff_audit_log_tariff_id ON tariff_audit_log(tariff_id);

-- Tariff families
CREATE INDEX IF NOT EXISTS idx_tariff_families_created_by ON tariff_families(created_by);

-- Tariff SOP revisions
CREATE INDEX IF NOT EXISTS idx_tariff_sop_revisions_changed_by ON tariff_sop_revisions(changed_by);
CREATE INDEX IF NOT EXISTS idx_tariff_sop_revisions_sop_id ON tariff_sop_revisions(sop_id);

-- Tariffs
CREATE INDEX IF NOT EXISTS idx_tariffs_carrier_id ON tariffs(carrier_id);
CREATE INDEX IF NOT EXISTS idx_tariffs_created_by ON tariffs(created_by);
CREATE INDEX IF NOT EXISTS idx_tariffs_csp_event_id ON tariffs(csp_event_id);
CREATE INDEX IF NOT EXISTS idx_tariffs_renewal_csp_event_id ON tariffs(renewal_csp_event_id);
CREATE INDEX IF NOT EXISTS idx_tariffs_superseded_by_id ON tariffs(superseded_by_id);

-- User feedback
CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON user_feedback(user_id);

-- User invitations
CREATE INDEX IF NOT EXISTS idx_user_invitations_invited_by ON user_invitations(invited_by);

-- User profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_by ON user_profiles(created_by);
