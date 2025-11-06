/*
  # Remove account_owner from customers and enforce CSP event ownership

  1. Changes to `customers` table
    - Remove `account_owner` field (no longer needed)
  
  2. Changes to `csp_events` table
    - Make `assigned_to` NOT NULL to enforce ownership requirement
    - Add check constraint to prevent empty string assignments
  
  3. Security
    - All existing RLS policies remain intact
    
  Note: This migration assumes all existing CSP events already have an assigned_to value.
  If there are any NULL values, they should be updated before running this migration.
*/

-- Remove account_owner from customers table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'account_owner'
  ) THEN
    ALTER TABLE customers DROP COLUMN account_owner;
  END IF;
END $$;

-- Ensure all CSP events have an assigned_to value before making it NOT NULL
-- Update any NULL or empty assigned_to values to a default (you may want to set this appropriately)
UPDATE csp_events 
SET assigned_to = 'unassigned@placeholder.com' 
WHERE assigned_to IS NULL OR assigned_to = '';

-- Make assigned_to NOT NULL for csp_events
DO $$
BEGIN
  -- Drop the NOT NULL constraint if it exists (to handle re-running migration)
  ALTER TABLE csp_events ALTER COLUMN assigned_to DROP NOT NULL;
EXCEPTION
  WHEN undefined_column THEN NULL;
END $$;

-- Now set it to NOT NULL
ALTER TABLE csp_events ALTER COLUMN assigned_to SET NOT NULL;

-- Add a check constraint to prevent empty strings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'csp_events_assigned_to_not_empty'
  ) THEN
    ALTER TABLE csp_events 
    ADD CONSTRAINT csp_events_assigned_to_not_empty 
    CHECK (assigned_to != '');
  END IF;
END $$;