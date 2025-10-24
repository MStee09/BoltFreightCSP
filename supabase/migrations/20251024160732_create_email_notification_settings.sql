/*
  # Create Email Notification Settings (Admin/Elite Only)

  ## Overview
  This migration creates a user-specific email notification settings table
  where admins and elite users can customize their email alert preferences.

  ## Changes

  1. New Table: user_email_notification_settings
    - `user_id` (uuid, primary key) - One setting per user
    - `awaiting_reply_days` - Days before marking email as awaiting reply (default 3)
    - `critical_reply_days` - Days before marking as critical (default 7)
    - `auto_alert_enabled` - Enable/disable auto alerts (default true)
    - `alert_frequency` - How often to check (hourly, daily, weekly)
    - `include_weekends` - Count weekends in day calculations (default true)
    - `quiet_hours_start` - Start of quiet hours (e.g., '18:00')
    - `quiet_hours_end` - End of quiet hours (e.g., '08:00')
    - `alert_channels` - JSONB array of channels (email, in_app, etc.)
    - `custom_rules` - JSONB for custom alert rules

  2. Default Settings
    - Creates default settings for all users on first access
    - Falls back to system defaults if not set

  3. Security
    - RLS enabled
    - Only admin and elite roles can modify settings
    - Users can only view/edit their own settings

  ## Functions Created
  - `get_user_email_settings()` - Get settings with defaults
  - `is_email_awaiting_reply()` - Check if email needs response based on user settings
*/

-- Create user email notification settings table
CREATE TABLE IF NOT EXISTS user_email_notification_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Reply timing settings
  awaiting_reply_days integer DEFAULT 3 CHECK (awaiting_reply_days >= 1 AND awaiting_reply_days <= 30),
  critical_reply_days integer DEFAULT 7 CHECK (critical_reply_days >= 1 AND critical_reply_days <= 60),
  
  -- Alert preferences
  auto_alert_enabled boolean DEFAULT true,
  alert_frequency text DEFAULT 'daily' CHECK (alert_frequency IN ('hourly', 'daily', 'weekly')),
  include_weekends boolean DEFAULT true,
  
  -- Quiet hours
  quiet_hours_start time,
  quiet_hours_end time,
  
  -- Alert channels
  alert_channels jsonb DEFAULT '["in_app"]'::jsonb,
  
  -- Custom rules (extensible)
  custom_rules jsonb DEFAULT '{}'::jsonb,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_email_notification_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own settings
CREATE POLICY "Users can view own email settings"
  ON user_email_notification_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Only admin and elite can insert/update settings
CREATE POLICY "Admin and elite can modify email settings"
  ON user_email_notification_settings FOR ALL
  TO authenticated
  USING (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'elite')
    )
  )
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'elite')
    )
  );

-- Function to get user email settings with defaults
CREATE OR REPLACE FUNCTION get_user_email_settings(p_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  awaiting_reply_days integer,
  critical_reply_days integer,
  auto_alert_enabled boolean,
  alert_frequency text,
  include_weekends boolean,
  quiet_hours_start time,
  quiet_hours_end time,
  alert_channels jsonb,
  custom_rules jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(uens.user_id, p_user_id) as user_id,
    COALESCE(uens.awaiting_reply_days, 3) as awaiting_reply_days,
    COALESCE(uens.critical_reply_days, 7) as critical_reply_days,
    COALESCE(uens.auto_alert_enabled, true) as auto_alert_enabled,
    COALESCE(uens.alert_frequency, 'daily') as alert_frequency,
    COALESCE(uens.include_weekends, true) as include_weekends,
    uens.quiet_hours_start,
    uens.quiet_hours_end,
    COALESCE(uens.alert_channels, '["in_app"]'::jsonb) as alert_channels,
    COALESCE(uens.custom_rules, '{}'::jsonb) as custom_rules
  FROM user_email_notification_settings uens
  WHERE uens.user_id = p_user_id
  UNION ALL
  SELECT 
    p_user_id,
    3,
    7,
    true,
    'daily',
    true,
    NULL::time,
    NULL::time,
    '["in_app"]'::jsonb,
    '{}'::jsonb
  WHERE NOT EXISTS (
    SELECT 1 FROM user_email_notification_settings
    WHERE user_id = p_user_id
  )
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if email is awaiting reply based on user settings
CREATE OR REPLACE FUNCTION is_email_awaiting_reply(
  p_email_id uuid,
  p_user_id uuid
)
RETURNS boolean AS $$
DECLARE
  email_sent_at timestamptz;
  email_direction text;
  email_thread_id text;
  has_reply boolean;
  days_threshold integer;
  include_weekends boolean;
  days_elapsed numeric;
BEGIN
  -- Get email details
  SELECT sent_at, direction, thread_id
  INTO email_sent_at, email_direction, email_thread_id
  FROM email_activities
  WHERE id = p_email_id;
  
  -- Only check outbound emails
  IF email_direction != 'outbound' THEN
    RETURN false;
  END IF;
  
  -- Get user settings
  SELECT s.awaiting_reply_days, s.include_weekends
  INTO days_threshold, include_weekends
  FROM get_user_email_settings(p_user_id) s;
  
  -- Check if there's a reply in the thread
  SELECT EXISTS (
    SELECT 1 FROM email_activities
    WHERE thread_id = email_thread_id
      AND direction = 'inbound'
      AND COALESCE(sent_at, created_at) > email_sent_at
  ) INTO has_reply;
  
  IF has_reply THEN
    RETURN false;
  END IF;
  
  -- Calculate days elapsed
  IF include_weekends THEN
    days_elapsed := EXTRACT(EPOCH FROM (NOW() - email_sent_at)) / 86400;
  ELSE
    -- Calculate business days (excluding weekends)
    days_elapsed := (
      SELECT COUNT(*)
      FROM generate_series(email_sent_at::date, CURRENT_DATE, '1 day'::interval) d
      WHERE EXTRACT(DOW FROM d) NOT IN (0, 6)
    );
  END IF;
  
  RETURN days_elapsed >= days_threshold;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_email_settings_user_id 
  ON user_email_notification_settings(user_id);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_email_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_email_settings_updated_at 
  ON user_email_notification_settings;
CREATE TRIGGER trigger_update_email_settings_updated_at
  BEFORE UPDATE ON user_email_notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_email_settings_updated_at();
