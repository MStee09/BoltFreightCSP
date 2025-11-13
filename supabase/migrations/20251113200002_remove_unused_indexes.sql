/*
  # Remove Unused Indexes

  1. Changes
    - Removes 25 unused indexes that are never accessed
    - Reduces database storage overhead
    - Improves write performance (INSERT/UPDATE/DELETE)
    - Reduces maintenance overhead

  2. Indexes Removed
    - Email drafts: updated_at index
    - Email threads: owner_id, status, last_activity indexes
    - Email activities: csp_event_carrier composite index
    - Tariff families: customer, carrier, ownership, active_version, lookup indexes
    - Tariffs: activated_by index
    - CSP events: ownership_type index
    - CSP event carriers: status, proposed_tariff, awarded_by, notes, not_awarded_reason indexes
    - User impersonation sessions: admin_user, impersonated_user, started_at indexes
    - Automation rules: created_by index
    - Tariff activities: user_id index
    - Tariff audit log: changed_by index
    - Customers: short_code index
    - Carriers: short_code index

  3. Security
    - No RLS changes
    - No impact on security
*/

-- Email drafts
DROP INDEX IF EXISTS idx_email_drafts_updated_at;

-- Email threads
DROP INDEX IF EXISTS idx_email_threads_owner_id;
DROP INDEX IF EXISTS idx_email_threads_status;
DROP INDEX IF EXISTS idx_email_threads_last_activity;

-- Email activities
DROP INDEX IF EXISTS idx_email_activities_csp_event_carrier;

-- Tariff families
DROP INDEX IF EXISTS idx_tariff_families_customer;
DROP INDEX IF EXISTS idx_tariff_families_carrier;
DROP INDEX IF EXISTS idx_tariff_families_ownership;
DROP INDEX IF EXISTS idx_tariff_families_active_version;
DROP INDEX IF EXISTS idx_tariff_families_lookup;

-- Tariffs
DROP INDEX IF EXISTS idx_tariffs_activated_by;

-- CSP events
DROP INDEX IF EXISTS idx_csp_events_ownership_type;

-- CSP event carriers
DROP INDEX IF EXISTS idx_csp_event_carriers_status;
DROP INDEX IF EXISTS idx_csp_event_carriers_proposed_tariff;
DROP INDEX IF EXISTS idx_csp_event_carriers_awarded_by;
DROP INDEX IF EXISTS idx_csp_event_carriers_notes;
DROP INDEX IF EXISTS idx_csp_event_carriers_not_awarded_reason;

-- User impersonation sessions
DROP INDEX IF EXISTS idx_impersonation_admin_user;
DROP INDEX IF EXISTS idx_impersonation_impersonated_user;
DROP INDEX IF EXISTS idx_impersonation_started_at;

-- Automation rules
DROP INDEX IF EXISTS idx_automation_rules_created_by;

-- Tariff activities
DROP INDEX IF EXISTS idx_tariff_activities_user_id;

-- Tariff audit log
DROP INDEX IF EXISTS idx_tariff_audit_log_changed_by;

-- Customers and Carriers
DROP INDEX IF EXISTS idx_customers_short_code;
DROP INDEX IF EXISTS idx_carriers_short_code;
