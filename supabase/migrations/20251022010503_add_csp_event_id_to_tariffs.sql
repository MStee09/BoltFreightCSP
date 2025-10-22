/*
  # Add CSP Event Link to Tariffs

  1. Changes
    - Add `csp_event_id` column to tariffs table to link tariffs with the RFP/CSP event that generated them
    - Add foreign key constraint to ensure referential integrity

  2. Purpose
    - Enable cross-linking between tariffs and the CSP events that generated them
    - Allow users to view the related RFP from a tariff detail page
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tariffs' AND column_name = 'csp_event_id'
  ) THEN
    ALTER TABLE tariffs ADD COLUMN csp_event_id uuid REFERENCES csp_events(id) ON DELETE SET NULL;
  END IF;
END $$;