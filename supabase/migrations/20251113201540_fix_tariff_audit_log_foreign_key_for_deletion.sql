/*
  # Fix Tariff Audit Log Foreign Key for Deletion
  
  1. Problem
    - When deleting a tariff, the audit trigger tries to log the deletion
    - But the CASCADE foreign key deletes audit log entries before the trigger runs
    - This causes the trigger to fail when inserting the deletion log
  
  2. Solution
    - Change the trigger to BEFORE DELETE instead of AFTER DELETE
    - This way the audit log entry is created before the tariff is deleted
    - The CASCADE will still clean up old audit entries, but the deletion entry survives
  
  3. Security
    - No changes to RLS policies
    - Maintains complete audit trail including deletions
*/

-- Drop the existing trigger
DROP TRIGGER IF EXISTS tariff_audit_trigger ON tariffs;

-- Recreate with BEFORE DELETE instead of AFTER DELETE for delete operations
-- Keep AFTER for INSERT and UPDATE to capture final state
CREATE TRIGGER tariff_audit_trigger
  AFTER INSERT OR UPDATE ON tariffs
  FOR EACH ROW
  EXECUTE FUNCTION log_tariff_change();

-- Add separate BEFORE DELETE trigger to log deletions before they happen
CREATE TRIGGER tariff_audit_delete_trigger
  BEFORE DELETE ON tariffs
  FOR EACH ROW
  EXECUTE FUNCTION log_tariff_change();
