/*
  # Add Monthly Shipments Field

  1. Changes
    - Add `monthly_shipments` column to `csp_events` table
    - This field stores calculated monthly shipment volume for bidirectional calculations

  2. Notes
    - Field is optional (nullable) as it can be derived from total_shipments / timeframe
    - Used for bidirectional calculations: enter monthly OR total, system calculates the other
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'csp_events' AND column_name = 'monthly_shipments'
  ) THEN
    ALTER TABLE csp_events ADD COLUMN monthly_shipments INTEGER;
  END IF;
END $$;
