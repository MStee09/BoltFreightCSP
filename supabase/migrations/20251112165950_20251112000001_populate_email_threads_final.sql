/*
  # Populate Email Threads from Existing Email Activities

  1. Purpose
    - Migrate existing email_activities into email_threads table
    - Group by thread_id
    - Calculate thread metadata (message count, participants, etc)

  2. Process
    - Create one thread per unique thread_id
    - Set owner to first outbound message sender
    - Aggregate participant emails
    - Calculate status based on last activity
*/

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
  created_at,
  updated_at
)
SELECT
  thread_id AS id,
  CASE
    WHEN MAX(CASE WHEN direction = 'outbound' THEN sent_at END) > COALESCE(MAX(CASE WHEN direction = 'inbound' THEN sent_at END), '1970-01-01'::timestamptz)
      THEN 'awaiting_reply'
    WHEN EXTRACT(EPOCH FROM (NOW() - MAX(sent_at))) > 604800 
      THEN 'stalled'
    ELSE 'active'
  END AS status,
  (ARRAY_AGG(owner_id ORDER BY CASE WHEN direction = 'outbound' THEN 0 ELSE 1 END, sent_at) FILTER (WHERE owner_id IS NOT NULL))[1] AS owner_id,
  (ARRAY_AGG(subject ORDER BY sent_at DESC))[1] AS subject,
  (ARRAY_AGG(csp_event_id ORDER BY sent_at DESC) FILTER (WHERE csp_event_id IS NOT NULL))[1] AS csp_event_id,
  (ARRAY_AGG(customer_id ORDER BY sent_at DESC) FILTER (WHERE customer_id IS NOT NULL))[1] AS customer_id,
  (ARRAY_AGG(carrier_id ORDER BY sent_at DESC) FILTER (WHERE carrier_id IS NOT NULL))[1] AS carrier_id,
  MAX(sent_at) AS last_activity_at,
  (ARRAY_AGG(direction ORDER BY sent_at DESC))[1] AS last_activity_type,
  COUNT(*) AS message_count,
  ARRAY(
    SELECT DISTINCT unnest_email
    FROM (
      SELECT unnest(ARRAY[from_email] || to_emails || cc_emails) AS unnest_email
      FROM email_activities e2
      WHERE e2.thread_id = e1.thread_id
    ) sub
    WHERE unnest_email IS NOT NULL AND unnest_email != ''
  ) AS participant_emails,
  MIN(sent_at) AS created_at,
  MAX(sent_at) AS updated_at
FROM email_activities e1
WHERE thread_id IS NOT NULL
  AND thread_id != ''
GROUP BY thread_id
ON CONFLICT (id) DO UPDATE SET
  message_count = EXCLUDED.message_count,
  last_activity_at = EXCLUDED.last_activity_at,
  last_activity_type = EXCLUDED.last_activity_type,
  participant_emails = EXCLUDED.participant_emails,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;