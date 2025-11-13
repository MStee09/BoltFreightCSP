/*
  # Add Missing Foreign Key Indexes

  1. New Indexes
    - `idx_automation_rules_created_by` on automation_rules(created_by)
    - `idx_csp_event_carriers_awarded_by` on csp_event_carriers(awarded_by)
    - `idx_csp_event_carriers_proposed_tariff_id` on csp_event_carriers(proposed_tariff_id)
    - `idx_email_activities_csp_event_carrier_id` on email_activities(csp_event_carrier_id)
    - `idx_email_threads_owner_id` on email_threads(owner_id)
    - `idx_tariff_activities_user_id` on tariff_activities(user_id)
    - `idx_tariff_audit_log_changed_by` on tariff_audit_log(changed_by)
    - `idx_tariff_families_active_version_id` on tariff_families(active_version_id)
    - `idx_tariff_families_carrier_id` on tariff_families(carrier_id)
    - `idx_tariffs_activated_by` on tariffs(activated_by)
    - `idx_user_impersonation_sessions_admin_user_id` on user_impersonation_sessions(admin_user_id)
    - `idx_user_impersonation_sessions_impersonated_user_id` on user_impersonation_sessions(impersonated_user_id)

  2. Purpose
    - Improve query performance for foreign key lookups
    - Prevent table scans when joining on these columns
*/

-- Add indexes for foreign keys that were missing
CREATE INDEX IF NOT EXISTS idx_automation_rules_created_by ON automation_rules(created_by);
CREATE INDEX IF NOT EXISTS idx_csp_event_carriers_awarded_by ON csp_event_carriers(awarded_by);
CREATE INDEX IF NOT EXISTS idx_csp_event_carriers_proposed_tariff_id ON csp_event_carriers(proposed_tariff_id);
CREATE INDEX IF NOT EXISTS idx_email_activities_csp_event_carrier_id ON email_activities(csp_event_carrier_id);
CREATE INDEX IF NOT EXISTS idx_email_threads_owner_id ON email_threads(owner_id);
CREATE INDEX IF NOT EXISTS idx_tariff_activities_user_id ON tariff_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_tariff_audit_log_changed_by ON tariff_audit_log(changed_by);
CREATE INDEX IF NOT EXISTS idx_tariff_families_active_version_id ON tariff_families(active_version_id);
CREATE INDEX IF NOT EXISTS idx_tariff_families_carrier_id ON tariff_families(carrier_id);
CREATE INDEX IF NOT EXISTS idx_tariffs_activated_by ON tariffs(activated_by);
CREATE INDEX IF NOT EXISTS idx_user_impersonation_sessions_admin_user_id ON user_impersonation_sessions(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_user_impersonation_sessions_impersonated_user_id ON user_impersonation_sessions(impersonated_user_id);
