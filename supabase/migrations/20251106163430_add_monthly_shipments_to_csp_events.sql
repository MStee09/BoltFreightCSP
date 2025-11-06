/*
  # Add monthly_shipments column to csp_events

  1. Changes
    - Add `monthly_shipments` column to `csp_events` table
    - This field stores the calculated monthly shipment volume based on the data timeframe
    - Used for carrier qualification and spend projections

  2. Notes
    - This field is typically calculated from total_shipments / data_timeframe_months
    - Can also be manually entered by users
*/

-- Add monthly_shipments column to csp_events table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'csp_events' AND column_name = 'monthly_shipments'
  ) THEN
    ALTER TABLE csp_events ADD COLUMN monthly_shipments INTEGER;
  END IF;
END $$;

-- Update existing records where we have total_shipments and data_timeframe_months
UPDATE csp_events
SET monthly_shipments = CASE 
  WHEN data_timeframe_months > 0 THEN ROUND(total_shipments::numeric / data_timeframe_months)::integer
  ELSE NULL
END
WHERE total_shipments IS NOT NULL 
  AND data_timeframe_months IS NOT NULL 
  AND monthly_shipments IS NULL;
