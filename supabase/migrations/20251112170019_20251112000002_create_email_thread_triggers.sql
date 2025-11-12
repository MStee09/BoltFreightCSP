/*
  # Create Email Thread Auto-Update Triggers

  1. Triggers
    - sync_email_thread_on_activity: Updates thread metadata when email activity inserted/updated
    - close_followup_on_inbound_reply: Auto-closes follow-up tasks when reply received

  2. Functions
    - update_email_thread_metadata: Recalculates thread stats and status
    - auto_close_followup_tasks: Closes pending follow-up tasks on inbound reply
*/

-- Function to update thread metadata when activity changes
CREATE OR REPLACE FUNCTION update_email_thread_metadata()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  thread_record RECORD;
BEGIN
  -- Calculate thread metadata
  SELECT
    thread_id,
    COUNT(*) AS msg_count,
    MAX(sent_at) AS last_activity,
    (ARRAY_AGG(direction ORDER BY sent_at DESC))[1] AS last_direction,
    (ARRAY_AGG(owner_id ORDER BY CASE WHEN direction = 'outbound' THEN 0 ELSE 1 END, sent_at) FILTER (WHERE owner_id IS NOT NULL))[1] AS thread_owner,
    (ARRAY_AGG(subject ORDER BY sent_at DESC))[1] AS thread_subject,
    (ARRAY_AGG(csp_event_id ORDER BY sent_at DESC) FILTER (WHERE csp_event_id IS NOT NULL))[1] AS csp_id,
    (ARRAY_AGG(customer_id ORDER BY sent_at DESC) FILTER (WHERE customer_id IS NOT NULL))[1] AS cust_id,
    (ARRAY_AGG(carrier_id ORDER BY sent_at DESC) FILTER (WHERE carrier_id IS NOT NULL))[1] AS carr_id,
    ARRAY(
      SELECT DISTINCT unnest_email
      FROM (
        SELECT unnest(ARRAY[from_email] || to_emails || cc_emails) AS unnest_email
        FROM email_activities e2
        WHERE e2.thread_id = NEW.thread_id
      ) sub
      WHERE unnest_email IS NOT NULL AND unnest_email != ''
    ) AS participants
  INTO thread_record
  FROM email_activities
  WHERE thread_id = NEW.thread_id
  GROUP BY thread_id;

  -- Determine status
  DECLARE
    new_status text;
    last_outbound timestamptz;
    last_inbound timestamptz;
  BEGIN
    SELECT MAX(sent_at) INTO last_outbound
    FROM email_activities
    WHERE thread_id = NEW.thread_id AND direction = 'outbound';

    SELECT MAX(sent_at) INTO last_inbound
    FROM email_activities
    WHERE thread_id = NEW.thread_id AND direction = 'inbound';

    IF last_outbound > COALESCE(last_inbound, '1970-01-01'::timestamptz) THEN
      new_status := 'awaiting_reply';
    ELSIF EXTRACT(EPOCH FROM (NOW() - thread_record.last_activity)) > 604800 THEN
      new_status := 'stalled';
    ELSE
      new_status := 'active';
    END IF;

    -- Upsert thread
    INSERT INTO email_threads (
      id,
      status,
      owner_id,
      subject,
      csp_event_id,
      customer_id,
      carrier_id,
      last_activity_at,
      last_activity_type,
      message_count,
      participant_emails,
      is_read,
      updated_at
    ) VALUES (
      NEW.thread_id,
      new_status,
      thread_record.thread_owner,
      thread_record.thread_subject,
      thread_record.csp_id,
      thread_record.cust_id,
      thread_record.carr_id,
      thread_record.last_activity,
      thread_record.last_direction,
      thread_record.msg_count,
      thread_record.participants,
      CASE WHEN NEW.direction = 'outbound' THEN true ELSE false END,
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      status = EXCLUDED.status,
      subject = EXCLUDED.subject,
      csp_event_id = COALESCE(EXCLUDED.csp_event_id, email_threads.csp_event_id),
      customer_id = COALESCE(EXCLUDED.customer_id, email_threads.customer_id),
      carrier_id = COALESCE(EXCLUDED.carrier_id, email_threads.carrier_id),
      last_activity_at = EXCLUDED.last_activity_at,
      last_activity_type = EXCLUDED.last_activity_type,
      message_count = EXCLUDED.message_count,
      participant_emails = EXCLUDED.participant_emails,
      is_read = CASE WHEN NEW.direction = 'outbound' THEN true ELSE false END,
      updated_at = EXCLUDED.updated_at;
  END;

  RETURN NEW;
END;
$$;

-- Trigger to update thread on email activity insert
CREATE TRIGGER sync_email_thread_on_activity
  AFTER INSERT OR UPDATE ON email_activities
  FOR EACH ROW
  WHEN (NEW.thread_id IS NOT NULL AND NEW.thread_id != '')
  EXECUTE FUNCTION update_email_thread_metadata();

-- Function to auto-close follow-up tasks on inbound reply
CREATE OR REPLACE FUNCTION auto_close_followup_tasks()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.direction = 'inbound' THEN
    UPDATE email_follow_up_tasks
    SET 
      status = 'completed',
      completed_at = NOW(),
      updated_at = NOW()
    WHERE thread_id = NEW.thread_id
      AND status IN ('pending', 'overdue')
      AND auto_close_on_reply = true;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger to close follow-ups on inbound reply
CREATE TRIGGER close_followup_on_inbound_reply
  AFTER INSERT ON email_activities
  FOR EACH ROW
  WHEN (NEW.direction = 'inbound' AND NEW.thread_id IS NOT NULL)
  EXECUTE FUNCTION auto_close_followup_tasks();