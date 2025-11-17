/*
  # Fix family_id trigger error
  
  1. Problem
    - prevent_family_id_change() references OLD.family_id but column doesn't exist
    - Need to either add the column or drop the trigger
  
  2. Solution
    - Drop the broken trigger since family_id isn't being used yet
    - If needed in future, can be re-added with proper column
  
  3. Security
    - No RLS changes needed
*/

-- Drop the broken trigger
DROP TRIGGER IF EXISTS prevent_family_change_trigger ON tariffs;

-- Drop the function since it references non-existent column
DROP FUNCTION IF EXISTS prevent_family_id_change();
