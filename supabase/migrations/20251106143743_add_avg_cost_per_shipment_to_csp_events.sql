/*
  # Add average cost per shipment to CSP events

  1. Changes
    - Add `avg_cost_per_shipment` column to `csp_events` table to store the calculated average cost per shipment

  2. Notes
    - This helps track the unit economics of each CSP event
    - Used in conjunction with volume metrics for spend projections
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'csp_events' AND column_name = 'avg_cost_per_shipment'
  ) THEN
    ALTER TABLE csp_events ADD COLUMN avg_cost_per_shipment NUMERIC(10, 2) DEFAULT 0;
  END IF;
END $$;
