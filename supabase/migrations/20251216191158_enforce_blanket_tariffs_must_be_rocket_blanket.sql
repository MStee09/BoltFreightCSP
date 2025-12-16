/*
  # Enforce Blanket Tariffs Must Be Rocket Blanket Ownership Type
  
  1. Problem
    - Blanket tariffs are being created with ownership_type = 'rocket_csp' and rocket_csp_subtype = 'blanket'
    - This is incorrect: ALL blanket tariffs assigned to Rocket should use ownership_type = 'rocket_blanket'
    - There should be no such thing as a blanket tariff under rocket_csp ownership
  
  2. Solution
    - Fix existing data: Convert any rocket_csp blankets to rocket_blanket
    - Add check constraint: Prevent is_blanket_tariff = true with ownership_type = 'rocket_csp'
    - Blanket tariffs can ONLY have ownership_type = 'rocket_blanket' (never rocket_csp)
  
  3. Examples (CORRECT)
    - BLK-ROCKET-FEDEX-2025-001 → ownership_type = 'rocket_blanket', is_blanket_tariff = true
  
  4. Examples (INCORRECT - Now Prevented)
    - ownership_type = 'rocket_csp', rocket_csp_subtype = 'blanket', is_blanket_tariff = true ❌
  
  5. Security
    - No RLS changes needed
*/

-- Step 1: Fix existing data - convert rocket_csp blankets to rocket_blanket
UPDATE tariffs
SET 
  ownership_type = 'rocket_blanket',
  rocket_csp_subtype = NULL
WHERE 
  is_blanket_tariff = true 
  AND ownership_type = 'rocket_csp'
  AND rocket_csp_subtype = 'blanket';

-- Step 2: Add check constraint to prevent blanket tariffs from being rocket_csp
ALTER TABLE tariffs
DROP CONSTRAINT IF EXISTS tariffs_blanket_ownership_check;

ALTER TABLE tariffs
ADD CONSTRAINT tariffs_blanket_ownership_check
CHECK (
  -- If it's a blanket tariff, it MUST be rocket_blanket (never rocket_csp)
  (is_blanket_tariff = true AND ownership_type = 'rocket_blanket')
  OR
  -- If it's NOT a blanket tariff, it can be any ownership type
  (is_blanket_tariff = false OR is_blanket_tariff IS NULL)
);

-- Step 3: Update rocket_csp_subtype constraint to remove 'blanket' option
ALTER TABLE tariffs
DROP CONSTRAINT IF EXISTS tariffs_rocket_csp_subtype_check;

ALTER TABLE tariffs
ADD CONSTRAINT tariffs_rocket_csp_subtype_check
CHECK (
  rocket_csp_subtype IS NULL 
  OR rocket_csp_subtype IN (
    'rocket_owned',
    'care_of',
    'Priority 1',
    'Priority 2', 
    'Priority 3'
  )
);

COMMENT ON CONSTRAINT tariffs_blanket_ownership_check ON tariffs IS 
  'Blanket tariffs must use ownership_type = rocket_blanket, never rocket_csp';
