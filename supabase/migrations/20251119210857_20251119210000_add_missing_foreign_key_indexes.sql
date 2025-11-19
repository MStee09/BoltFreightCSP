/*
  # Add Missing Foreign Key Indexes

  Adds indexes for all foreign keys that are missing covering indexes to improve query performance.
  
  ## Tables with new indexes:
  - automation_rules (created_by)
  - carrier_contacts (created_by, updated_by)
  - carriers (created_by, updated_by)
  - csp_event_carriers (awarded_by, created_by, notes_updated_by, proposed_tariff_id, updated_by)
  - csp_events (created_by, updated_by)
  - customers (created_by, updated_by)
  - email_threads (owner_id)
  - strategy_snapshots (updated_by)
  - tariff_activities (user_id)
  - tariff_audit_log (changed_by)
  - tariff_families (active_version_id, carrier_id)
  - tariffs (activated_by, updated_by)
  - user_impersonation_sessions (admin_user_id, impersonated_user_id)
  
  ## Performance impact:
  - Improves JOIN performance on foreign key relationships
  - Reduces query execution time for user attribution queries
  - Optimizes cascading delete operations
*/

-- automation_rules
CREATE INDEX IF NOT EXISTS idx_automation_rules_created_by ON automation_rules(created_by);

-- carrier_contacts
CREATE INDEX IF NOT EXISTS idx_carrier_contacts_created_by ON carrier_contacts(created_by);
CREATE INDEX IF NOT EXISTS idx_carrier_contacts_updated_by ON carrier_contacts(updated_by);

-- carriers
CREATE INDEX IF NOT EXISTS idx_carriers_created_by ON carriers(created_by);
CREATE INDEX IF NOT EXISTS idx_carriers_updated_by ON carriers(updated_by);

-- csp_event_carriers
CREATE INDEX IF NOT EXISTS idx_csp_event_carriers_awarded_by ON csp_event_carriers(awarded_by);
CREATE INDEX IF NOT EXISTS idx_csp_event_carriers_created_by ON csp_event_carriers(created_by);
CREATE INDEX IF NOT EXISTS idx_csp_event_carriers_notes_updated_by ON csp_event_carriers(notes_updated_by);
CREATE INDEX IF NOT EXISTS idx_csp_event_carriers_proposed_tariff_id ON csp_event_carriers(proposed_tariff_id);
CREATE INDEX IF NOT EXISTS idx_csp_event_carriers_updated_by ON csp_event_carriers(updated_by);

-- csp_events
CREATE INDEX IF NOT EXISTS idx_csp_events_created_by ON csp_events(created_by);
CREATE INDEX IF NOT EXISTS idx_csp_events_updated_by ON csp_events(updated_by);

-- customers
CREATE INDEX IF NOT EXISTS idx_customers_created_by ON customers(created_by);
CREATE INDEX IF NOT EXISTS idx_customers_updated_by ON customers(updated_by);

-- email_threads
CREATE INDEX IF NOT EXISTS idx_email_threads_owner_id ON email_threads(owner_id);

-- strategy_snapshots
CREATE INDEX IF NOT EXISTS idx_strategy_snapshots_updated_by ON strategy_snapshots(updated_by);

-- tariff_activities
CREATE INDEX IF NOT EXISTS idx_tariff_activities_user_id ON tariff_activities(user_id);

-- tariff_audit_log
CREATE INDEX IF NOT EXISTS idx_tariff_audit_log_changed_by ON tariff_audit_log(changed_by);

-- tariff_families
CREATE INDEX IF NOT EXISTS idx_tariff_families_active_version_id ON tariff_families(active_version_id);
CREATE INDEX IF NOT EXISTS idx_tariff_families_carrier_id ON tariff_families(carrier_id);

-- tariffs
CREATE INDEX IF NOT EXISTS idx_tariffs_activated_by ON tariffs(activated_by);
CREATE INDEX IF NOT EXISTS idx_tariffs_updated_by ON tariffs(updated_by);

-- user_impersonation_sessions
CREATE INDEX IF NOT EXISTS idx_user_impersonation_sessions_admin_user_id ON user_impersonation_sessions(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_user_impersonation_sessions_impersonated_user_id ON user_impersonation_sessions(impersonated_user_id);
