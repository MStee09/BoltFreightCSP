/*
  # Add Email Follow-Up Tasks System

  1. New Tables
    - email_follow_up_tasks: Tracks follow-up tasks linked to email threads
    - email_template_favorites: User-specific template favorites

  2. Changes
    - Add template variables support to email_templates
    - Add stalled_notification_sent flag to email_activities
    - Add manual_status_override flag

  3. Functions
    - Auto-close follow-up tasks when reply received
    - Send notifications for stalled threads

  4. Security
    - RLS policies for tasks and favorites
*/

-- ========================================
-- 1. Email Follow-Up Tasks Table
-- ========================================

CREATE TABLE IF NOT EXISTS email_follow_up_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id text NOT NULL,
  email_activity_id uuid REFERENCES email_activities(id) ON DELETE CASCADE,
  csp_event_id uuid REFERENCES csp_events(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  carrier_id uuid REFERENCES carriers(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  title text NOT NULL,
  description text,
  due_date timestamptz NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'auto_completed')),
  completed_at timestamptz,
  auto_close_on_reply boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for follow-up tasks
CREATE INDEX IF NOT EXISTS idx_email_followup_tasks_thread_id
  ON email_follow_up_tasks(thread_id);

CREATE INDEX IF NOT EXISTS idx_email_followup_tasks_assigned_to
  ON email_follow_up_tasks(assigned_to) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_email_followup_tasks_due_date
  ON email_follow_up_tasks(due_date) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_email_followup_tasks_status
  ON email_follow_up_tasks(status);

-- Enable RLS
ALTER TABLE email_follow_up_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for follow-up tasks
CREATE POLICY "Users can view follow-up tasks for their org"
  ON email_follow_up_tasks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create follow-up tasks"
  ON email_follow_up_tasks FOR INSERT
  TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY "Users can update their assigned tasks"
  ON email_follow_up_tasks FOR UPDATE
  TO authenticated
  USING (
    assigned_to = (SELECT auth.uid())
    OR created_by = (SELECT auth.uid())
    OR (SELECT auth.jwt()->>'app_role') = 'admin'
  )
  WITH CHECK (
    assigned_to = (SELECT auth.uid())
    OR created_by = (SELECT auth.uid())
    OR (SELECT auth.jwt()->>'app_role') = 'admin'
  );

-- ========================================
-- 2. Email Template Favorites Table
-- ========================================

CREATE TABLE IF NOT EXISTS email_template_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  template_id uuid REFERENCES email_templates(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, template_id)
);

-- Create index for favorites
CREATE INDEX IF NOT EXISTS idx_email_template_favorites_user_id
  ON email_template_favorites(user_id);

-- Enable RLS
ALTER TABLE email_template_favorites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for favorites
CREATE POLICY "Users can view their own favorites"
  ON email_template_favorites FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can manage their own favorites"
  ON email_template_favorites FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ========================================
-- 3. Enhance email_templates Table
-- ========================================

-- Add variables field if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_templates' AND column_name = 'variables'
  ) THEN
    ALTER TABLE email_templates ADD COLUMN variables text[] DEFAULT '{}';
  END IF;
END $$;

-- Add scope field if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_templates' AND column_name = 'scope'
  ) THEN
    ALTER TABLE email_templates ADD COLUMN scope text DEFAULT 'general' CHECK (scope IN ('csp', 'customer', 'carrier', 'general'));
  END IF;
END $$;

-- ========================================
-- 4. Enhance email_activities Table
-- ========================================

-- Add notification and override flags
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_activities' AND column_name = 'stalled_notification_sent'
  ) THEN
    ALTER TABLE email_activities ADD COLUMN stalled_notification_sent boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_activities' AND column_name = 'manual_status_override'
  ) THEN
    ALTER TABLE email_activities ADD COLUMN manual_status_override boolean DEFAULT false;
  END IF;
END $$;

-- ========================================
-- 5. Auto-Complete Follow-Up Tasks Function
-- ========================================

CREATE OR REPLACE FUNCTION auto_complete_followup_tasks()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- When inbound email received, auto-complete follow-up tasks for that thread
  IF NEW.direction = 'inbound' THEN
    UPDATE email_follow_up_tasks
    SET
      status = 'auto_completed',
      completed_at = NEW.sent_at,
      updated_at = now()
    WHERE thread_id = NEW.thread_id
      AND status = 'pending'
      AND auto_close_on_reply = true;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for auto-completing tasks
