/*
  # Enhance CSP Event Carriers for Award Process

  1. Schema Changes
    - Add expanded status enum for full carrier lifecycle
    - Add workflow timestamps (submitted_at, awarded_at)
    - Add bid_docs jsonb array for file metadata
    - Add lane_scope_json for partial award details
    - Add proposed_tariff_id link to created tariffs
    - Add awarded_by user tracking

  2. Status Flow
    - invited → submitted → under_review → revision_requested → awarded/not_awarded/withdrawn/declined

  3. Indexes
    - Add index on status for filtering
    - Add index on proposed_tariff_id for lookups

  4. Notes
    - Maintains backward compatibility with existing 'invited' status
    - Existing rows will have status = 'invited' by default
*/

-- Drop the old status check if it exists (for safety)
DO $$
BEGIN
  ALTER TABLE csp_event_carriers DROP CONSTRAINT IF EXISTS csp_event_carriers_status_check;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Add new columns
ALTER TABLE csp_event_carriers
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS awarded_at timestamptz,
  ADD COLUMN IF NOT EXISTS awarded_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS bid_docs jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS lane_scope_json jsonb,
  ADD COLUMN IF NOT EXISTS proposed_tariff_id uuid REFERENCES tariffs(id);

-- Update status column to use new enum values
-- First, ensure existing data is compatible
UPDATE csp_event_carriers
SET status = 'invited'
WHERE status IS NULL OR status = '';

-- Add constraint for valid status values
ALTER TABLE csp_event_carriers
  ADD CONSTRAINT csp_event_carriers_status_check
  CHECK (status IN (
    'invited',
    'submitted',
    'under_review',
    'revision_requested',
    'awarded',
    'not_awarded',
    'withdrawn',
    'declined'
  ));

-- Rename invited_date to invited_at for consistency
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'csp_event_carriers'
    AND column_name = 'invited_date'
  ) THEN
    ALTER TABLE csp_event_carriers RENAME COLUMN invited_date TO invited_at;
  END IF;
EXCEPTION
  WHEN undefined_column THEN NULL;
END $$;

-- Rename response_date to submitted_at if it exists and submitted_at doesn't
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'csp_event_carriers'
    AND column_name = 'response_date'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'csp_event_carriers'
    AND column_name = 'submitted_at'
  ) THEN
    ALTER TABLE csp_event_carriers RENAME COLUMN response_date TO submitted_at;
  END IF;
EXCEPTION
  WHEN undefined_column THEN NULL;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_csp_event_carriers_status
  ON csp_event_carriers(status);

CREATE INDEX IF NOT EXISTS idx_csp_event_carriers_proposed_tariff
  ON csp_event_carriers(proposed_tariff_id)
  WHERE proposed_tariff_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_csp_event_carriers_awarded_by
  ON csp_event_carriers(awarded_by)
  WHERE awarded_by IS NOT NULL;

-- Add comment for documentation
COMMENT ON TABLE csp_event_carriers IS 'Tracks carrier participation in CSP events from invitation through award. One row per carrier per CSP event.';
COMMENT ON COLUMN csp_event_carriers.status IS 'Carrier status: invited→submitted→under_review→revision_requested→awarded/not_awarded/withdrawn/declined';
COMMENT ON COLUMN csp_event_carriers.bid_docs IS 'Array of bid document metadata: [{file_name, file_path, uploaded_at, uploaded_by}]';
COMMENT ON COLUMN csp_event_carriers.lane_scope_json IS 'Partial award details: {lanes[], partial_award, included_regions[], excluded_regions[], notes}';
COMMENT ON COLUMN csp_event_carriers.proposed_tariff_id IS 'Links to the proposed tariff created when this carrier is awarded';
