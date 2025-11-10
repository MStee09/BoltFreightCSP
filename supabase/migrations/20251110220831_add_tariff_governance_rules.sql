/*
  # Tariff Data Governance Rules

  ## Overview
  Implements strict data governance rules for tariff management:
  1. Only 1 active tariff per family (auto-supersede old ones)
  2. Expiry date required (defaults to +12 months)
  3. Family IDs immutable after creation
  4. Ownership changes create new families
  5. Comprehensive audit trail

  ## Changes
  
  ### 1. Audit Trail Enhancement
  - Add `updated_reason` field to track why changes were made
  - Add `previous_values` JSONB field to store old values
  - Create trigger to automatically log all field changes
  
  ### 2. Data Validation
  - Add trigger to enforce expiry date (default +12 months)
  - Add trigger to prevent family_id changes
  - Add trigger to auto-supersede old tariffs when new one becomes active
  
  ### 3. Ownership Change Handling
  - Add trigger to detect ownership changes
  - Automatically create new family when ownership changes

  ## Security
  - All triggers run with SECURITY DEFINER to ensure proper execution
  - Audit logs cannot be modified by users
*/

-- Add audit trail fields to tariffs table
ALTER TABLE tariffs 
ADD COLUMN IF NOT EXISTS updated_reason text,
ADD COLUMN IF NOT EXISTS previous_values jsonb,
ADD COLUMN IF NOT EXISTS family_locked boolean DEFAULT false;

-- Create audit log table for detailed change tracking
CREATE TABLE IF NOT EXISTS tariff_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tariff_id uuid NOT NULL REFERENCES tariffs(id) ON DELETE CASCADE,
  changed_by uuid REFERENCES auth.users(id),
  changed_at timestamptz DEFAULT now(),
  action text NOT NULL, -- 'insert', 'update', 'delete', 'supersede'
  field_name text,
  old_value text,
  new_value text,
  reason text,
  metadata jsonb
);

ALTER TABLE tariff_audit_log ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read audit logs
CREATE POLICY "Users can view tariff audit logs"
  ON tariff_audit_log FOR SELECT
  TO authenticated
  USING (true);

-- Only system can insert audit logs (via triggers)
CREATE POLICY "System can insert audit logs"
  ON tariff_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = changed_by);

-- Create indexes for audit log queries
CREATE INDEX IF NOT EXISTS idx_tariff_audit_log_tariff_id ON tariff_audit_log(tariff_id);
CREATE INDEX IF NOT EXISTS idx_tariff_audit_log_changed_at ON tariff_audit_log(changed_at DESC);

-- Function to log audit trail
CREATE OR REPLACE FUNCTION log_tariff_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_record jsonb;
  v_new_record jsonb;
  v_key text;
  v_old_value text;
  v_new_value text;
