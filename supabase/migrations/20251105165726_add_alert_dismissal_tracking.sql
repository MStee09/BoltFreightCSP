/*
  # Add Alert Dismissal Tracking
  
  1. New Columns
    - `dismissed_at` (timestamptz) - When the alert was dismissed
    - `dismissed_by` (uuid) - Who dismissed the alert
    - `dismissed_until` (timestamptz) - When to resurface the alert (auto-set to 24 hours after dismissal)
    
  2. Changes
    - Modify the status flow to track dismissals separately from resolved
    - Add index on dismissed_until for efficient querying
    
  3. Purpose
    - Allow alerts to be temporarily dismissed but resurface after 24 hours if not resolved
    - Track who dismissed alerts and when
    - Enable users to "snooze" alerts that will come back later
*/

-- Add dismissal tracking columns
ALTER TABLE alerts
  ADD COLUMN IF NOT EXISTS dismissed_at timestamptz,
  ADD COLUMN IF NOT EXISTS dismissed_by uuid,
  ADD COLUMN IF NOT EXISTS dismissed_until timestamptz;

-- Add index for efficient querying of alerts that should resurface
CREATE INDEX IF NOT EXISTS idx_alerts_dismissed_until 
  ON alerts(dismissed_until) 
  WHERE dismissed_until IS NOT NULL AND status = 'dismissed';

-- Add index for status filtering
CREATE INDEX IF NOT EXISTS idx_alerts_status 
  ON alerts(status) 
  WHERE status IN ('active', 'acknowledged');

-- Add helpful comments
COMMENT ON COLUMN alerts.dismissed_at IS 'Timestamp when alert was dismissed by user';
COMMENT ON COLUMN alerts.dismissed_by IS 'User who dismissed the alert';
COMMENT ON COLUMN alerts.dismissed_until IS 'When to automatically resurface this alert (typically 24 hours after dismissal)';
