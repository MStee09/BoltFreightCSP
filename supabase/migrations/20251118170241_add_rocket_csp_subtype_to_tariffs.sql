/*
  # Add Rocket CSP Subtype Field to Tariffs

  1. Changes
    - Add `rocket_csp_subtype` field to tariffs table to distinguish between:
      - 'rocket_owned': Rocket negotiated and owns the tariff
      - 'blanket': Blanket tariff that can be assigned to multiple customers
      - 'care_of': Customer-owned but Rocket holds it and adds margin (C/O)
    - Only applies when ownership_type is 'Rocket CSP'
  
  2. Notes
    - This provides better classification for Rocket CSP tariffs
    - Helps track different business models and margin structures
*/

-- Add rocket_csp_subtype column
ALTER TABLE tariffs 
ADD COLUMN IF NOT EXISTS rocket_csp_subtype TEXT 
CHECK (rocket_csp_subtype IN ('rocket_owned', 'blanket', 'care_of'));

-- Add comment for documentation
COMMENT ON COLUMN tariffs.rocket_csp_subtype IS 
'Subtype for Rocket CSP ownership: rocket_owned (Rocket negotiated), blanket (multi-customer), care_of (customer-owned with Rocket margin)';
