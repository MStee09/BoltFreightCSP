/*
  # Add Renewal CSP Linkage and Tariff Activities - Simple Version

  1. Schema Changes
    - Add `renewal_csp_event_id` to tariffs table
    - Add `related_tariff_family_id` to csp_events table
    - Create `tariff_activities` table for lifecycle tracking

  2. Security
    - Enable RLS on tariff_activities
    - Add policies for authenticated users

  3. Indexes
    - Add foreign key indexes for performance
*/

-- Create tariff_activities table
CREATE TABLE IF NOT EXISTS tariff_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tariff_id uuid REFERENCES tariffs(id) ON DELETE CASCADE,
  tariff_family_id uuid,
  csp_event_id uuid REFERENCES csp_events(id) ON DELETE SET NULL,
  activity_type text NOT NULL,
  title text NOT NULL,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  user_name text,
  is_system boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),

  CONSTRAINT valid_activity_type CHECK (activity_type IN (
    'csp_created',
    'csp_stage_change',
    'tariff_created',
    'tariff_activated',
    'tariff_superseded',
    'tariff_expired',
    'renewal_csp_created',
    'sop_added',
    'sop_updated',
    'document_uploaded',
    'email_sent',
    'email_received',
    'note_added',
    'tariff_updated',
    'carrier_added',
    'carrier_removed'
  ))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tariff_activities_tariff_id ON tariff_activities(tariff_id);
CREATE INDEX IF NOT EXISTS idx_tariff_activities_family_id ON tariff_activities(tariff_family_id);
CREATE INDEX IF NOT EXISTS idx_tariff_activities_csp_event_id ON tariff_activities(csp_event_id);
CREATE INDEX IF NOT EXISTS idx_tariff_activities_created_at ON tariff_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tariff_activities_type ON tariff_activities(activity_type);

-- Enable RLS
ALTER TABLE tariff_activities ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view activities
CREATE POLICY "Users can view tariff activities"
  ON tariff_activities FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to create activities
CREATE POLICY "Users can create tariff activities"
  ON tariff_activities FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR is_system = true);

-- Add renewal CSP tracking to tariffs table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tariffs' AND column_name = 'renewal_csp_event_id'
  ) THEN
    ALTER TABLE tariffs ADD COLUMN renewal_csp_event_id uuid REFERENCES csp_events(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_tariffs_renewal_csp ON tariffs(renewal_csp_event_id);
  END IF;
END $$;

-- Add related tariff family to csp_events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'csp_events' AND column_name = 'related_tariff_family_id'
  ) THEN
    ALTER TABLE csp_events ADD COLUMN related_tariff_family_id uuid;
    CREATE INDEX IF NOT EXISTS idx_csp_events_related_family ON csp_events(related_tariff_family_id);
  END IF;
END $$;
