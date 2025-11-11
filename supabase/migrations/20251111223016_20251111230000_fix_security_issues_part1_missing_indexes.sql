/*
  # Fix Security Issues - Part 1: Missing Foreign Key Indexes

  1. Changes
    - Add missing indexes on foreign key columns that lack covering indexes
    - This improves query performance for JOIN operations

  2. Indexes Added
    - automation_rules.created_by
    - tariff_activities.user_id
    - tariff_audit_log.changed_by
*/

-- Add index for automation_rules.created_by foreign key
CREATE INDEX IF NOT EXISTS idx_automation_rules_created_by
  ON automation_rules(created_by);

-- Add index for tariff_activities.user_id foreign key
CREATE INDEX IF NOT EXISTS idx_tariff_activities_user_id
  ON tariff_activities(user_id);

-- Add index for tariff_audit_log.changed_by foreign key
CREATE INDEX IF NOT EXISTS idx_tariff_audit_log_changed_by
  ON tariff_audit_log(changed_by);