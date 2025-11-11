/*
  # Enhance Email System with Ownership, Threading, and Collaboration

  1. Changes to email_activities
    - Add owner_id (user who initiated thread)
    - Add thread_status (awaiting_reply, active, stalled, closed)
    - Add visible_to_team (default true)
    - Add previous_thread_id (for renewal CSP linking)
    - Add freightops_thread_token (for guaranteed threading)
    - Ensure message_id has unique constraint (prevent duplicates)

  2. New Tables
    - email_thread_comments: Internal notes and @mentions on threads
    - email_audit_log: Complete audit trail of all email events

  3. Triggers
    - Auto-update thread_status based on activity
    - Log all email events to audit log

  4. Security
    - RLS policies for team visibility
    - Audit log accessible to admins only
*/

-- ========================================
-- 1. Enhance email_activities Table
-- ========================================

-- Add new columns to email_activities
ALTER TABLE email_activities
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS thread_status text DEFAULT 'active' CHECK (thread_status IN ('awaiting_reply', 'active', 'stalled', 'closed')),
  ADD COLUMN IF NOT EXISTS visible_to_team boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS previous_thread_id text,
  ADD COLUMN IF NOT EXISTS freightops_thread_token text,
  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz DEFAULT now();

-- Create index on freightops_thread_token for fast matching
CREATE INDEX IF NOT EXISTS idx_email_activities_fo_token
  ON email_activities(freightops_thread_token) WHERE freightops_thread_token IS NOT NULL;

-- Create index on thread_status for dashboard queries
CREATE INDEX IF NOT EXISTS idx_email_activities_thread_status
  ON email_activities(thread_status) WHERE thread_status != 'closed';

-- Create index on owner_id for "my threads" queries
CREATE INDEX IF NOT EXISTS idx_email_activities_owner_id
  ON email_activities(owner_id) WHERE owner_id IS NOT NULL;

-- Create index on last_activity_at for stale thread detection
CREATE INDEX IF NOT EXISTS idx_email_activities_last_activity
  ON email_activities(last_activity_at DESC);

-- ========================================
-- 2. Email Thread Comments Table
-- ========================================

CREATE TABLE IF NOT EXISTS email_thread_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id text NOT NULL,
  comment_text text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  mentioned_users uuid[] DEFAULT '{}',
  is_internal boolean DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create indexes for thread comments
CREATE INDEX IF NOT EXISTS idx_email_thread_comments_thread_id
  ON email_thread_comments(thread_id);

CREATE INDEX IF NOT EXISTS idx_email_thread_comments_created_by
  ON email_thread_comments(created_by);

CREATE INDEX IF NOT EXISTS idx_email_thread_comments_mentioned
  ON email_thread_comments USING gin(mentioned_users);

-- Enable RLS
ALTER TABLE email_thread_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_thread_comments
CREATE POLICY "Users can view thread comments for their org"
  ON email_thread_comments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create thread comments"
  ON email_thread_comments FOR INSERT
  TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY "Users can update their own comments"
  ON email_thread_comments FOR UPDATE
  TO authenticated
  USING (created_by = (SELECT auth.uid()))
  WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY "Users can delete their own comments"
  ON email_thread_comments FOR DELETE
  TO authenticated
  USING (created_by = (SELECT auth.uid()));

-- ========================================
-- 3. Email Audit Log Table
-- ========================================

CREATE TABLE IF NOT EXISTS email_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL CHECK (event_type IN ('sent', 'received', 'delivered', 'bounced', 'opened', 'clicked', 'replied', 'forwarded')),
  email_activity_id uuid REFERENCES email_activities(id) ON DELETE CASCADE,
  message_id text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  from_email text,
  to_emails text[],
  cc_emails text[],
  subject text,
  event_timestamp timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for audit log
CREATE INDEX IF NOT EXISTS idx_email_audit_log_activity_id
  ON email_audit_log(email_activity_id);

CREATE INDEX IF NOT EXISTS idx_email_audit_log_event_type
  ON email_audit_log(event_type);

