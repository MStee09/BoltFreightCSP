/*
  # Drop Broken Trigger Function
  
  1. Problem
    - There are 3 overloaded versions of generate_tariff_reference_id
    - The no-parameter trigger version is broken (uses tariff_id_prefix)
    - Need to drop it specifically
  
  2. Solution
    - Drop the specific no-parameter version that returns trigger
    - Keep the working versions
  
  3. Security
    - No changes to RLS policies
*/

-- Drop the broken no-parameter trigger function
DROP FUNCTION IF EXISTS generate_tariff_reference_id() CASCADE;

-- Recreate the trigger pointing to the correct function
DROP TRIGGER IF EXISTS auto_generate_tariff_reference_id ON tariffs;
CREATE TRIGGER auto_generate_tariff_reference_id
  BEFORE INSERT ON tariffs
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_tariff_reference_id();
