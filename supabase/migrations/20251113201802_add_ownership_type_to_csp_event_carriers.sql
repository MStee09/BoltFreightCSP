/*
  # Add Ownership Type to CSP Event Carrier Assignments
  
  1. Changes
    - Add `ownership_type` column to `csp_event_carriers` table
    - Values: 'rocket_csp', 'rocket_blanket', 'customer_direct', 'priority1_blanket'
    - Defaults to 'rocket_csp' for backward compatibility
    - This determines what type of tariff will be created if this carrier is awarded
  
  2. Security
    - No changes to RLS policies needed
    - Maintains existing access controls
*/

-- Add ownership_type column
ALTER TABLE csp_event_carriers 
ADD COLUMN IF NOT EXISTS ownership_type text DEFAULT 'rocket_csp';

-- Add check constraint for valid values
ALTER TABLE csp_event_carriers 
ADD CONSTRAINT csp_event_carriers_ownership_type_check 
CHECK (ownership_type IN ('rocket_csp', 'rocket_blanket', 'customer_direct', 'priority1_blanket'));

-- Add comment for documentation
COMMENT ON COLUMN csp_event_carriers.ownership_type IS 'Type of tariff ownership if carrier is awarded: rocket_csp, rocket_blanket, customer_direct, or priority1_blanket';
