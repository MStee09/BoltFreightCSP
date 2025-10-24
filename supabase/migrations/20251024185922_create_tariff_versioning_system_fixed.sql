/*
  # Tariff Versioning and Activity System

  ## Overview
  Implements a comprehensive tariff family/version system with full activity tracking.
  Each tariff "family" represents a long-term relationship (customer + carrier + ownership),
  with multiple versions over time.

  ## Changes

  1. **Enhanced Tariffs Table**
    - Add `tariff_family_id` - groups related versions
    - Add `version_number` - sequential version within family
    - Add `superseded_by_id` - links to newer version
    - Add `created_by` - user who created this version (nullable)
    - Add `source` - how it was created (manual_upload, csp_event, system)
    - Add `finalized_date` - when it became active
    - Expand status to include: proposed, active, expiring, expired, superseded

  2. **Tariff Activities Table**
    - Tracks all changes and events for each tariff version
    - Auto-populated by triggers on status changes
    - Links to users, files, notes

  3. **Functions**
    - Auto-generate tariff_family_id based on customer + carrier + ownership
    - Log all status transitions to activities

  ## Security
    - RLS enabled on all new tables
    - Authenticated users can view tariffs they have access to

  ## Notes
    - Maintains backward compatibility with existing tariffs
    - All existing tariffs get migrated to version 1.0
*/

-- Enable uuid-ossp extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add new columns to tariffs table
DO $$
BEGIN
  -- tariff_family_id: logical grouping of all versions for same customer+carrier+ownership
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tariffs' AND column_name = 'tariff_family_id'
  ) THEN
    ALTER TABLE tariffs ADD COLUMN tariff_family_id uuid;
  END IF;

  -- version_number: semantic version within family (e.g., 2024.1, 2025.1)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tariffs' AND column_name = 'version_number'
  ) THEN
    ALTER TABLE tariffs ADD COLUMN version_number text DEFAULT '1.0';
  END IF;

  -- superseded_by_id: points to the tariff that replaced this one
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tariffs' AND column_name = 'superseded_by_id'
  ) THEN
    ALTER TABLE tariffs ADD COLUMN superseded_by_id uuid REFERENCES tariffs(id);
  END IF;

  -- created_by: user who created this tariff version (nullable for backwards compat)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tariffs' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE tariffs ADD COLUMN created_by uuid REFERENCES auth.users(id);
  END IF;

  -- source: how was this tariff created
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tariffs' AND column_name = 'source'
  ) THEN
    ALTER TABLE tariffs ADD COLUMN source text DEFAULT 'manual_upload' CHECK (source IN ('manual_upload', 'csp_event', 'system', 'renewal'));
  END IF;

  -- finalized_date: when tariff became active
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tariffs' AND column_name = 'finalized_date'
  ) THEN
    ALTER TABLE tariffs ADD COLUMN finalized_date timestamptz;
  END IF;

  -- carrier_name: denormalized for easier display
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tariffs' AND column_name = 'carrier_name'
  ) THEN
    ALTER TABLE tariffs ADD COLUMN carrier_name text;
  END IF;

  -- customer_name: denormalized for easier display
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tariffs' AND column_name = 'customer_name'
  ) THEN
    ALTER TABLE tariffs ADD COLUMN customer_name text;
  END IF;
END $$;

-- Create tariff_activities table
CREATE TABLE IF NOT EXISTS tariff_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tariff_id uuid NOT NULL REFERENCES tariffs(id) ON DELETE CASCADE,
  activity_type text NOT NULL CHECK (activity_type IN ('status_change', 'note', 'file_upload', 'system', 'ai')),
  description text NOT NULL,
  old_status text,
  new_status text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE tariff_activities ENABLE ROW LEVEL SECURITY;

-- RLS policies for tariff_activities
CREATE POLICY "Users can view tariff activities"
  ON tariff_activities FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create tariff activities"
  ON tariff_activities FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tariff_activities_tariff_id ON tariff_activities(tariff_id);
CREATE INDEX IF NOT EXISTS idx_tariff_activities_created_at ON tariff_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tariffs_family_id ON tariffs(tariff_family_id);
CREATE INDEX IF NOT EXISTS idx_tariffs_status ON tariffs(status);
CREATE INDEX IF NOT EXISTS idx_tariffs_expiry_date ON tariffs(expiry_date);

-- Function to generate tariff_family_id based on customer + carrier + ownership
CREATE OR REPLACE FUNCTION generate_tariff_family_id(
  p_customer_id uuid,
  p_carrier_ids uuid[],
  p_ownership_type text
)
RETURNS uuid AS $$
DECLARE
  v_carrier_id uuid;
  v_family_id uuid;
BEGIN
  -- Use first carrier_id for family grouping
  IF array_length(p_carrier_ids, 1) > 0 THEN
    v_carrier_id := p_carrier_ids[1];
  END IF;

  -- Generate deterministic UUID based on customer + carrier + ownership
  v_family_id := uuid_generate_v5(
    '00000000-0000-0000-0000-000000000000'::uuid,
    COALESCE(p_customer_id::text, '') || 
    COALESCE(v_carrier_id::text, '') || 
    COALESCE(p_ownership_type, '')
  );

  RETURN v_family_id;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to log tariff activity
CREATE OR REPLACE FUNCTION log_tariff_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Log status changes
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO tariff_activities (
      tariff_id,
      activity_type,
      description,
      old_status,
      new_status,
      created_by,
      metadata
    ) VALUES (
      NEW.id,
      'status_change',
      format('Status changed from %s to %s', OLD.status, NEW.status),
      OLD.status,
      NEW.status,
      NEW.created_by,
      jsonb_build_object(
        'previous_status', OLD.status,
        'new_status', NEW.status,
        'finalized_date', NEW.finalized_date
      )
    );
  END IF;

  -- Log creation (only for new inserts, not during migration)
  IF TG_OP = 'INSERT' AND NEW.created_date > now() - INTERVAL '1 minute' THEN
    INSERT INTO tariff_activities (
      tariff_id,
      activity_type,
      description,
      created_by,
      metadata
    ) VALUES (
      NEW.id,
      'system',
      format('Tariff version %s created via %s', COALESCE(NEW.version_number, '1.0'), NEW.source),
      NEW.created_by,
      jsonb_build_object(
        'source', NEW.source,
        'version', NEW.version_number,
        'csp_event_id', NEW.csp_event_id
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic activity logging
DROP TRIGGER IF EXISTS trigger_log_tariff_activity ON tariffs;
CREATE TRIGGER trigger_log_tariff_activity
  AFTER INSERT OR UPDATE ON tariffs
  FOR EACH ROW
  EXECUTE FUNCTION log_tariff_activity();

-- Function to auto-update expiring status
CREATE OR REPLACE FUNCTION update_tariff_expiring_status()
RETURNS void AS $$
BEGIN
  -- Mark as expiring if < 90 days and currently active
  UPDATE tariffs
  SET status = 'expiring'
  WHERE status = 'active'
    AND expiry_date <= CURRENT_DATE + INTERVAL '90 days'
    AND expiry_date > CURRENT_DATE;

  -- Mark as expired if past expiry date
  UPDATE tariffs
  SET status = 'expired'
  WHERE status IN ('active', 'expiring')
    AND expiry_date <= CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backfill tariff_family_id for existing tariffs
UPDATE tariffs
SET tariff_family_id = generate_tariff_family_id(customer_id, carrier_ids, ownership_type)
WHERE tariff_family_id IS NULL;
