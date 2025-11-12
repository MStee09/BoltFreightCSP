/*
  # Create Email Drafts Table and Function

  1. New Table
    - email_drafts: Stores unsent email drafts for auto-save functionality

  2. New Function
    - get_user_active_drafts: Returns active drafts for current user

  3. Security
    - Enable RLS on drafts table
    - Users can only access their own drafts
*/

CREATE TABLE IF NOT EXISTS email_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  csp_event_id uuid REFERENCES csp_events(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  carrier_id uuid REFERENCES carriers(id) ON DELETE CASCADE,
  to_emails text[] DEFAULT '{}',
  cc_emails text[] DEFAULT '{}',
  subject text DEFAULT '',
  body text DEFAULT '',
  tracking_code text,
  in_reply_to text,
  thread_id text,
  is_minimized boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE email_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own drafts"
  ON email_drafts FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can create own drafts"
  ON email_drafts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own drafts"
  ON email_drafts FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own drafts"
  ON email_drafts FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE INDEX IF NOT EXISTS idx_email_drafts_user_id ON email_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_email_drafts_updated_at ON email_drafts(updated_at DESC);

CREATE OR REPLACE FUNCTION get_user_active_drafts()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  csp_event_id uuid,
  customer_id uuid,
  carrier_id uuid,
  to_emails text[],
  cc_emails text[],
  subject text,
  body text,
  tracking_code text,
  in_reply_to text,
  thread_id text,
  is_minimized boolean,
  created_at timestamptz,
  updated_at timestamptz
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.user_id,
    d.csp_event_id,
    d.customer_id,
    d.carrier_id,
    d.to_emails,
    d.cc_emails,
    d.subject,
    d.body,
    d.tracking_code,
    d.in_reply_to,
    d.thread_id,
    d.is_minimized,
    d.created_at,
    d.updated_at
  FROM email_drafts d
  WHERE d.user_id = (SELECT auth.uid())
  ORDER BY d.updated_at DESC;
END;
$$;