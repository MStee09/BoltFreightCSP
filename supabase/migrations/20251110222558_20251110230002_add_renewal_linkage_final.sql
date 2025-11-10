/*
  # Add Renewal CSP Linkage - Final Version

  1. Schema Changes
    - Add `renewal_csp_event_id` to tariffs table
    - Add `related_tariff_family_id` to csp_events table
    - Add new fields to existing tariff_activities table

  2. Indexes
    - Add foreign key indexes for performance
*/

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

-- Add new fields to existing tariff_activities table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tariff_activities' AND column_name = 'tariff_family_id'
  ) THEN
    ALTER TABLE tariff_activities ADD COLUMN tariff_family_id uuid;
    CREATE INDEX IF NOT EXISTS idx_tariff_activities_family_id ON tariff_activities(tariff_family_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tariff_activities' AND column_name = 'csp_event_id'
  ) THEN
    ALTER TABLE tariff_activities ADD COLUMN csp_event_id uuid REFERENCES csp_events(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_tariff_activities_csp_event_id ON tariff_activities(csp_event_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tariff_activities' AND column_name = 'title'
  ) THEN
    ALTER TABLE tariff_activities ADD COLUMN title text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tariff_activities' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE tariff_activities ADD COLUMN user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tariff_activities' AND column_name = 'user_name'
  ) THEN
    ALTER TABLE tariff_activities ADD COLUMN user_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tariff_activities' AND column_name = 'is_system'
  ) THEN
    ALTER TABLE tariff_activities ADD COLUMN is_system boolean DEFAULT false;
  END IF;
END $$;

-- Update activity_type constraint to include new types
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tariff_activities_activity_type_check'
  ) THEN
    ALTER TABLE tariff_activities DROP CONSTRAINT tariff_activities_activity_type_check;
  END IF;

  -- Add updated constraint
  ALTER TABLE tariff_activities ADD CONSTRAINT tariff_activities_activity_type_check
  CHECK (activity_type IN (
    'status_change',
    'system',
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
  ));
END $$;
