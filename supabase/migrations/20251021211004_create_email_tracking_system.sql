/*
  # Email Tracking System

  ## Overview
  Creates a comprehensive email tracking system that captures all customer/carrier communications
  through CC tracking and Gmail API monitoring.

  ## New Tables
  
  ### `email_activities`
  - `id` (uuid, primary key) - Unique identifier
  - `tracking_code` (text, unique, indexed) - Subject line tracking code (e.g., CSP-1234)
  - `csp_event_id` (uuid, foreign key) - Links to calendar_events
  - `customer_id` (uuid, foreign key) - Links to customers
  - `carrier_id` (uuid, foreign key, nullable) - Links to carriers if applicable
  - `thread_id` (text, indexed) - Gmail thread ID for grouping conversations
  - `message_id` (text, unique) - Gmail message ID
  - `subject` (text) - Email subject line
  - `from_email` (text) - Sender email address
  - `from_name` (text) - Sender name
  - `to_emails` (text[]) - Array of recipient emails
  - `cc_emails` (text[]) - Array of CC emails
  - `body_text` (text) - Plain text email body
  - `body_html` (text) - HTML email body
  - `direction` (text) - 'outbound' or 'inbound'
  - `sent_at` (timestamptz) - When email was sent/received
  - `created_at` (timestamptz) - When record was created
  - `created_by` (uuid, foreign key) - User who sent (for outbound)
  - `metadata` (jsonb) - Additional data (attachments, labels, etc.)

  ### `gmail_watch_subscriptions`
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid, foreign key) - Links to auth.users
  - `email_address` (text) - Gmail address being watched
  - `history_id` (text) - Gmail history ID for incremental sync
  - `expiration` (timestamptz) - When watch expires
  - `is_active` (boolean) - Whether watch is currently active
  - `created_at` (timestamptz) - When subscription was created
  - `updated_at` (timestamptz) - Last update

  ## Security
  - Enable RLS on all tables
  - Authenticated users can view email activities for their organization
  - Only authenticated users can create email activities
  - Gmail watch subscriptions are user-specific

  ## Indexes
  - `tracking_code` for quick lookup
  - `thread_id` for grouping conversations
  - `csp_event_id` for event-based queries
  - `customer_id` and `carrier_id` for timeline views
*/

-- Create email_activities table
CREATE TABLE IF NOT EXISTS email_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_code text UNIQUE NOT NULL,
  csp_event_id uuid REFERENCES calendar_events(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  carrier_id uuid REFERENCES carriers(id) ON DELETE SET NULL,
  thread_id text,
  message_id text UNIQUE NOT NULL,
  subject text NOT NULL,
  from_email text NOT NULL,
  from_name text,
  to_emails text[] NOT NULL DEFAULT '{}',
  cc_emails text[] NOT NULL DEFAULT '{}',
  body_text text,
  body_html text,
  direction text NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create indexes for email_activities
CREATE INDEX IF NOT EXISTS idx_email_activities_tracking_code ON email_activities(tracking_code);
CREATE INDEX IF NOT EXISTS idx_email_activities_thread_id ON email_activities(thread_id);
CREATE INDEX IF NOT EXISTS idx_email_activities_csp_event_id ON email_activities(csp_event_id);
CREATE INDEX IF NOT EXISTS idx_email_activities_customer_id ON email_activities(customer_id);
CREATE INDEX IF NOT EXISTS idx_email_activities_carrier_id ON email_activities(carrier_id);
CREATE INDEX IF NOT EXISTS idx_email_activities_sent_at ON email_activities(sent_at DESC);

-- Create gmail_watch_subscriptions table
CREATE TABLE IF NOT EXISTS gmail_watch_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email_address text NOT NULL,
  history_id text NOT NULL,
  expiration timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, email_address)
);

-- Create index for active subscriptions
CREATE INDEX IF NOT EXISTS idx_gmail_watch_active ON gmail_watch_subscriptions(is_active, expiration);

-- Enable RLS
ALTER TABLE email_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmail_watch_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_activities

-- Allow authenticated users to view all email activities (organization-wide)
CREATE POLICY "Authenticated users can view email activities"
  ON email_activities
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert email activities
CREATE POLICY "Authenticated users can create email activities"
  ON email_activities
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow users to update their own sent emails
CREATE POLICY "Users can update their own email activities"
  ON email_activities
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- RLS Policies for gmail_watch_subscriptions

-- Users can view their own subscriptions
CREATE POLICY "Users can view own gmail subscriptions"
  ON gmail_watch_subscriptions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can create their own subscriptions
CREATE POLICY "Users can create own gmail subscriptions"
  ON gmail_watch_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own subscriptions
CREATE POLICY "Users can update own gmail subscriptions"
  ON gmail_watch_subscriptions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own subscriptions
CREATE POLICY "Users can delete own gmail subscriptions"
  ON gmail_watch_subscriptions
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Function to generate tracking codes
CREATE OR REPLACE FUNCTION generate_tracking_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  LOOP
    -- Generate code like CSP-1234
    new_code := 'CSP-' || LPAD(floor(random() * 10000)::text, 4, '0');
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM email_activities WHERE tracking_code = new_code) INTO code_exists;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;
