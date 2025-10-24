/*
  # Add Alert Resolution Tracking

  1. Changes to `alerts` table
    - Add `resolved_by` field to track who resolved the alert
    - Add `resolution_notes` field for resolution context
    - Add `last_seen_at` field to track when alert was last viewed
    - Add `action_taken` field to track what action resolved it
  
  2. Updates
    - Update default status to 'active' instead of 'pending'
    - Add check constraint for valid statuses
  
  3. Security
    - Maintain existing RLS policies
*/

-- Add new columns to alerts table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'alerts' AND column_name = 'resolved_by'
  ) THEN
    ALTER TABLE alerts ADD COLUMN resolved_by uuid REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'alerts' AND column_name = 'resolution_notes'
  ) THEN
    ALTER TABLE alerts ADD COLUMN resolution_notes text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'alerts' AND column_name = 'last_seen_at'
  ) THEN
    ALTER TABLE alerts ADD COLUMN last_seen_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'alerts' AND column_name = 'action_taken'
  ) THEN
    ALTER TABLE alerts ADD COLUMN action_taken text;
  END IF;
END $$;

-- Update existing null statuses to 'active'
UPDATE alerts 
SET status = 'active' 
WHERE status IS NULL OR status = 'pending';

-- Add check constraint for valid statuses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'alerts_status_check'
  ) THEN
    ALTER TABLE alerts 
    ADD CONSTRAINT alerts_status_check 
    CHECK (status IN ('active', 'acknowledged', 'resolved', 'dismissed'));
  END IF;
END $$;

-- Set default status to 'active'
ALTER TABLE alerts ALTER COLUMN status SET DEFAULT 'active';

-- Create index for faster queries on active alerts
CREATE INDEX IF NOT EXISTS idx_alerts_status_created 
ON alerts(status, created_date DESC) 
WHERE status IN ('active', 'acknowledged');

-- Create index for assigned alerts
CREATE INDEX IF NOT EXISTS idx_alerts_assigned_status 
ON alerts(assigned_to, status) 
WHERE status IN ('active', 'acknowledged');
