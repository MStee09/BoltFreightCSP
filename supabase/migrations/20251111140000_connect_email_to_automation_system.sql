/*
  # Connect Email System to Automation & Alerts - CRITICAL

  1. Purpose
    - Ensure NO email follow-ups fall through cracks
    - Auto-create alerts for stalled emails
    - Auto-create alerts for overdue follow-up tasks
    - Connect to daily digest system
    - Hook into notification system

  2. New Automation Rules
    - stalled_email_detection (runs daily)
    - overdue_followup_tasks (runs hourly)
    - unanswered_email_reminder (runs daily)

  3. Integration Points
    - Email activities → Alerts table
    - Follow-up tasks → Alerts table
    - Email metrics → Daily digests
    - Stalled threads → Notifications table
*/

-- ========================================
-- 1. Add Email Rule Types to Automation System
-- ========================================

-- Update constraint to include email rule types
ALTER TABLE automation_rules DROP CONSTRAINT IF EXISTS valid_rule_type;
ALTER TABLE automation_rules ADD CONSTRAINT valid_rule_type CHECK (rule_type IN (
  'auto_renewal_csp',
  'carrier_followup_reminder',
  'validation_reminder',
  'daily_digest',
  'stalled_email_detection',
  'overdue_followup_tasks',
  'unanswered_email_reminder',
  'custom'
));

-- ========================================
-- 2. Create Email-Specific Alerts Integration
-- ========================================

