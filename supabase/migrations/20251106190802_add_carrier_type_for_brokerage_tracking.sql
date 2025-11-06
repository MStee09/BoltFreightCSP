/*
  # Add Carrier Type Classification

  1. Changes to `carriers` table
    - Add `carrier_type` column to classify carriers as 'brokerage' or 'customer_direct'
    - Default to 'customer_direct' for existing carriers
  
  2. Data Updates
    - Set Priority 1 as 'brokerage' (they are a known brokerage partner)
    - Set any carriers with "Rocket" in the name as 'brokerage'
  
  This enables tracking brokerage spend vs customer direct spend in strategy analysis.
*/

-- Add carrier_type column to carriers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'carriers' AND column_name = 'carrier_type'
  ) THEN
    ALTER TABLE carriers ADD COLUMN carrier_type text DEFAULT 'customer_direct';
  END IF;
END $$;

-- Add check constraint to ensure valid carrier types
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'carriers_type_check'
  ) THEN
    ALTER TABLE carriers 
    ADD CONSTRAINT carriers_type_check 
    CHECK (carrier_type IN ('brokerage', 'customer_direct'));
  END IF;
END $$;

-- Update known brokerage carriers
UPDATE carriers 
SET carrier_type = 'brokerage' 
WHERE name ILIKE '%priority 1%' 
   OR name ILIKE '%priority%1%'
   OR scac_code = 'POIP'
   OR name ILIKE '%rocket%';

-- Add comment for documentation
COMMENT ON COLUMN carriers.carrier_type IS 'Classification of carrier as brokerage partner or customer direct carrier. Used for spend analysis and growth tracking.';