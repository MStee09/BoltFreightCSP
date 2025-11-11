/*
  # Fix Security Issues - Part 1: Foreign Key Indexes

  1. Missing Foreign Key Indexes
    - Add indexes for foreign keys without covering indexes
    - Improves query performance and join operations

  2. Indexes Added
    - automation_rules.created_by
    - tariff_activities.user_id
    - tariff_audit_log.changed_by
*/

-- Add missing foreign key indexes
CREATE INDEX IF NOT EXISTS idx_automation_rules_created_by_fk
  ON automation_rules(created_by);

CREATE INDEX IF NOT EXISTS idx_tariff_activities_user_id_fk
  ON tariff_activities(user_id);

CREATE INDEX IF NOT EXISTS idx_tariff_audit_log_changed_by_fk
  ON tariff_audit_log(changed_by);
