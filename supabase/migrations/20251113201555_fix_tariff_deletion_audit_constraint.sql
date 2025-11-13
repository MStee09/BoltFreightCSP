/*
  # Fix Tariff Deletion - Make Audit Log Independent
  
  1. Problem
    - The tariff_audit_log has a foreign key to tariffs with ON DELETE CASCADE
    - The audit trigger runs AFTER delete and tries to insert a log entry
    - But the tariff_id is already gone, causing the foreign key to fail
  
  2. Solution
    - Drop the foreign key constraint on tariff_audit_log.tariff_id
    - The audit log should preserve records even after tariffs are deleted
    - This maintains a complete historical audit trail
  
  3. Security
    - No changes to RLS policies
    - Improves audit trail by keeping deletion records
*/

-- Drop the foreign key constraint that's causing issues
ALTER TABLE tariff_audit_log 
DROP CONSTRAINT IF EXISTS tariff_audit_log_tariff_id_fkey;

-- The audit log no longer enforces referential integrity
-- This is intentional - we want to keep audit records even after tariff deletion
-- The tariff_id becomes a historical reference

-- Also restore the original trigger (both INSERT/UPDATE/DELETE after)
DROP TRIGGER IF EXISTS tariff_audit_delete_trigger ON tariffs;
DROP TRIGGER IF EXISTS tariff_audit_trigger ON tariffs;

CREATE TRIGGER tariff_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tariffs
  FOR EACH ROW
  EXECUTE FUNCTION log_tariff_change();