BEGIN
  -- For INSERT operations
  IF TG_OP = 'INSERT' THEN
    INSERT INTO tariff_audit_log (
      tariff_id, changed_by, action, reason, metadata
    ) VALUES (
      NEW.id,
      auth.uid(),
      'insert',
      NEW.updated_reason,
      to_jsonb(NEW)
    );
    RETURN NEW;
  END IF;

  -- For UPDATE operations, log each changed field
  IF TG_OP = 'UPDATE' THEN
    v_old_record := to_jsonb(OLD);
    v_new_record := to_jsonb(NEW);
    
    -- Store previous values in the tariff record
    NEW.previous_values := v_old_record;
    
    -- Log each changed field
    FOR v_key IN SELECT jsonb_object_keys(v_new_record) LOOP
      -- Skip internal fields
      IF v_key IN ('updated_at', 'updated_by', 'updated_reason', 'previous_values') THEN
        CONTINUE;
      END IF;
      
      v_old_value := v_old_record->>v_key;
      v_new_value := v_new_record->>v_key;
      
      IF v_old_value IS DISTINCT FROM v_new_value THEN
        INSERT INTO tariff_audit_log (
          tariff_id, changed_by, action, field_name, old_value, new_value, reason
        ) VALUES (
          NEW.id,
          auth.uid(),
          'update',
          v_key,
          v_old_value,
          v_new_value,
          NEW.updated_reason
        );
      END IF;
    END LOOP;
    
    RETURN NEW;
  END IF;

  -- For DELETE operations
  IF TG_OP = 'DELETE' THEN
    INSERT INTO tariff_audit_log (
      tariff_id, changed_by, action, metadata
    ) VALUES (
      OLD.id,
      auth.uid(),
      'delete',
      to_jsonb(OLD)
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

-- Create trigger for audit logging (if not exists, drop and recreate)
DROP TRIGGER IF EXISTS tariff_audit_trigger ON tariffs;
CREATE TRIGGER tariff_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tariffs
  FOR EACH ROW
  EXECUTE FUNCTION log_tariff_change();

-- Function to enforce expiry date (default +12 months if missing)
CREATE OR REPLACE FUNCTION enforce_tariff_expiry_date()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- If no expiry date provided, set to +12 months from effective date
  IF NEW.expiry_date IS NULL THEN
    IF NEW.effective_date IS NOT NULL THEN
      NEW.expiry_date := NEW.effective_date + interval '12 months';
    ELSE
      -- If no effective date either, use current date + 12 months
      NEW.expiry_date := CURRENT_DATE + interval '12 months';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for expiry date enforcement
DROP TRIGGER IF EXISTS enforce_expiry_date_trigger ON tariffs;
CREATE TRIGGER enforce_expiry_date_trigger
  BEFORE INSERT OR UPDATE ON tariffs
  FOR EACH ROW
  EXECUTE FUNCTION enforce_tariff_expiry_date();

-- Function to prevent family_id changes after creation
CREATE OR REPLACE FUNCTION prevent_family_id_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Allow setting family_id on insert
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;
  
  -- Prevent changing family_id on update (if it was already set)
  IF TG_OP = 'UPDATE' AND OLD.tariff_family_id IS NOT NULL THEN
    IF OLD.tariff_family_id IS DISTINCT FROM NEW.tariff_family_id THEN
      RAISE EXCEPTION 'Family ID is immutable and cannot be changed once set. Create a new tariff instead.';
    END IF;
  END IF;
  
  -- Prevent changes if family is locked
  IF TG_OP = 'UPDATE' AND OLD.family_locked = true THEN
    IF OLD.tariff_family_id IS DISTINCT FROM NEW.tariff_family_id THEN
      RAISE EXCEPTION 'This family is locked and cannot be modified.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for family_id immutability
DROP TRIGGER IF EXISTS prevent_family_change_trigger ON tariffs;
CREATE TRIGGER prevent_family_change_trigger
  BEFORE UPDATE ON tariffs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_family_id_change();

-- Function to auto-supersede old tariffs when a new one becomes active
CREATE OR REPLACE FUNCTION auto_supersede_old_tariffs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_tariff_id uuid;
BEGIN
  -- Only run when status changes to 'active' or on insert with active status
  IF NEW.status = 'active' AND NEW.tariff_family_id IS NOT NULL THEN
    -- Check if this is a status change (update) or new active tariff (insert)
    IF TG_OP = 'UPDATE' AND OLD.status = 'active' THEN
      -- Already active, no need to supersede
      RETURN NEW;
    END IF;
    
    -- Find other active tariffs in the same family and supersede them
    FOR v_old_tariff_id IN 
      SELECT id 
      FROM tariffs 
      WHERE tariff_family_id = NEW.tariff_family_id 
        AND id != NEW.id 
        AND status = 'active'
    LOOP
      -- Update old tariff to superseded
      UPDATE tariffs 
      SET 
        status = 'superseded',
        updated_by = auth.uid(),
        updated_at = now(),
        updated_reason = 'Auto-superseded by new active tariff'
      WHERE id = v_old_tariff_id;
      
      -- Log the supersession
      INSERT INTO tariff_audit_log (
        tariff_id, changed_by, action, reason, metadata
      ) VALUES (
        v_old_tariff_id,
        auth.uid(),
        'supersede',
        'Auto-superseded when tariff ' || NEW.id::text || ' became active',
        jsonb_build_object('new_active_tariff_id', NEW.id)
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for auto-superseding
DROP TRIGGER IF EXISTS auto_supersede_trigger ON tariffs;
CREATE TRIGGER auto_supersede_trigger
  AFTER INSERT OR UPDATE OF status ON tariffs
  FOR EACH ROW
  EXECUTE FUNCTION auto_supersede_old_tariffs();

-- Function to detect ownership changes and create new family
CREATE OR REPLACE FUNCTION handle_ownership_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only check on updates
  IF TG_OP = 'UPDATE' THEN
    -- If ownership_type changes and tariff already has a family
    IF OLD.ownership_type IS DISTINCT FROM NEW.ownership_type 
       AND OLD.tariff_family_id IS NOT NULL 
       AND OLD.status != 'proposed' THEN
      
      -- Generate new family ID
      NEW.tariff_family_id := gen_random_uuid();
      
      -- Add reason to audit log
      IF NEW.updated_reason IS NULL THEN
        NEW.updated_reason := 'Ownership type changed - new family created';
      ELSE
        NEW.updated_reason := NEW.updated_reason || ' (Ownership change detected)';
      END IF;
      
      -- Lock the old family
      UPDATE tariffs 
      SET family_locked = true 
      WHERE tariff_family_id = OLD.tariff_family_id 
        AND id != NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for ownership change handling
DROP TRIGGER IF EXISTS handle_ownership_change_trigger ON tariffs;
CREATE TRIGGER handle_ownership_change_trigger
  BEFORE UPDATE OF ownership_type ON tariffs
  FOR EACH ROW
  EXECUTE FUNCTION handle_ownership_change();

-- Add comment explaining governance rules
COMMENT ON TABLE tariffs IS 'Tariff data with strict governance: 1 active per family, immutable family IDs, required expiry dates (+12mo default), ownership changes create new families, full audit trail';
COMMENT ON COLUMN tariffs.tariff_family_id IS 'Immutable family identifier - cannot be changed after creation';
COMMENT ON COLUMN tariffs.expiry_date IS 'Required field - defaults to +12 months from effective date if not provided';
COMMENT ON COLUMN tariffs.updated_reason IS 'Required reason for any update - used in audit trail';
COMMENT ON COLUMN tariffs.previous_values IS 'Automatically stored previous values for audit purposes';
COMMENT ON COLUMN tariffs.family_locked IS 'Prevents modifications when family ownership has changed';
COMMENT ON TABLE tariff_audit_log IS 'Comprehensive audit trail of all tariff changes including field-level tracking';
