/*
  # Create User Alert Preferences System

  1. New Tables
    - `user_alert_preferences`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `alert_type` (text) - Type of alert
      - `enabled` (boolean) - Whether this alert type is enabled
      - `threshold_days` (integer) - Number of days before alert triggers
      - `threshold_hours` (integer) - Number of hours before alert triggers (for calendar events)
      - `severity_level` (text) - low, medium, high, critical
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `user_alert_preferences` table
    - Add policies for users to manage their own preferences

  3. Alert Types Supported
    - email_awaiting_reply: Email hasn't received reply
    - email_critical_reply: Email overdue for reply
    - csp_stage_stuck: CSP event stuck in stage too long
    - tariff_expiring: Tariff expiring soon
    - tariff_expired: Tariff has expired
    - calendar_reminder: Upcoming calendar event
    - idle_negotiation: No activity on negotiation
    - document_update_needed: Document needs review/update
    - follow_up_reminder: General follow-up reminder
    - contract_renewal: Contract renewal approaching
*/

-- Create user_alert_preferences table
CREATE TABLE IF NOT EXISTS user_alert_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  alert_type text NOT NULL,
  enabled boolean DEFAULT true,
  threshold_days integer,
  threshold_hours integer,
  severity_level text DEFAULT 'medium',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, alert_type)
);

-- Enable RLS
ALTER TABLE user_alert_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own alert preferences"
  ON user_alert_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own alert preferences"
  ON user_alert_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own alert preferences"
  ON user_alert_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own alert preferences"
  ON user_alert_preferences FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_alert_preferences_user_id 
  ON user_alert_preferences(user_id);

CREATE INDEX IF NOT EXISTS idx_user_alert_preferences_alert_type 
  ON user_alert_preferences(alert_type);

-- Create function to get default alert preferences
CREATE OR REPLACE FUNCTION get_default_alert_preferences()
RETURNS TABLE (
  alert_type text,
  enabled boolean,
  threshold_days integer,
  threshold_hours integer,
  severity_level text,
  display_name text,
  description text
) AS $$
BEGIN
  RETURN QUERY SELECT 
    'email_awaiting_reply'::text, true, 3, NULL::integer, 'medium'::text,
    'Email Awaiting Reply'::text, 'Alert when an email hasn''t received a reply'::text
  UNION ALL SELECT 
    'email_critical_reply'::text, true, 7, NULL::integer, 'high'::text,
    'Email Critical Reply'::text, 'Escalate when email is overdue for reply'::text
  UNION ALL SELECT 
    'csp_stage_stuck'::text, true, 5, NULL::integer, 'medium'::text,
    'CSP Event Stuck in Stage'::text, 'Alert when CSP event hasn''t progressed'::text
  UNION ALL SELECT 
    'tariff_expiring'::text, true, 30, NULL::integer, 'high'::text,
    'Tariff Expiring Soon'::text, 'Alert before tariff expiration date'::text
  UNION ALL SELECT 
    'tariff_expired'::text, true, 0, NULL::integer, 'critical'::text,
    'Tariff Expired'::text, 'Alert when tariff has expired'::text
  UNION ALL SELECT 
    'calendar_reminder'::text, true, 1, NULL::integer, 'medium'::text,
    'Calendar Event Reminder'::text, 'Remind before upcoming calendar events'::text
  UNION ALL SELECT 
    'idle_negotiation'::text, true, 7, NULL::integer, 'medium'::text,
    'Idle Negotiation'::text, 'Alert when negotiation has no recent activity'::text
  UNION ALL SELECT 
    'document_update_needed'::text, true, 14, NULL::integer, 'low'::text,
    'Document Update Needed'::text, 'Alert when documents need review'::text
  UNION ALL SELECT 
    'follow_up_reminder'::text, true, 3, NULL::integer, 'medium'::text,
    'Follow-up Reminder'::text, 'General follow-up task reminders'::text
  UNION ALL SELECT 
    'contract_renewal'::text, true, 60, NULL::integer, 'high'::text,
    'Contract Renewal'::text, 'Alert before contract renewal date'::text;
END;
$$ LANGUAGE plpgsql;
