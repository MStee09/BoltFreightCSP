/*
  # Fix Email Threading to Match Gmail Threads

  1. Problem
    - Gmail polling finds emails but they don't match existing threads
    - Gmail uses its own threadId format but we store custom thread_ids
    - Need to match by finding ANY email with the same Gmail threadId

  2. Solution
    - Update match_inbound_email_to_entities to search message_id field
    - The message_id field stores Gmail's message ID
    - If we find any email with matching Gmail threadId in the message_id, use that thread

  3. Security
    - Function already has SECURITY DEFINER and proper search_path
*/

-- Update the matching function to be smarter about Gmail thread matching
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
  gmail_thread_match record;
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

  -- Priority 3: Match by Gmail thread_id
  -- Look for any email that shares the same Gmail threadId
  -- Gmail stores thread IDs in the message_id when they're from Gmail
  IF p_thread_id IS NOT NULL THEN
    -- First try exact thread_id match (our custom IDs)
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

    -- If no match, look for emails where message_id contains part of the thread
    -- This helps match when Gmail assigns the same threadId to multiple messages
    RETURN QUERY
    SELECT DISTINCT ON (ea.thread_id)
      ea.csp_event_id,
      ea.customer_id,
      ea.carrier_id,
      ea.thread_id,
      ea.freightops_thread_token
    FROM email_activities ea
    WHERE ea.message_id LIKE '%' || substring(p_thread_id from 1 for 10) || '%'
       OR ea.thread_id IN (
         SELECT DISTINCT thread_id 
         FROM email_activities 
         WHERE message_id::text LIKE '%' || p_thread_id || '%'
       )
    ORDER BY ea.thread_id, ea.sent_at DESC
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