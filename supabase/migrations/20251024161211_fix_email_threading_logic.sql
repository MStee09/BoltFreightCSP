/*
  # Fix Email Threading Logic

  ## Overview
  This migration fixes the email threading logic to properly handle replies
  by prioritizing message_id linkage over subject matching.

  ## Changes

  1. Update check_awaiting_reply function
    - Use in_reply_to_message_id to find parent thread
    - Preserve thread_id from parent email when replying
    - Fall back to subject matching only if no parent found

  2. Add helper function to find thread by message_id
    - Looks up thread_id from parent email
    - Ensures replies stay in same thread

  3. Update thread_id generation
    - First checks for parent via in_reply_to_message_id
    - Then checks subject matching
    - Finally generates new thread for new conversations

  ## Security
  - Maintains existing RLS policies
  - Functions run with appropriate privileges
*/

-- Function to find parent thread by message_id
CREATE OR REPLACE FUNCTION find_parent_thread(p_in_reply_to text)
RETURNS text AS $$
DECLARE
  parent_thread text;
BEGIN
  IF p_in_reply_to IS NULL THEN
    RETURN NULL;
  END IF;
  
  SELECT thread_id INTO parent_thread
  FROM email_activities
  WHERE message_id = p_in_reply_to
  LIMIT 1;
  
  RETURN parent_thread;
END;
$$ LANGUAGE plpgsql STABLE;

-- Update check_awaiting_reply to properly set thread_id
CREATE OR REPLACE FUNCTION check_awaiting_reply()
RETURNS TRIGGER AS $$
DECLARE
  parent_thread text;
BEGIN
  -- First, try to find thread from in_reply_to_message_id
  IF NEW.in_reply_to_message_id IS NOT NULL THEN
    parent_thread := find_parent_thread(NEW.in_reply_to_message_id);
    
    IF parent_thread IS NOT NULL THEN
      NEW.thread_id := parent_thread;
    END IF;
  END IF;
  
  -- If no thread found via message_id, generate from subject
  IF NEW.thread_id IS NULL AND NEW.subject IS NOT NULL THEN
    NEW.thread_id := generate_thread_id(NEW.subject);
  END IF;

  -- For outbound emails, mark as awaiting reply
  IF NEW.direction = 'outbound' AND NEW.thread_id IS NOT NULL THEN
    NEW.awaiting_reply := true;
    NEW.awaiting_reply_since := COALESCE(NEW.sent_at, NOW());
    NEW.reply_by_date := COALESCE(NEW.sent_at, NOW()) + INTERVAL '3 days';
  END IF;

  -- Set is_thread_starter based on whether this is a reply
  IF NEW.in_reply_to_message_id IS NOT NULL THEN
    NEW.is_thread_starter := false;
  ELSIF NEW.thread_id IS NOT NULL THEN
    -- Check if this is the first message in thread
    NEW.is_thread_starter := NOT EXISTS (
      SELECT 1 FROM email_activities
      WHERE thread_id = NEW.thread_id
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to merge threads (for manual correction)
CREATE OR REPLACE FUNCTION merge_email_threads(
  p_source_thread_id text,
  p_target_thread_id text
)
RETURNS void AS $$
BEGIN
  -- Update all emails in source thread to target thread
  UPDATE email_activities
  SET thread_id = p_target_thread_id
  WHERE thread_id = p_source_thread_id;
  
  -- Recalculate thread metadata for target thread
  UPDATE email_activities e
  SET 
    thread_message_count = (
      SELECT COUNT(*)
      FROM email_activities
      WHERE thread_id = p_target_thread_id
    ),
    thread_participants = (
      SELECT array_agg(DISTINCT participant)
      FROM (
        SELECT unnest(array_cat(to_emails, COALESCE(cc_emails, ARRAY[]::text[]))) as participant
        FROM email_activities
        WHERE thread_id = p_target_thread_id
        UNION
        SELECT from_email as participant
        FROM email_activities
        WHERE thread_id = p_target_thread_id
      ) participants
    )
  WHERE thread_id = p_target_thread_id;
  
  -- Mark first message as thread starter
  UPDATE email_activities
  SET is_thread_starter = false
  WHERE thread_id = p_target_thread_id;
  
  UPDATE email_activities
  SET is_thread_starter = true
  WHERE id = (
    SELECT id
    FROM email_activities
    WHERE thread_id = p_target_thread_id
    ORDER BY COALESCE(sent_at, created_at) ASC
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix existing emails that should be in same thread based on subject
DO $$
DECLARE
  thread_record RECORD;
  first_id uuid;
BEGIN
  -- For each unique normalized subject with multiple emails
  FOR thread_record IN (
    SELECT generate_thread_id(subject) as normalized_thread
    FROM email_activities
    WHERE subject IS NOT NULL
    GROUP BY generate_thread_id(subject)
    HAVING COUNT(*) > 1
  )
  LOOP
    -- Get the first email in this thread (by date)
    SELECT id INTO first_id
    FROM email_activities
    WHERE generate_thread_id(subject) = thread_record.normalized_thread
    ORDER BY COALESCE(sent_at, created_at) ASC
    LIMIT 1;
    
    -- Update all emails with this normalized subject
    UPDATE email_activities
    SET 
      thread_id = thread_record.normalized_thread,
      is_thread_starter = (id = first_id)
    WHERE generate_thread_id(subject) = thread_record.normalized_thread;
  END LOOP;
END $$;

-- Update thread metadata for all threads
UPDATE email_activities e
SET 
  thread_message_count = (
    SELECT COUNT(*)
    FROM email_activities
    WHERE thread_id = e.thread_id
  ),
  thread_participants = (
    SELECT array_agg(DISTINCT participant)
    FROM (
      SELECT unnest(array_cat(to_emails, COALESCE(cc_emails, ARRAY[]::text[]))) as participant
      FROM email_activities
      WHERE thread_id = e.thread_id
      UNION
      SELECT from_email as participant
      FROM email_activities
      WHERE thread_id = e.thread_id
    ) participants
  )
WHERE thread_id IS NOT NULL;
