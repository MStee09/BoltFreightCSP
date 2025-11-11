/*
  # Add Missing Foreign Key Indexes

  1. New Indexes
    - Add index on automation_rules.created_by
    - Add index on tariff_activities.user_id
    - Add index on tariff_audit_log.changed_by

  2. Purpose
    - Improve query performance for foreign key lookups
    - Resolve unindexed foreign key warnings
*/

-- Add missing foreign key indexes
CREATE INDEX IF NOT EXISTS idx_automation_rules_created_by_fkey
  ON automation_rules(created_by);

CREATE INDEX IF NOT EXISTS idx_tariff_activities_user_id_fkey
  ON tariff_activities(user_id);

CREATE INDEX IF NOT EXISTS idx_tariff_audit_log_changed_by_fkey
  ON tariff_audit_log(changed_by);
