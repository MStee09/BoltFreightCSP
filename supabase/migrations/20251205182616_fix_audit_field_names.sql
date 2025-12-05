/*
  # Fix Audit Trigger Field Names

  1. Problem
    - Trigger references `updated_at` but the actual column is `updated_date`
    - This causes "record new has no field updated_at" error
    - The auto_supersede trigger also has the same issue

  2. Solution
    - Update all triggers to use correct field name: `updated_date`
    - Fix both the audit logging trigger and the auto-supersede trigger

  3. Security
    - No changes to RLS policies
*/

-- Fix the audit logging function to use correct field names
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
  v_changes jsonb[] := ARRAY[]::jsonb[];
BEGIN
  -- Skip detailed field logging if this is an internal trigger update (auto-supersede)
  IF TG_OP = 'UPDATE' AND NEW.updated_reason = 'Auto-superseded by new active tariff' THEN
    INSERT INTO tariff_audit_log (
      tariff_id, changed_by, action, reason, field_name, old_value, new_value
    ) VALUES (
      NEW.id,
      auth.uid(),
      'supersede',
      NEW.updated_reason,
      'status',
      OLD.status,
      NEW.status
    );
    RETURN NEW;
  END IF;

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

  -- For UPDATE operations, batch collect changes
  IF TG_OP = 'UPDATE' THEN
    v_old_record := to_jsonb(OLD);
    v_new_record := to_jsonb(NEW);

    -- Store previous values in the tariff record
    NEW.previous_values := v_old_record;

    -- Collect changed fields into array (using correct field name: updated_date)
    FOR v_key IN SELECT jsonb_object_keys(v_new_record) LOOP
      -- Skip internal fields (note: updated_date not updated_at)
      IF v_key IN ('updated_date', 'updated_by', 'updated_reason', 'previous_values', 'created_date', 'created_by') THEN
        CONTINUE;
      END IF;

      v_old_value := v_old_record->>v_key;
      v_new_value := v_new_record->>v_key;

      IF v_old_value IS DISTINCT FROM v_new_value THEN
        v_changes := array_append(v_changes, jsonb_build_object(
          'field', v_key,
          'old', v_old_value,
          'new', v_new_value
        ));
      END IF;
    END LOOP;

    -- Batch insert all changes in ONE statement
    IF array_length(v_changes, 1) > 0 THEN
      INSERT INTO tariff_audit_log (
        tariff_id, changed_by, action, field_name, old_value, new_value, reason
      )
      SELECT
        NEW.id,
        auth.uid(),
        'update',
        change->>'field',
        change->>'old',
        change->>'new',
        NEW.updated_reason
      FROM unnest(v_changes) AS change;
    END IF;

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

-- Fix the auto-supersede trigger to use correct field names
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
      -- Update old tariff to superseded (using correct field name: updated_date)
      UPDATE tariffs 
      SET 
        status = 'superseded',
        updated_by = auth.uid(),
        updated_date = now(),
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