/*
  # Add Email Threading and Reply Tracking (HubSpot-style)

  ## Overview
  This migration adds email threading capabilities and reply tracking to create
  HubSpot-style conversation views and "awaiting reply" alerts.

  ## Changes

  1. Email Threading Fields
    - `thread_id` - Groups emails into conversations
    - `in_reply_to_message_id` - Links to parent email
    - `email_references` - Full email reference chain

  2. Reply Tracking
    - `awaiting_reply` - Boolean flag for emails needing response
    - `awaiting_reply_since` - When email started waiting
    - `reply_by_date` - Expected reply deadline

  3. Thread Metadata
    - `thread_participants` - All email addresses in thread
    - `thread_message_count` - Number of messages in thread
    - `is_thread_starter` - Identifies first message in thread

  ## Security
  - Maintains existing RLS policies
  - All functions run with SECURITY DEFINER
*/

-- Add threading and reply tracking fields to email_activities
DO $$
BEGIN
  -- Thread identification
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_activities' AND column_name = 'thread_id'
  ) THEN
    ALTER TABLE email_activities ADD COLUMN thread_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_activities' AND column_name = 'in_reply_to_message_id'
  ) THEN
    ALTER TABLE email_activities ADD COLUMN in_reply_to_message_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_activities' AND column_name = 'email_references'
  ) THEN
    ALTER TABLE email_activities ADD COLUMN email_references text[];
  END IF;

  -- Reply tracking
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_activities' AND column_name = 'awaiting_reply'
  ) THEN
    ALTER TABLE email_activities ADD COLUMN awaiting_reply boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_activities' AND column_name = 'awaiting_reply_since'
  ) THEN
    ALTER TABLE email_activities ADD COLUMN awaiting_reply_since timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_activities' AND column_name = 'reply_by_date'
  ) THEN
    ALTER TABLE email_activities ADD COLUMN reply_by_date timestamptz;
  END IF;

  -- Thread metadata
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_activities' AND column_name = 'thread_participants'
  ) THEN
    ALTER TABLE email_activities ADD COLUMN thread_participants text[];
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_activities' AND column_name = 'thread_message_count'
  ) THEN
    ALTER TABLE email_activities ADD COLUMN thread_message_count integer DEFAULT 1;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_activities' AND column_name = 'is_thread_starter'
  ) THEN
    ALTER TABLE email_activities ADD COLUMN is_thread_starter boolean DEFAULT true;
  END IF;
END $$;

-- Create index for thread lookups
CREATE INDEX IF NOT EXISTS idx_email_activities_thread_id ON email_activities(thread_id);
CREATE INDEX IF NOT EXISTS idx_email_activities_awaiting_reply ON email_activities(awaiting_reply) WHERE awaiting_reply = true;
CREATE INDEX IF NOT EXISTS idx_email_activities_message_id ON email_activities(message_id);

-- Function to generate thread ID from subject
CREATE OR REPLACE FUNCTION generate_thread_id(subject_text text)
RETURNS text AS $$
BEGIN
  -- Remove common reply prefixes and normalize
  RETURN lower(regexp_replace(
    regexp_replace(subject_text, '^(re:|fwd?:|fw:)\s*', '', 'gi'),
    '[^a-z0-9]+', '-', 'g'
  ));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to check and update awaiting reply status (BEFORE INSERT/UPDATE)
CREATE OR REPLACE FUNCTION check_awaiting_reply()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate thread_id if not set
  IF NEW.thread_id IS NULL AND NEW.subject IS NOT NULL THEN
    NEW.thread_id := generate_thread_id(NEW.subject);
  END IF;

  -- For outbound emails, mark as awaiting reply
  IF NEW.direction = 'outbound' AND NEW.thread_id IS NOT NULL THEN
    NEW.awaiting_reply := true;
    NEW.awaiting_reply_since := COALESCE(NEW.sent_at, NOW());
    NEW.reply_by_date := COALESCE(NEW.sent_at, NOW()) + INTERVAL '3 days';
  END IF;

  -- For inbound emails, mark parent thread as replied (after insert in separate trigger)
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle inbound replies (AFTER INSERT)
CREATE OR REPLACE FUNCTION handle_inbound_reply()
RETURNS TRIGGER AS $$
BEGIN
  -- For inbound emails, mark parent thread as replied
  IF NEW.direction = 'inbound' AND NEW.thread_id IS NOT NULL THEN
    UPDATE email_activities
    SET 
      awaiting_reply = false,
      awaiting_reply_since = NULL
    WHERE thread_id = NEW.thread_id
      AND id != NEW.id
      AND direction = 'outbound'
      AND awaiting_reply = true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to check awaiting reply status (BEFORE)
DROP TRIGGER IF EXISTS trigger_check_awaiting_reply ON email_activities;
CREATE TRIGGER trigger_check_awaiting_reply
  BEFORE INSERT OR UPDATE ON email_activities
  FOR EACH ROW
  EXECUTE FUNCTION check_awaiting_reply();

-- Trigger to handle inbound replies (AFTER)
DROP TRIGGER IF EXISTS trigger_handle_inbound_reply ON email_activities;
CREATE TRIGGER trigger_handle_inbound_reply
  AFTER INSERT ON email_activities
  FOR EACH ROW
  WHEN (NEW.direction = 'inbound')
  EXECUTE FUNCTION handle_inbound_reply();

-- Update existing emails to set thread_id based on subject
UPDATE email_activities
SET thread_id = generate_thread_id(subject)
WHERE thread_id IS NULL AND subject IS NOT NULL;

-- Mark first message in each thread as thread starter
WITH first_messages AS (
  SELECT DISTINCT ON (thread_id) id
  FROM email_activities
  WHERE thread_id IS NOT NULL
  ORDER BY thread_id, COALESCE(sent_at, created_at) ASC
)
UPDATE email_activities
SET is_thread_starter = true
WHERE id IN (SELECT id FROM first_messages);

-- Mark other messages as not thread starters
UPDATE email_activities
SET is_thread_starter = false
WHERE thread_id IS NOT NULL AND NOT is_thread_starter;

-- Set awaiting reply for recent outbound emails without responses
UPDATE email_activities e1
SET 
  awaiting_reply = true,
  awaiting_reply_since = COALESCE(e1.sent_at, e1.created_at),
  reply_by_date = COALESCE(e1.sent_at, e1.created_at) + INTERVAL '3 days'
WHERE e1.direction = 'outbound'
  AND e1.thread_id IS NOT NULL
  AND COALESCE(e1.sent_at, e1.created_at) > NOW() - INTERVAL '30 days'
  AND NOT EXISTS (
    SELECT 1 FROM email_activities e2
    WHERE e2.thread_id = e1.thread_id
      AND e2.direction = 'inbound'
      AND COALESCE(e2.sent_at, e2.created_at) > COALESCE(e1.sent_at, e1.created_at)
  );

-- Update thread message counts
UPDATE email_activities e
SET thread_message_count = (
  SELECT COUNT(*)
  FROM email_activities
  WHERE thread_id = e.thread_id
)
WHERE thread_id IS NOT NULL;

-- Update thread participants
UPDATE email_activities e
SET thread_participants = (
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
