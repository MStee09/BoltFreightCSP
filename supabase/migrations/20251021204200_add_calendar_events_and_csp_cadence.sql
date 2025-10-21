/*
  # Add calendar events and CSP review cadence
  
  1. New Tables
    - `calendar_events`
      - `id` (uuid, primary key)
      - `event_type` (text) - 'csp_review' or 'honeymoon_check'
      - `title` (text)
      - `description` (text)
      - `event_date` (date)
      - `status` (text) - 'pending', 'completed', 'cancelled'
      - `entity_type` (text) - 'customer' or 'csp_event'
      - `entity_id` (uuid)
      - `customer_id` (uuid, foreign key)
      - `csp_event_id` (uuid, foreign key, nullable)
      - `assigned_to` (text)
      - `metadata` (jsonb) - for additional data like honeymoon_day
      - `created_date` (timestamptz)
      - `completed_date` (timestamptz, nullable)
      - `user_id` (uuid)
  
  2. Changes to Existing Tables
    - Add `csp_review_frequency` to customers table
      - Values: 'monthly', 'quarterly', 'semi_annual', 'annual'
    - Add `last_csp_review_date` to customers table
    - Add `next_csp_review_date` to customers table
    - Add `honeymoon_monitoring` to csp_events table (boolean)
    - Add `go_live_date` to csp_events table (date)
  
  3. Security
    - Enable RLS on `calendar_events` table
    - Add policies for authenticated users to manage their own calendar events
*/

-- Add CSP review cadence fields to customers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'csp_review_frequency'
  ) THEN
    ALTER TABLE customers ADD COLUMN csp_review_frequency text DEFAULT 'quarterly';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'last_csp_review_date'
  ) THEN
    ALTER TABLE customers ADD COLUMN last_csp_review_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'next_csp_review_date'
  ) THEN
    ALTER TABLE customers ADD COLUMN next_csp_review_date date;
  END IF;
END $$;

-- Add honeymoon monitoring fields to csp_events table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'csp_events' AND column_name = 'honeymoon_monitoring'
  ) THEN
    ALTER TABLE csp_events ADD COLUMN honeymoon_monitoring boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'csp_events' AND column_name = 'go_live_date'
  ) THEN
    ALTER TABLE csp_events ADD COLUMN go_live_date date;
  END IF;
END $$;

-- Create calendar_events table
CREATE TABLE IF NOT EXISTS calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  event_date date NOT NULL,
  status text DEFAULT 'pending',
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  customer_id uuid REFERENCES customers(id),
  csp_event_id uuid REFERENCES csp_events(id),
  assigned_to text DEFAULT '',
  metadata jsonb DEFAULT '{}',
  created_date timestamptz DEFAULT now(),
  completed_date timestamptz,
  user_id uuid NOT NULL
);

-- Enable RLS
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for calendar_events
CREATE POLICY "Users can view own calendar events"
  ON calendar_events FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own calendar events"
  ON calendar_events FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own calendar events"
  ON calendar_events FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own calendar events"
  ON calendar_events FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_calendar_events_event_date ON calendar_events(event_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_customer_id ON calendar_events(customer_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_csp_event_id ON calendar_events(csp_event_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_status ON calendar_events(status);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON calendar_events(user_id);
