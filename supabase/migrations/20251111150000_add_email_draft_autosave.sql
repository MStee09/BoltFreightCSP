/*
  # Add Email Draft Autosave System

  1. New Tables
    - email_drafts: Store unsent email drafts with autosave
    - user_composer_preferences: Store composer position/size per user

  2. Features
    - Autosave every 10 seconds
    - Multiple drafts per user
    - Position/size memory
    - Auto-restore on reload

  3. Security
    - RLS policies for user-only access
*/

-- ========================================
-- 1. Email Drafts Table
-- ========================================

CREATE TABLE IF NOT EXISTS email_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  csp_event_id uuid REFERENCES csp_events(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  carrier_id uuid REFERENCES carriers(id) ON DELETE CASCADE,
  to_emails text[] DEFAULT '{}',
  cc_emails text[] DEFAULT '{}',
  subject text DEFAULT '',
  body text DEFAULT '',
  tracking_code text,
  template_id uuid REFERENCES email_templates(id) ON DELETE SET NULL,
  in_reply_to text,
  thread_id text,
  is_minimized boolean DEFAULT false,
  position_index integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_autosave_at timestamptz
);

-- Create indexes for drafts
CREATE INDEX IF NOT EXISTS idx_email_drafts_user_id
  ON email_drafts(user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_drafts_csp_event
  ON email_drafts(csp_event_id) WHERE csp_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_drafts_customer
  ON email_drafts(customer_id) WHERE customer_id IS NOT NULL;

-- Enable RLS
ALTER TABLE email_drafts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for drafts (user-only access)
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

-- ========================================
-- 2. User Composer Preferences Table
-- ========================================

CREATE TABLE IF NOT EXISTS user_composer_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  window_width integer DEFAULT 550,
  window_height integer DEFAULT 650,
  default_position text DEFAULT 'bottom-right' CHECK (default_position IN ('bottom-right', 'bottom-left', 'center')),
  stack_offset_x integer DEFAULT 20,
  stack_offset_y integer DEFAULT 20,
  auto_minimize boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_composer_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for preferences
CREATE POLICY "Users can view own preferences"
  ON user_composer_preferences FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can manage own preferences"
  ON user_composer_preferences FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ========================================
-- 3. Auto-update timestamp trigger
-- ========================================

CREATE OR REPLACE FUNCTION update_email_draft_timestamp()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  NEW.last_autosave_at := now();
  RETURN NEW;
END;
$$;

-- Trigger for draft autosave timestamp
DROP TRIGGER IF EXISTS trigger_update_draft_timestamp ON email_drafts;
CREATE TRIGGER trigger_update_draft_timestamp
  BEFORE UPDATE ON email_drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_email_draft_timestamp();

-- ========================================
-- 4. Clean up old drafts function
-- ========================================

CREATE OR REPLACE FUNCTION cleanup_old_drafts()
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete drafts older than 30 days
  DELETE FROM email_drafts
  WHERE updated_at < now() - INTERVAL '30 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- ========================================
-- 5. Get user's active drafts function
-- ========================================

CREATE OR REPLACE FUNCTION get_user_active_drafts(p_user_id uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  csp_event_id uuid,
  customer_id uuid,
  carrier_id uuid,
  to_emails text[],
  cc_emails text[],
  subject text,
  body text,
  tracking_code text,
  is_minimized boolean,
  position_index integer,
  context_title text,
  updated_at timestamptz
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  target_user_id := COALESCE(p_user_id, auth.uid());

  RETURN QUERY
  SELECT
    ed.id,
    ed.csp_event_id,
    ed.customer_id,
    ed.carrier_id,
    ed.to_emails,
    ed.cc_emails,
    ed.subject,
    ed.body,
    ed.tracking_code,
    ed.is_minimized,
    ed.position_index,
    CASE
      WHEN ed.csp_event_id IS NOT NULL THEN
        (SELECT 'CSP: ' || title FROM csp_events WHERE id = ed.csp_event_id)
      WHEN ed.customer_id IS NOT NULL THEN
        (SELECT 'Customer: ' || company_name FROM customers WHERE id = ed.customer_id)
      WHEN ed.carrier_id IS NOT NULL THEN
        (SELECT 'Carrier: ' || carrier_name FROM carriers WHERE id = ed.carrier_id)
      ELSE 'New Email'
    END as context_title,
    ed.updated_at
  FROM email_drafts ed
  WHERE ed.user_id = target_user_id
  ORDER BY ed.position_index ASC, ed.updated_at DESC;
END;
$$;