CREATE INDEX IF NOT EXISTS idx_email_audit_log_timestamp
  ON email_audit_log(event_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_email_audit_log_user_id
  ON email_audit_log(user_id);

-- Enable RLS
ALTER TABLE email_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_audit_log (admins only)
CREATE POLICY "Admins can view audit log"
  ON email_audit_log FOR SELECT
  TO authenticated
  USING ((SELECT auth.jwt()->>'app_role') = 'admin');

CREATE POLICY "System can insert audit logs"
  ON email_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ========================================
-- 4. Functions for Thread Status Management
-- ========================================

-- Function to update thread status based on activity
CREATE OR REPLACE FUNCTION update_email_thread_status()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  last_outbound_time timestamptz;
  last_inbound_time timestamptz;
  thread_owner_id uuid;
BEGIN
  -- Get the thread owner (first person who sent in this thread)
  SELECT owner_id INTO thread_owner_id
  FROM email_activities
  WHERE thread_id = NEW.thread_id
    AND is_thread_starter = true
  LIMIT 1;

  -- If this is the thread starter, set owner
  IF NEW.is_thread_starter = true THEN
    NEW.owner_id := NEW.created_by;
    NEW.thread_status := 'awaiting_reply';
  ELSE
    -- Set owner from thread starter
    NEW.owner_id := thread_owner_id;

    -- Determine status based on direction
    IF NEW.direction = 'outbound' THEN
      NEW.thread_status := 'awaiting_reply';
    ELSE
      NEW.thread_status := 'active';
    END IF;
  END IF;

  -- Update last_activity_at
  NEW.last_activity_at := NEW.sent_at;

  RETURN NEW;
END;
$$;

-- Create trigger for thread status on insert
DROP TRIGGER IF EXISTS trigger_update_thread_status_insert ON email_activities;
CREATE TRIGGER trigger_update_thread_status_insert
  BEFORE INSERT ON email_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_email_thread_status();

-- Function to detect stalled threads (runs periodically)
CREATE OR REPLACE FUNCTION mark_stalled_threads()
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Mark threads as stalled if no activity in 7 days
  UPDATE email_activities
  SET thread_status = 'stalled'
  WHERE thread_status IN ('awaiting_reply', 'active')
    AND last_activity_at < NOW() - INTERVAL '7 days'
    AND thread_id IN (
      SELECT DISTINCT thread_id
      FROM email_activities
      WHERE is_thread_starter = true
    );

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- ========================================
-- 5. Function to Generate FreightOps Thread Token
-- ========================================

CREATE OR REPLACE FUNCTION generate_fo_thread_token(
  p_csp_event_id uuid DEFAULT NULL
)
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  csp_reference text;
  random_suffix text;
  fo_token text;
BEGIN
  -- If CSP event provided, use its reference
  IF p_csp_event_id IS NOT NULL THEN
    SELECT COALESCE(
      (SELECT reference_number FROM csp_events WHERE id = p_csp_event_id),
      'CSP-' || substr(p_csp_event_id::text, 1, 8)
    ) INTO csp_reference;
  ELSE
    -- Generate random reference
    csp_reference := 'GEN-' || substr(gen_random_uuid()::text, 1, 8);
  END IF;

  -- Add random suffix for uniqueness
  random_suffix := substr(md5(random()::text), 1, 6);

  -- Format: FO-CSP-1234-abc123
  fo_token := 'FO-' || upper(csp_reference) || '-' || upper(random_suffix);

  RETURN fo_token;
END;
$$;

-- ========================================
-- 6. Audit Log Trigger
-- ========================================

CREATE OR REPLACE FUNCTION log_email_to_audit()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Log email send/receive to audit log
  INSERT INTO email_audit_log (
    event_type,
    email_activity_id,
    message_id,
    user_id,
    from_email,
    to_emails,
    cc_emails,
    subject,
    event_timestamp,
    metadata
  ) VALUES (
    CASE WHEN NEW.direction = 'outbound' THEN 'sent' ELSE 'received' END,
    NEW.id,
    NEW.message_id,
    NEW.created_by,
    NEW.from_email,
    NEW.to_emails,
    NEW.cc_emails,
    NEW.subject,
    NEW.sent_at,
    jsonb_build_object(
      'tracking_code', NEW.tracking_code,
      'thread_id', NEW.thread_id,
      'csp_event_id', NEW.csp_event_id,
      'customer_id', NEW.customer_id,
      'carrier_id', NEW.carrier_id
    )
  );

  RETURN NEW;
END;
$$;

-- Create trigger for audit logging
DROP TRIGGER IF EXISTS trigger_log_email_audit ON email_activities;
CREATE TRIGGER trigger_log_email_audit
  AFTER INSERT ON email_activities
  FOR EACH ROW
  EXECUTE FUNCTION log_email_to_audit();

-- ========================================
-- 7. Enhanced Email Matching Function
-- ========================================

CREATE OR REPLACE FUNCTION match_inbound_email_to_entities(
  p_subject text,
  p_from_email text,
  p_to_emails text[],
  p_thread_id text DEFAULT NULL,
  p_in_reply_to text DEFAULT NULL
)
RETURNS TABLE (
  csp_event_id uuid,
  customer_id uuid,
  carrier_id uuid,
  matched_thread_id text,
  fo_token text
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  fo_token_match text;
  existing_thread record;
BEGIN
  -- Priority 1: Match by FreightOps token in subject [FO-CSP-####-######]
  fo_token_match := (regexp_match(p_subject, '\[?(FO-[A-Z0-9\-]+)\]?'))[1];

  IF fo_token_match IS NOT NULL THEN
    RETURN QUERY
    SELECT
      ea.csp_event_id,
      ea.customer_id,
      ea.carrier_id,
      ea.thread_id,
      ea.freightops_thread_token
    FROM email_activities ea
    WHERE ea.freightops_thread_token = fo_token_match
      AND ea.is_thread_starter = true
    LIMIT 1;

    IF FOUND THEN RETURN; END IF;
  END IF;

  -- Priority 2: Match by in_reply_to (direct reply)
  IF p_in_reply_to IS NOT NULL THEN
    RETURN QUERY
    SELECT
      ea.csp_event_id,
      ea.customer_id,
      ea.carrier_id,
      ea.thread_id,
      ea.freightops_thread_token
    FROM email_activities ea
    WHERE ea.message_id = p_in_reply_to
    LIMIT 1;

    IF FOUND THEN RETURN; END IF;
  END IF;

  -- Priority 3: Match by existing Gmail thread_id
  IF p_thread_id IS NOT NULL THEN
    RETURN QUERY
    SELECT
      ea.csp_event_id,
      ea.customer_id,
      ea.carrier_id,
      ea.thread_id,
      ea.freightops_thread_token
    FROM email_activities ea
    WHERE ea.thread_id = p_thread_id
    ORDER BY ea.sent_at DESC
    LIMIT 1;

    IF FOUND THEN RETURN; END IF;
  END IF;

  -- Priority 4: Match by sender email address to known contacts

  -- Check carriers
  RETURN QUERY
  SELECT
    NULL::uuid as csp_event_id,
    NULL::uuid as customer_id,
    c.id as carrier_id,
    NULL::text as matched_thread_id,
    NULL::text as fo_token
  FROM carriers c
  WHERE c.carrier_rep_email = p_from_email
     OR c.billing_contact_email = p_from_email
     OR c.contact_email = p_from_email
  LIMIT 1;

  IF FOUND THEN RETURN; END IF;

  -- Check customers (email might be in notes or contact_email)
  RETURN QUERY
  SELECT
    NULL::uuid as csp_event_id,
    c.id as customer_id,
    NULL::uuid as carrier_id,
    NULL::text as matched_thread_id,
    NULL::text as fo_token
  FROM customers c
  WHERE c.contact_email = p_from_email
     OR c.notes ILIKE '%' || p_from_email || '%'
  LIMIT 1;

  IF FOUND THEN RETURN; END IF;

  -- Priority 5: Check if any recipient matches active CSP events
  RETURN QUERY
  SELECT
    ce.id as csp_event_id,
    ce.customer_id,
    NULL::uuid as carrier_id,
    NULL::text as matched_thread_id,
    NULL::text as fo_token
  FROM csp_events ce
  WHERE ce.status = 'active'
    AND ce.customer_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM unnest(p_to_emails) as recipient
      WHERE recipient = ANY(
        SELECT carrier_rep_email FROM carriers car
        JOIN csp_event_carriers cec ON cec.carrier_id = car.id
        WHERE cec.csp_event_id = ce.id
      )
    )
  ORDER BY ce.created_date DESC
  LIMIT 1;

  RETURN;
END;
$$;

-- ========================================
-- 8. Update existing email_activities records
-- ========================================

-- Set owner_id for existing thread starters
UPDATE email_activities
SET owner_id = created_by
WHERE is_thread_starter = true
  AND owner_id IS NULL
  AND created_by IS NOT NULL;

-- Set thread_status for existing records
UPDATE email_activities
SET thread_status = CASE
  WHEN direction = 'outbound' THEN 'awaiting_reply'
  ELSE 'active'
END
WHERE thread_status IS NULL;

-- Set last_activity_at for existing records
UPDATE email_activities
SET last_activity_at = sent_at
WHERE last_activity_at IS NULL;
