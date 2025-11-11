/*
  # Add Gmail Thread ID Column

  1. Changes
    - Add gmail_thread_id column to store Gmail's native thread identifier
    - This allows better matching when polling Gmail for replies
    - Add index for fast lookups

  2. Security
    - No RLS changes needed
*/

-- Add column to store Gmail's native thread ID
ALTER TABLE email_activities
  ADD COLUMN IF NOT EXISTS gmail_thread_id text;

-- Create index for fast Gmail thread lookups
CREATE INDEX IF NOT EXISTS idx_email_activities_gmail_thread_id
  ON email_activities(gmail_thread_id) WHERE gmail_thread_id IS NOT NULL;

-- Update the matching function to use gmail_thread_id
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

  -- Priority 2: Match by in_reply_to (direct reply using message_id)
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
       OR ea.message_id = ('<' || p_in_reply_to || '>')
    LIMIT 1;

    IF FOUND THEN RETURN; END IF;
  END IF;

  -- Priority 3: Match by Gmail thread_id (NEW: use gmail_thread_id column)
  IF p_thread_id IS NOT NULL THEN
    -- Try matching by gmail_thread_id first
    RETURN QUERY
    SELECT
      ea.csp_event_id,
      ea.customer_id,
      ea.carrier_id,
      ea.thread_id,
      ea.freightops_thread_token
    FROM email_activities ea
    WHERE ea.gmail_thread_id = p_thread_id
    ORDER BY ea.sent_at DESC
    LIMIT 1;

    IF FOUND THEN RETURN; END IF;

    -- Fall back to custom thread_id match
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

  -- Check customers
  RETURN QUERY
  SELECT
    NULL::uuid as csp_event_id,
    c.id as customer_id,
    NULL::uuid as carrier_id,
    NULL::text as matched_thread_id,
    NULL::text as fo_token
  FROM customers c
  WHERE c.contact_email = p_from_email
  LIMIT 1;

  IF FOUND THEN RETURN; END IF;

  -- No match found
  RETURN;
END;
$$;