DROP TRIGGER IF EXISTS trigger_auto_complete_followup ON email_activities;
CREATE TRIGGER trigger_auto_complete_followup
  AFTER INSERT ON email_activities
  FOR EACH ROW
  EXECUTE FUNCTION auto_complete_followup_tasks();

-- ========================================
-- 6. Stalled Thread Notification Function
-- ========================================

CREATE OR REPLACE FUNCTION notify_stalled_threads()
RETURNS TABLE (
  thread_id text,
  owner_id uuid,
  customer_name text,
  carrier_name text,
  subject text,
  days_stalled integer
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ea.thread_id,
    ea.owner_id,
    c.company_name as customer_name,
    car.carrier_name,
    ea.subject,
    EXTRACT(days FROM (now() - ea.last_activity_at))::integer as days_stalled
  FROM email_activities ea
  LEFT JOIN customers c ON c.id = ea.customer_id
  LEFT JOIN carriers car ON car.id = ea.carrier_id
  WHERE ea.is_thread_starter = true
    AND ea.thread_status = 'awaiting_reply'
    AND ea.last_activity_at < now() - INTERVAL '3 days'
    AND ea.stalled_notification_sent = false
    AND ea.visible_to_team = true
  ORDER BY ea.last_activity_at ASC;

  -- Mark notifications as sent
  UPDATE email_activities
  SET stalled_notification_sent = true
  WHERE is_thread_starter = true
    AND thread_status = 'awaiting_reply'
    AND last_activity_at < now() - INTERVAL '3 days'
    AND stalled_notification_sent = false;
END;
$$;

-- ========================================
-- 7. Manual Status Update Function
-- ========================================

CREATE OR REPLACE FUNCTION update_thread_status_manual(
  p_thread_id text,
  p_new_status text
)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Validate status
  IF p_new_status NOT IN ('awaiting_reply', 'active', 'stalled', 'closed') THEN
    RAISE EXCEPTION 'Invalid status: %', p_new_status;
  END IF;

  -- Update all emails in thread
  UPDATE email_activities
  SET
    thread_status = p_new_status,
    manual_status_override = true,
    updated_at = now()
  WHERE thread_id = p_thread_id;

  -- If closing thread, cancel pending follow-up tasks
  IF p_new_status = 'closed' THEN
    UPDATE email_follow_up_tasks
    SET
      status = 'cancelled',
      updated_at = now()
    WHERE thread_id = p_thread_id
      AND status = 'pending';
  END IF;

  RETURN true;
END;
$$;

-- ========================================
-- 8. Get Due Follow-Ups Function
-- ========================================

CREATE OR REPLACE FUNCTION get_due_followups(p_user_id uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  thread_id text,
  customer_name text,
  carrier_name text,
  subject text,
  due_date timestamptz,
  days_overdue integer,
  assigned_to_name text
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ft.id,
    ft.thread_id,
    c.company_name as customer_name,
    car.carrier_name,
    ea.subject,
    ft.due_date,
    CASE
      WHEN ft.due_date < now() THEN EXTRACT(days FROM (now() - ft.due_date))::integer
      ELSE 0
    END as days_overdue,
    up.full_name as assigned_to_name
  FROM email_follow_up_tasks ft
  LEFT JOIN email_activities ea ON ea.thread_id = ft.thread_id AND ea.is_thread_starter = true
  LEFT JOIN customers c ON c.id = ft.customer_id
  LEFT JOIN carriers car ON car.id = ft.carrier_id
  LEFT JOIN user_profiles up ON up.user_id = ft.assigned_to
  WHERE ft.status = 'pending'
    AND (p_user_id IS NULL OR ft.assigned_to = p_user_id)
  ORDER BY ft.due_date ASC;
END;
$$;

-- ========================================
-- 9. Template Variable Replacement Function
-- ========================================

CREATE OR REPLACE FUNCTION replace_template_variables(
  p_template_text text,
  p_customer_id uuid DEFAULT NULL,
  p_carrier_id uuid DEFAULT NULL,
  p_csp_event_id uuid DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
)
RETURNS text
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  result_text text;
  customer_name text;
  carrier_name text;
  event_name text;
  owner_name text;
BEGIN
  result_text := p_template_text;

  -- Get customer name
  IF p_customer_id IS NOT NULL THEN
    SELECT company_name INTO customer_name FROM customers WHERE id = p_customer_id;
    result_text := replace(result_text, '{{customer_name}}', COALESCE(customer_name, ''));
  END IF;

  -- Get carrier name
  IF p_carrier_id IS NOT NULL THEN
    SELECT carrier_name INTO carrier_name FROM carriers WHERE id = p_carrier_id;
    result_text := replace(result_text, '{{carrier_name}}', COALESCE(carrier_name, ''));
  END IF;

  -- Get CSP event name
  IF p_csp_event_id IS NOT NULL THEN
    SELECT title INTO event_name FROM csp_events WHERE id = p_csp_event_id;
    result_text := replace(result_text, '{{event_name}}', COALESCE(event_name, ''));
  END IF;

  -- Get owner name
  IF p_user_id IS NOT NULL THEN
    SELECT full_name INTO owner_name FROM user_profiles WHERE user_id = p_user_id;
    result_text := replace(result_text, '{{owner_name}}', COALESCE(owner_name, ''));
  END IF;

  -- Replace date variables
  result_text := replace(result_text, '{{today}}', to_char(now(), 'YYYY-MM-DD'));
  result_text := replace(result_text, '{{due_date}}', to_char(now() + INTERVAL '7 days', 'YYYY-MM-DD'));

  RETURN result_text;
END;
$$;

-- ========================================
-- 10. Insert Default Email Templates
-- ========================================

-- Only insert if email_templates table is empty
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM email_templates LIMIT 1) THEN
    INSERT INTO email_templates (name, subject, body, recipient_type, scope, variables, is_active) VALUES
    ('CSP RFP Request', 'RFP: {{event_name}}',
     E'Hi {{carrier_name}},\n\nWe are currently conducting an RFP for {{customer_name}} and would like to invite you to participate.\n\nEvent Details:\n- Customer: {{customer_name}}\n- RFP: {{event_name}}\n- Response Due: {{due_date}}\n\nPlease let us know if you are interested in participating.\n\nBest regards,\n{{owner_name}}',
     'carrier', 'csp', ARRAY['carrier_name', 'customer_name', 'event_name', 'due_date', 'owner_name'], true),

    ('Rate Request Follow-Up', 'Re: Rate Request - {{event_name}}',
     E'Hi {{carrier_name}},\n\nJust following up on our rate request for {{customer_name}}.\n\nHave you had a chance to review? Please let me know if you need any additional information.\n\nThanks,\n{{owner_name}}',
     'carrier', 'csp', ARRAY['carrier_name', 'customer_name', 'event_name', 'owner_name'], true),

    ('Award Notification', 'Awarded: {{event_name}}',
     E'Hi {{carrier_name}},\n\nGreat news! You have been awarded the business for {{customer_name}}.\n\nNext Steps:\n- Contract review and signing\n- Implementation timeline\n- Account setup\n\nI will send over the contract details shortly.\n\nCongratulations!\n{{owner_name}}',
     'carrier', 'csp', ARRAY['carrier_name', 'customer_name', 'event_name', 'owner_name'], true),

    ('Rate Decline', 'Re: {{event_name}}',
     E'Hi {{carrier_name}},\n\nThank you for your quote on {{event_name}} for {{customer_name}}.\n\nAfter careful review, we have decided to move forward with another carrier for this opportunity.\n\nWe appreciate your time and look forward to working with you on future opportunities.\n\nBest regards,\n{{owner_name}}',
     'carrier', 'csp', ARRAY['carrier_name', 'customer_name', 'event_name', 'owner_name'], true),

    ('Customer Rate Update', 'Rate Update: {{event_name}}',
     E'Hi {{customer_name}} team,\n\nI wanted to provide an update on {{event_name}}.\n\nWe have received competitive quotes and are currently in negotiations. I will have final recommendations by {{due_date}}.\n\nPlease let me know if you have any questions.\n\nBest,\n{{owner_name}}',
     'customer', 'csp', ARRAY['customer_name', 'event_name', 'due_date', 'owner_name'], true),

    ('General Follow-Up', 'Following Up',
     E'Hi there,\n\nJust wanted to follow up on our previous conversation.\n\nLet me know if you need anything else from my end.\n\nThanks,\n{{owner_name}}',
     'general', 'general', ARRAY['owner_name'], true);
  END IF;
END $$;
