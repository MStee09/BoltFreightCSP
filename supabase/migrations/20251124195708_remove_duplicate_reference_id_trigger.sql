/*
  # Remove Duplicate Reference ID Trigger
  
  1. Problem
    - Two triggers exist for generating tariff reference IDs
    - Old trigger `trg_auto_generate_tariff_reference_id` calls function that references wrong field name
    - Function tries to use `NEW.reference_id` but field is `NEW.tariff_reference_id`
  
  2. Solution
    - Drop the old duplicate trigger and its function
    - Keep only `trigger_auto_generate_tariff_reference_id` which works correctly
  
  3. Security
    - No changes to RLS policies
*/

-- Drop the old duplicate trigger
DROP TRIGGER IF EXISTS trg_auto_generate_tariff_reference_id ON tariffs;

-- Drop the old function that uses wrong field name
DROP FUNCTION IF EXISTS generate_tariff_reference_id() CASCADE;
