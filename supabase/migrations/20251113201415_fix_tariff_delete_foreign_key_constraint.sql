/*
  # Fix Tariff Deletion - Update Foreign Key Constraints
  
  1. Changes
    - Drop and recreate foreign key constraint on `csp_event_carriers.proposed_tariff_id`
    - Set to `ON DELETE SET NULL` so deleting a tariff clears the reference instead of blocking deletion
    - This allows users to delete proposed tariffs even if they're linked to CSP carrier assignments
  
  2. Security
    - No changes to RLS policies
    - Maintains data integrity while allowing tariff deletion
*/

-- Drop the existing foreign key constraint
ALTER TABLE csp_event_carriers 
DROP CONSTRAINT IF EXISTS csp_event_carriers_proposed_tariff_id_fkey;

-- Recreate with ON DELETE SET NULL
ALTER TABLE csp_event_carriers 
ADD CONSTRAINT csp_event_carriers_proposed_tariff_id_fkey 
FOREIGN KEY (proposed_tariff_id) 
REFERENCES tariffs(id) 
ON DELETE SET NULL;
