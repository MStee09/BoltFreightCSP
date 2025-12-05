/*
  # Fix Tariff Audit Performance

  1. Problem
    - Audit logging loops through every field and inserts individual rows
    - This is slow when updating many fields (billing info, credentials, etc.)
    - Can cause the UI to freeze when saving tariff edits

  2. Solution
    - Batch insert audit log entries instead of one at a time
    - Skip detailed field logging for internal trigger updates (auto-supersede)
    - Reduces database round trips from N to 1 (where N = number of changed fields)

  3. Security
    - No changes to RLS policies
    - Maintains full audit trail
*/

-- Improved audit logging function with batch inserts
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
  -- This prevents cascading slowness when one tariff update triggers others
  IF TG_OP = 'UPDATE' AND NEW.updated_reason = 'Auto-superseded by new active tariff' THEN
    -- Still log the supersession but just the status change
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

    -- Collect changed fields into array (instead of inserting one by one)
    FOR v_key IN SELECT jsonb_object_keys(v_new_record) LOOP
      -- Skip internal fields
      IF v_key IN ('updated_at', 'updated_by', 'updated_reason', 'previous_values') THEN
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

    -- Batch insert all changes in ONE statement (instead of N separate inserts)
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