-- Function to auto-create alert for stalled email thread
CREATE OR REPLACE FUNCTION create_alert_for_stalled_email()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  alert_exists boolean;
BEGIN
  -- Only create alert when status changes to 'stalled'
  IF NEW.thread_status = 'stalled' AND (OLD.thread_status IS NULL OR OLD.thread_status != 'stalled') THEN

    -- Check if alert already exists for this thread
    SELECT EXISTS (
      SELECT 1 FROM alerts
      WHERE entity_type = 'email_thread'
        AND entity_id = NEW.thread_id
        AND type = 'stalled_email'
        AND status != 'resolved'
    ) INTO alert_exists;

    -- Create alert if doesn't exist
    IF NOT alert_exists THEN
      INSERT INTO alerts (
        type,
        severity,
        message,
        entity_type,
        entity_id,
        assigned_to,
        metadata
      ) VALUES (
        'stalled_email',
        'medium',
        'Email thread needs follow-up: ' || NEW.subject,
        'email_thread',
        NEW.thread_id,
        NEW.owner_id,
        jsonb_build_object(
          'thread_id', NEW.thread_id,
          'subject', NEW.subject,
          'customer_id', NEW.customer_id,
          'carrier_id', NEW.carrier_id,
          'csp_event_id', NEW.csp_event_id,
          'last_activity', NEW.last_activity_at,
          'days_stalled', EXTRACT(days FROM (now() - NEW.last_activity_at))
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger to create alert when email becomes stalled
DROP TRIGGER IF EXISTS trigger_alert_stalled_email ON email_activities;
CREATE TRIGGER trigger_alert_stalled_email
  AFTER UPDATE ON email_activities
  FOR EACH ROW
  WHEN (NEW.is_thread_starter = true)
  EXECUTE FUNCTION create_alert_for_stalled_email();

-- ========================================
-- 3. Create Alert for Overdue Follow-Up Tasks
-- ========================================

CREATE OR REPLACE FUNCTION create_alert_for_overdue_followup()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  alert_exists boolean;
BEGIN
  -- Create alert when task becomes overdue
  IF NEW.status = 'pending' AND NEW.due_date < now() THEN

    SELECT EXISTS (
      SELECT 1 FROM alerts
      WHERE entity_type = 'followup_task'
        AND entity_id = NEW.id::text
        AND type = 'overdue_task'
        AND status != 'resolved'
    ) INTO alert_exists;

    IF NOT alert_exists THEN
      INSERT INTO alerts (
        type,
        severity,
        message,
        entity_type,
        entity_id,
        assigned_to,
        metadata
      ) VALUES (
        'overdue_task',
        'high',
        'Overdue: ' || NEW.title,
        'followup_task',
        NEW.id::text,
        NEW.assigned_to,
        jsonb_build_object(
          'task_id', NEW.id,
          'thread_id', NEW.thread_id,
          'due_date', NEW.due_date,
          'days_overdue', EXTRACT(days FROM (now() - NEW.due_date)),
          'customer_id', NEW.customer_id,
          'carrier_id', NEW.carrier_id,
          'csp_event_id', NEW.csp_event_id
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger for overdue follow-up tasks
DROP TRIGGER IF EXISTS trigger_alert_overdue_followup ON email_follow_up_tasks;
CREATE TRIGGER trigger_alert_overdue_followup
  AFTER INSERT OR UPDATE ON email_follow_up_tasks
  FOR EACH ROW
  EXECUTE FUNCTION create_alert_for_overdue_followup();

-- ========================================
-- 4. Auto-Resolve Alerts When Action Taken
-- ========================================

CREATE OR REPLACE FUNCTION auto_resolve_email_alerts()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- When email status changes from stalled, resolve alert
  IF OLD.thread_status = 'stalled' AND NEW.thread_status != 'stalled' THEN
    UPDATE alerts
    SET
      status = 'resolved',
      resolved_at = now(),
      resolution_notes = 'Thread activity resumed'
    WHERE entity_type = 'email_thread'
      AND entity_id = NEW.thread_id
      AND type = 'stalled_email'
      AND status != 'resolved';
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger to auto-resolve when thread becomes active
DROP TRIGGER IF EXISTS trigger_resolve_email_alert ON email_activities;
CREATE TRIGGER trigger_resolve_email_alert
  AFTER UPDATE ON email_activities
  FOR EACH ROW
  WHEN (NEW.is_thread_starter = true)
  EXECUTE FUNCTION auto_resolve_email_alerts();

-- Function to auto-resolve task alerts
CREATE OR REPLACE FUNCTION auto_resolve_task_alerts()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- When task is completed, resolve alert
  IF NEW.status IN ('completed', 'auto_completed', 'cancelled') AND
     (OLD.status IS NULL OR OLD.status = 'pending') THEN

    UPDATE alerts
    SET
      status = 'resolved',
      resolved_at = now(),
      resolution_notes = 'Task ' || NEW.status
    WHERE entity_type = 'followup_task'
      AND entity_id = NEW.id::text
      AND type = 'overdue_task'
      AND status != 'resolved';
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger to auto-resolve task alerts
DROP TRIGGER IF EXISTS trigger_resolve_task_alert ON email_follow_up_tasks;
CREATE TRIGGER trigger_resolve_task_alert
  AFTER UPDATE ON email_follow_up_tasks
  FOR EACH ROW
  EXECUTE FUNCTION auto_resolve_task_alerts();

-- ========================================
-- 5. Create Notifications for Email Events
-- ========================================

CREATE OR REPLACE FUNCTION create_notification_for_email_event()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  notification_title text;
  notification_body text;
  recipient_id uuid;
BEGIN
  -- Only create notification for inbound emails (replies)
  IF NEW.direction = 'inbound' AND NEW.owner_id IS NOT NULL THEN

    notification_title := 'New Email Reply';
    notification_body := 'From: ' || NEW.from_email || ' - Subject: ' || NEW.subject;
    recipient_id := NEW.owner_id;

    -- Create notification for thread owner
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      entity_type,
      entity_id,
      action_url,
      metadata
    ) VALUES (
      recipient_id,
      'email_received',
      notification_title,
      notification_body,
      'email_thread',
      NEW.thread_id,
      CASE
        WHEN NEW.csp_event_id IS NOT NULL THEN '/pipeline/' || NEW.csp_event_id
        WHEN NEW.customer_id IS NOT NULL THEN '/customers/' || NEW.customer_id
        WHEN NEW.carrier_id IS NOT NULL THEN '/carriers/' || NEW.carrier_id
        ELSE '/dashboard'
      END,
      jsonb_build_object(
        'thread_id', NEW.thread_id,
        'from_email', NEW.from_email,
        'subject', NEW.subject,
        'customer_id', NEW.customer_id,
        'carrier_id', NEW.carrier_id,
        'csp_event_id', NEW.csp_event_id
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger for email reply notifications
DROP TRIGGER IF EXISTS trigger_notify_email_reply ON email_activities;
CREATE TRIGGER trigger_notify_email_reply
  AFTER INSERT ON email_activities
  FOR EACH ROW
  EXECUTE FUNCTION create_notification_for_email_event();

-- ========================================
-- 6. Add Email Metrics to Daily Digest
-- ========================================

-- Update daily_digests table to include email metrics
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_digests' AND column_name = 'email_metrics'
  ) THEN
    ALTER TABLE daily_digests ADD COLUMN email_metrics jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Function to get email metrics for daily digest
CREATE OR REPLACE FUNCTION get_email_metrics_for_digest(p_user_id uuid)
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'awaiting_replies', (
      SELECT COUNT(*)
      FROM email_activities
      WHERE owner_id = p_user_id
        AND thread_status = 'awaiting_reply'
        AND is_thread_starter = true
    ),
    'stalled_threads', (
      SELECT COUNT(*)
      FROM email_activities
      WHERE owner_id = p_user_id
        AND thread_status = 'stalled'
        AND is_thread_starter = true
    ),
    'overdue_followups', (
      SELECT COUNT(*)
      FROM email_follow_up_tasks
      WHERE assigned_to = p_user_id
        AND status = 'pending'
        AND due_date < now()
    ),
    'due_today', (
      SELECT COUNT(*)
      FROM email_follow_up_tasks
      WHERE assigned_to = p_user_id
        AND status = 'pending'
        AND due_date::date = CURRENT_DATE
    ),
    'received_today', (
      SELECT COUNT(*)
      FROM email_activities
      WHERE (owner_id = p_user_id OR created_by = p_user_id)
        AND direction = 'inbound'
        AND sent_at >= CURRENT_DATE
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- ========================================
-- 7. Insert Default Automation Rules for Emails
-- ========================================

DO $$
BEGIN
  -- Stalled Email Detection Rule
  IF NOT EXISTS (
    SELECT 1 FROM automation_rules WHERE rule_type = 'stalled_email_detection'
  ) THEN
    INSERT INTO automation_rules (
      rule_type,
      name,
      description,
      is_enabled,
      trigger_condition,
      action_config,
      next_run_at
    ) VALUES (
      'stalled_email_detection',
      'Detect Stalled Email Threads',
      'Automatically marks email threads as stalled after 7 days of inactivity and creates alerts',
      true,
      jsonb_build_object('days_inactive', 7),
      jsonb_build_object('create_alert', true, 'alert_severity', 'medium'),
      now() + INTERVAL '1 day'
    );
  END IF;

  -- Overdue Follow-up Tasks Rule
  IF NOT EXISTS (
    SELECT 1 FROM automation_rules WHERE rule_type = 'overdue_followup_tasks'
  ) THEN
    INSERT INTO automation_rules (
      rule_type,
      name,
      description,
      is_enabled,
      trigger_condition,
      action_config,
      next_run_at
    ) VALUES (
      'overdue_followup_tasks',
      'Flag Overdue Email Follow-ups',
      'Creates high-priority alerts for overdue email follow-up tasks',
      true,
      jsonb_build_object('check_interval_hours', 6),
      jsonb_build_object('create_alert', true, 'alert_severity', 'high'),
      now() + INTERVAL '6 hours'
    );
  END IF;

  -- Unanswered Email Reminder Rule
  IF NOT EXISTS (
    SELECT 1 FROM automation_rules WHERE rule_type = 'unanswered_email_reminder'
  ) THEN
    INSERT INTO automation_rules (
      rule_type,
      name,
      description,
      is_enabled,
      trigger_condition,
      action_config,
      next_run_at
    ) VALUES (
      'unanswered_email_reminder',
      'Remind About Unanswered Emails',
      'Creates reminders for emails awaiting reply after 3 business days',
      true,
      jsonb_build_object('days_waiting', 3, 'business_days_only', true),
      jsonb_build_object('create_notification', true, 'create_alert', true),
      now() + INTERVAL '1 day'
    );
  END IF;
END $$;
