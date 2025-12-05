/*
  # Update rocket_csp_subtype constraint to allow Priority values

  1. Changes
    - Drop existing check constraint on rocket_csp_subtype
    - Add new check constraint that includes Priority 1, Priority 2, Priority 3 values
  
  2. Security
    - No RLS changes needed
*/

-- Drop the old constraint
ALTER TABLE tariffs 
DROP CONSTRAINT IF EXISTS tariffs_rocket_csp_subtype_check;

-- Add new constraint with Priority values
ALTER TABLE tariffs 
ADD CONSTRAINT tariffs_rocket_csp_subtype_check 
CHECK (rocket_csp_subtype IN ('rocket_owned', 'blanket', 'care_of', 'Priority 1', 'Priority 2', 'Priority 3'));

-- Update comment for documentation
COMMENT ON COLUMN tariffs.rocket_csp_subtype IS 
'Subtype for Rocket CSP ownership: rocket_owned (Rocket negotiated), blanket (multi-customer), care_of (customer-owned with Rocket margin), Priority 1/2/3 (priority carrier programs)';
