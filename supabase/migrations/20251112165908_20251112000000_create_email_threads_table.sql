/*
  # Create Email Threads Table

  1. New Table
    - email_threads: Consolidated view of email conversations
    - Tracks thread status, ownership, and metadata
    - Links to CSP events, customers, and carriers

  2. Fields
    - id: unique thread identifier (matches thread_id in email_activities)
    - status: awaiting_reply | active | stalled | closed
    - owner_id: user who sent first outbound message
    - subject: thread subject line
    - csp_event_id, customer_id, carrier_id: entity associations
    - last_activity_at: timestamp of last message
    - last_activity_type: inbound | outbound
    - message_count: total messages in thread
    - participant_emails: array of all participants
    - is_read: whether owner has seen latest activity
    - created_at, updated_at

  3. Security
    - Enable RLS
    - Users can view all threads (team visibility)
    - Only owners/admins can update status and reassign
*/

CREATE TABLE IF NOT EXISTS email_threads (
  id text PRIMARY KEY,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('awaiting_reply', 'active', 'stalled', 'closed')),
  owner_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  subject text NOT NULL,
  csp_event_id uuid REFERENCES csp_events(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  carrier_id uuid REFERENCES carriers(id) ON DELETE CASCADE,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  last_activity_type text CHECK (last_activity_type IN ('inbound', 'outbound')),
  message_count integer DEFAULT 1,
  participant_emails text[] DEFAULT '{}',
  is_read boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE email_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all threads"
  ON email_threads FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Thread owners can update their threads"
  ON email_threads FOR UPDATE
  TO authenticated
  USING (owner_id = (SELECT auth.uid()))
  WITH CHECK (owner_id = (SELECT auth.uid()));

CREATE POLICY "Admins can update any thread"
  ON email_threads FOR UPDATE
  TO authenticated
  USING ((SELECT auth.jwt()->>'app_role') = 'admin')
  WITH CHECK ((SELECT auth.jwt()->>'app_role') = 'admin');

CREATE POLICY "System can insert threads"
  ON email_threads FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Thread owners can delete their threads"
  ON email_threads FOR DELETE
  TO authenticated
  USING (owner_id = (SELECT auth.uid()));

CREATE POLICY "Admins can delete any thread"
  ON email_threads FOR DELETE
  TO authenticated
  USING ((SELECT auth.jwt()->>'app_role') = 'admin');

CREATE INDEX IF NOT EXISTS idx_email_threads_owner_id ON email_threads(owner_id);
CREATE INDEX IF NOT EXISTS idx_email_threads_status ON email_threads(status);
CREATE INDEX IF NOT EXISTS idx_email_threads_last_activity ON email_threads(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_threads_csp_event ON email_threads(csp_event_id);
CREATE INDEX IF NOT EXISTS idx_email_threads_customer ON email_threads(customer_id);
CREATE INDEX IF NOT EXISTS idx_email_threads_carrier ON email_threads(carrier_id);