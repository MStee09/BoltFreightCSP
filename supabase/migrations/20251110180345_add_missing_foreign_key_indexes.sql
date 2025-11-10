/*
  # Add Missing Foreign Key Indexes

  1. Performance Improvements
    - Add indexes for all unindexed foreign keys
    - Improves JOIN performance and foreign key constraint checks
    - Essential for query optimization at scale

  2. Tables Affected
    - alerts: assigned_to, resolved_by
    - calendar_events: csp_event_id, customer_id
    - csp_event_carriers: carrier_id
    - csp_stage_history: customer_id
    - email_activities: carrier_id, created_by
    - email_templates: created_by
    - knowledge_base_documents: uploaded_by
    - lost_opportunities: csp_event_id, customer_id
    - role_permissions: permission_id
    - shipments: carrier_id, customer_id
    - strategy_snapshots: created_by, csp_event_id
    - tariff_activities: created_by, tariff_id
    - tariff_sop_revisions: changed_by, sop_id
    - tariffs: created_by, csp_event_id, superseded_by_id
    - user_feedback: user_id
    - user_invitations: invited_by
    - user_profiles: created_by
*/

-- Alerts table indexes
CREATE INDEX IF NOT EXISTS idx_alerts_assigned_to ON alerts(assigned_to);
CREATE INDEX IF NOT EXISTS idx_alerts_resolved_by ON alerts(resolved_by);

-- Calendar events indexes
CREATE INDEX IF NOT EXISTS idx_calendar_events_csp_event_id ON calendar_events(csp_event_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_customer_id ON calendar_events(customer_id);

-- CSP event carriers indexes
CREATE INDEX IF NOT EXISTS idx_csp_event_carriers_carrier_id ON csp_event_carriers(carrier_id);

-- CSP stage history indexes
CREATE INDEX IF NOT EXISTS idx_csp_stage_history_customer_id ON csp_stage_history(customer_id);

-- Email activities indexes
CREATE INDEX IF NOT EXISTS idx_email_activities_carrier_id ON email_activities(carrier_id);
CREATE INDEX IF NOT EXISTS idx_email_activities_created_by ON email_activities(created_by);

-- Email templates indexes
CREATE INDEX IF NOT EXISTS idx_email_templates_created_by ON email_templates(created_by);

-- Knowledge base documents indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_base_documents_uploaded_by ON knowledge_base_documents(uploaded_by);

-- Lost opportunities indexes
CREATE INDEX IF NOT EXISTS idx_lost_opportunities_csp_event_id ON lost_opportunities(csp_event_id);
CREATE INDEX IF NOT EXISTS idx_lost_opportunities_customer_id ON lost_opportunities(customer_id);

-- Role permissions indexes
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);

-- Shipments indexes
CREATE INDEX IF NOT EXISTS idx_shipments_carrier_id ON shipments(carrier_id);
CREATE INDEX IF NOT EXISTS idx_shipments_customer_id ON shipments(customer_id);

-- Strategy snapshots indexes
CREATE INDEX IF NOT EXISTS idx_strategy_snapshots_created_by ON strategy_snapshots(created_by);
CREATE INDEX IF NOT EXISTS idx_strategy_snapshots_csp_event_id ON strategy_snapshots(csp_event_id);

-- Tariff activities indexes
CREATE INDEX IF NOT EXISTS idx_tariff_activities_created_by ON tariff_activities(created_by);
CREATE INDEX IF NOT EXISTS idx_tariff_activities_tariff_id ON tariff_activities(tariff_id);

-- Tariff SOP revisions indexes
CREATE INDEX IF NOT EXISTS idx_tariff_sop_revisions_changed_by ON tariff_sop_revisions(changed_by);
CREATE INDEX IF NOT EXISTS idx_tariff_sop_revisions_sop_id ON tariff_sop_revisions(sop_id);

-- Tariffs indexes
CREATE INDEX IF NOT EXISTS idx_tariffs_created_by ON tariffs(created_by);
CREATE INDEX IF NOT EXISTS idx_tariffs_csp_event_id ON tariffs(csp_event_id);
CREATE INDEX IF NOT EXISTS idx_tariffs_superseded_by_id ON tariffs(superseded_by_id);

-- User feedback indexes
CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON user_feedback(user_id);

-- User invitations indexes
CREATE INDEX IF NOT EXISTS idx_user_invitations_invited_by ON user_invitations(invited_by);

-- User profiles indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_by ON user_profiles(created_by);
