/*
  # Create Smart Automation System

  1. Purpose
    - Track automation rules and their execution
    - Enable proactive system behavior (auto-renewal, reminders, digests)
    - Maintain audit trail of all automated actions

  2. New Tables
    - `automation_rules` - Configuration for each automation type
    - `automation_logs` - History of automation executions
    - `daily_digests` - Store generated daily digest summaries

  3. Security
    - Enable RLS on all tables
    - Admins can manage automation rules
    - All authenticated users can view logs and digests
*/

-- Automation Rules table
CREATE TABLE IF NOT EXISTS automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_type text NOT NULL,
  name text NOT NULL,
  description text,
  is_enabled boolean DEFAULT true,
  trigger_condition jsonb NOT NULL,
  action_config jsonb NOT NULL,
  last_run_at timestamptz,
  next_run_at timestamptz,
  run_count integer DEFAULT 0,
  success_count integer DEFAULT 0,
  failure_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES user_profiles(id),
  CONSTRAINT valid_rule_type CHECK (rule_type IN (
    'auto_renewal_csp',
    'carrier_followup_reminder',
    'validation_reminder',
    'daily_digest',
    'custom'
  ))
);

-- Automation Logs table
CREATE TABLE IF NOT EXISTS automation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid REFERENCES automation_rules(id) ON DELETE CASCADE,
  rule_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  trigger_data jsonb,
  result_data jsonb,
  error_message text,
  execution_time_ms integer,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT valid_status CHECK (status IN ('pending', 'running', 'success', 'failed', 'skipped'))
);

-- Daily Digests table
CREATE TABLE IF NOT EXISTS daily_digests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  digest_date date NOT NULL,
  summary jsonb NOT NULL,
  expiring_tariffs jsonb,
  stalled_csps jsonb,
  pending_sops jsonb,
  action_items jsonb,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, digest_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_automation_rules_type ON automation_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_automation_rules_enabled ON automation_rules(is_enabled);
CREATE INDEX IF NOT EXISTS idx_automation_rules_next_run ON automation_rules(next_run_at);
CREATE INDEX IF NOT EXISTS idx_automation_logs_rule_id ON automation_logs(rule_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_created_at ON automation_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_logs_status ON automation_logs(status);
CREATE INDEX IF NOT EXISTS idx_daily_digests_user_date ON daily_digests(user_id, digest_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_digests_unread ON daily_digests(user_id, is_read) WHERE is_read = false;

-- Enable RLS
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_digests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for automation_rules
CREATE POLICY "authenticated_users_view_rules"
  ON automation_rules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "admins_manage_rules"
  ON automation_rules FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'app_role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'app_role') = 'admin');

-- RLS Policies for automation_logs
CREATE POLICY "authenticated_users_view_logs"
  ON automation_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "system_insert_logs"
  ON automation_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for daily_digests
CREATE POLICY "users_view_own_digests"
  ON daily_digests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "users_update_own_digests"
  ON daily_digests FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "system_insert_digests"
  ON daily_digests FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to update automation rule stats
CREATE OR REPLACE FUNCTION update_automation_rule_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.status = 'success' OR NEW.status = 'failed' THEN
    UPDATE automation_rules
    SET 
      last_run_at = NEW.completed_at,
      run_count = run_count + 1,
      success_count = CASE WHEN NEW.status = 'success' THEN success_count + 1 ELSE success_count END,
      failure_count = CASE WHEN NEW.status = 'failed' THEN failure_count + 1 ELSE failure_count END,
      updated_at = now()
    WHERE id = NEW.rule_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to update rule stats when log completes
CREATE TRIGGER update_rule_stats_on_log_completion
  AFTER UPDATE OF status ON automation_logs
  FOR EACH ROW
  WHEN (NEW.status IN ('success', 'failed'))
  EXECUTE FUNCTION update_automation_rule_stats();

-- Insert default automation rules
INSERT INTO automation_rules (rule_type, name, description, is_enabled, trigger_condition, action_config)
VALUES
  (
    'auto_renewal_csp',
    'Auto-Create Renewal CSP',
    'Automatically creates a renewal CSP when a tariff is expiring within 90 days',
    true,
    '{"days_before_expiry": 90, "check_frequency": "daily"}'::jsonb,
    '{"csp_status": "Planning", "auto_invite_carriers": false}'::jsonb
  ),
  (
    'carrier_followup_reminder',
    'Carrier Follow-Up Reminder',
    'Creates alerts for carriers who were invited but haven''t responded in 5 days',
    true,
    '{"days_since_invite": 5, "check_frequency": "daily"}'::jsonb,
    '{"reminder_type": "alert", "notify_csp_owner": true}'::jsonb
  ),
  (
    'validation_reminder',
    'Post-Activation Validation',
    'Reminds users to validate tariff performance 30 days after activation',
    true,
    '{"days_after_activation": 30, "check_frequency": "daily"}'::jsonb,
    '{"reminder_type": "alert", "create_task": true}'::jsonb
  ),
  (
    'daily_digest',
    'Daily Digest Generation',
    'Generates a morning summary of key items: expiring tariffs, stalled CSPs, pending SOPs',
    true,
    '{"run_time": "08:00", "check_frequency": "daily"}'::jsonb,
    '{"include_expiring_tariffs": true, "include_stalled_csps": true, "include_pending_sops": true, "max_items_per_section": 5}'::jsonb
  )
ON CONFLICT DO NOTHING;
