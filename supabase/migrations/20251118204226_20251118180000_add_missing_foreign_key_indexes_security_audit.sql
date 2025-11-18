/*
  # Add Missing Foreign Key Indexes - Security Audit Fix

  1. Purpose
    - Add covering indexes for all foreign keys that are missing them
    - Improves query performance and join operations
    - Addresses security audit findings

  2. New Indexes
    - alerts: assigned_to, resolved_by
    - automation_logs: rule_id
    - calendar_events: csp_event_id, customer_id
    - csp_event_carriers: carrier_id
    - csp_stage_history: customer_id
    - email_activities: carrier_id, created_by, owner_id
    - email_audit_log: user_id
    - email_drafts: carrier_id, csp_event_id, customer_id
    - email_templates: created_by
    - email_thread_comments: created_by
    - freightops_thread_tokens: carrier_id, created_by, csp_event_id, customer_id
    - knowledge_base_documents: uploaded_by
    - lost_opportunities: csp_event_id, customer_id
    - role_permissions: permission_id
    - shipments: customer_id
    - strategy_snapshots: created_by, csp_event_id
    - tariff_activities: created_by, csp_event_id, tariff_id
    - tariff_families: created_by
    - tariff_sop_revisions: changed_by, sop_id
    - tariffs: carrier_id, created_by, csp_event_id, renewal_csp_event_id, superseded_by_id
    - user_feedback: user_id
    - user_invitations: invited_by
    - user_profiles: created_by

  3. Performance Impact
    - Significantly improves query performance for foreign key lookups
    - Enables efficient join operations
    - Reduces full table scans
*/

-- Alerts table
CREATE INDEX IF NOT EXISTS idx_alerts_assigned_to ON public.alerts(assigned_to);
CREATE INDEX IF NOT EXISTS idx_alerts_resolved_by ON public.alerts(resolved_by);

-- Automation logs
CREATE INDEX IF NOT EXISTS idx_automation_logs_rule_id ON public.automation_logs(rule_id);

-- Calendar events
CREATE INDEX IF NOT EXISTS idx_calendar_events_csp_event_id ON public.calendar_events(csp_event_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_customer_id ON public.calendar_events(customer_id);

-- CSP event carriers
CREATE INDEX IF NOT EXISTS idx_csp_event_carriers_carrier_id ON public.csp_event_carriers(carrier_id);

-- CSP stage history
CREATE INDEX IF NOT EXISTS idx_csp_stage_history_customer_id ON public.csp_stage_history(customer_id);

-- Email activities
CREATE INDEX IF NOT EXISTS idx_email_activities_carrier_id ON public.email_activities(carrier_id);
CREATE INDEX IF NOT EXISTS idx_email_activities_created_by ON public.email_activities(created_by);
CREATE INDEX IF NOT EXISTS idx_email_activities_owner_id ON public.email_activities(owner_id);

-- Email audit log
CREATE INDEX IF NOT EXISTS idx_email_audit_log_user_id ON public.email_audit_log(user_id);

-- Email drafts
CREATE INDEX IF NOT EXISTS idx_email_drafts_carrier_id ON public.email_drafts(carrier_id);
CREATE INDEX IF NOT EXISTS idx_email_drafts_csp_event_id ON public.email_drafts(csp_event_id);
CREATE INDEX IF NOT EXISTS idx_email_drafts_customer_id ON public.email_drafts(customer_id);

-- Email templates
CREATE INDEX IF NOT EXISTS idx_email_templates_created_by ON public.email_templates(created_by);

-- Email thread comments
CREATE INDEX IF NOT EXISTS idx_email_thread_comments_created_by ON public.email_thread_comments(created_by);

-- Freightops thread tokens
CREATE INDEX IF NOT EXISTS idx_freightops_thread_tokens_carrier_id ON public.freightops_thread_tokens(carrier_id);
CREATE INDEX IF NOT EXISTS idx_freightops_thread_tokens_created_by ON public.freightops_thread_tokens(created_by);
CREATE INDEX IF NOT EXISTS idx_freightops_thread_tokens_csp_event_id ON public.freightops_thread_tokens(csp_event_id);
CREATE INDEX IF NOT EXISTS idx_freightops_thread_tokens_customer_id ON public.freightops_thread_tokens(customer_id);

-- Knowledge base documents
CREATE INDEX IF NOT EXISTS idx_knowledge_base_documents_uploaded_by ON public.knowledge_base_documents(uploaded_by);

-- Lost opportunities
CREATE INDEX IF NOT EXISTS idx_lost_opportunities_csp_event_id ON public.lost_opportunities(csp_event_id);
CREATE INDEX IF NOT EXISTS idx_lost_opportunities_customer_id ON public.lost_opportunities(customer_id);

-- Role permissions
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON public.role_permissions(permission_id);

-- Shipments
CREATE INDEX IF NOT EXISTS idx_shipments_customer_id ON public.shipments(customer_id);

-- Strategy snapshots
CREATE INDEX IF NOT EXISTS idx_strategy_snapshots_created_by ON public.strategy_snapshots(created_by);
CREATE INDEX IF NOT EXISTS idx_strategy_snapshots_csp_event_id ON public.strategy_snapshots(csp_event_id);

-- Tariff activities
CREATE INDEX IF NOT EXISTS idx_tariff_activities_created_by ON public.tariff_activities(created_by);
CREATE INDEX IF NOT EXISTS idx_tariff_activities_csp_event_id ON public.tariff_activities(csp_event_id);
CREATE INDEX IF NOT EXISTS idx_tariff_activities_tariff_id ON public.tariff_activities(tariff_id);

-- Tariff families
CREATE INDEX IF NOT EXISTS idx_tariff_families_created_by ON public.tariff_families(created_by);

-- Tariff SOP revisions
CREATE INDEX IF NOT EXISTS idx_tariff_sop_revisions_changed_by ON public.tariff_sop_revisions(changed_by);
CREATE INDEX IF NOT EXISTS idx_tariff_sop_revisions_sop_id ON public.tariff_sop_revisions(sop_id);

-- Tariffs
CREATE INDEX IF NOT EXISTS idx_tariffs_carrier_id ON public.tariffs(carrier_id);
CREATE INDEX IF NOT EXISTS idx_tariffs_created_by ON public.tariffs(created_by);
CREATE INDEX IF NOT EXISTS idx_tariffs_csp_event_id ON public.tariffs(csp_event_id);
CREATE INDEX IF NOT EXISTS idx_tariffs_renewal_csp_event_id ON public.tariffs(renewal_csp_event_id);
CREATE INDEX IF NOT EXISTS idx_tariffs_superseded_by_id ON public.tariffs(superseded_by_id);

-- User feedback
CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON public.user_feedback(user_id);

-- User invitations
CREATE INDEX IF NOT EXISTS idx_user_invitations_invited_by ON public.user_invitations(invited_by);

-- User profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_by ON public.user_profiles(created_by);