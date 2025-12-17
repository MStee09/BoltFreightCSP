/*
  # Fix Carrier Activity Trigger Column Names

  1. Problem
    - The log_carrier_activity trigger was referencing OLD.on_time_percentage
    - But the carriers table column is actually named on_time_pct
    - This caused carrier updates to fail with error "record 'old' has no field 'on_time_percentage'"

  2. Solution
    - Update the trigger function to reference the correct column name: on_time_pct

  3. Security
    - No changes to RLS policies
*/

-- Fix the log_carrier_activity function to use correct column name
CREATE OR REPLACE FUNCTION log_carrier_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  change_details TEXT[];
  change_summary TEXT;
  user_name_val TEXT;
BEGIN
  change_details := ARRAY[]::TEXT[];

  -- Get user name
  SELECT COALESCE(full_name, email)
  INTO user_name_val
  FROM user_profiles
  WHERE id = auth.uid();

  -- Track name changes
  IF OLD.name IS DISTINCT FROM NEW.name THEN
    change_details := array_append(change_details, 'Name: "' || COALESCE(OLD.name, '') || '" → "' || COALESCE(NEW.name, '') || '"');
  END IF;

  -- Track SCAC code changes
  IF OLD.scac_code IS DISTINCT FROM NEW.scac_code THEN
    change_details := array_append(change_details, 'SCAC Code: "' || COALESCE(OLD.scac_code, '') || '" → "' || COALESCE(NEW.scac_code, '') || '"');
  END IF;

  -- Track service type changes
  IF OLD.service_type IS DISTINCT FROM NEW.service_type THEN
    change_details := array_append(change_details, 'Service Type: "' || COALESCE(OLD.service_type, '') || '" → "' || COALESCE(NEW.service_type, '') || '"');
  END IF;

  -- Track carrier rep changes
  IF OLD.carrier_rep_name IS DISTINCT FROM NEW.carrier_rep_name OR
     OLD.carrier_rep_email IS DISTINCT FROM NEW.carrier_rep_email OR
     OLD.carrier_rep_phone IS DISTINCT FROM NEW.carrier_rep_phone THEN
    change_details := array_append(change_details, 'Carrier representative updated');
  END IF;

  -- Track performance metrics changes (use correct column name: on_time_pct)
  IF OLD.on_time_pct IS DISTINCT FROM NEW.on_time_pct THEN
    change_details := array_append(change_details, 'On-time: ' || COALESCE(OLD.on_time_pct::TEXT, '0') || '% → ' || COALESCE(NEW.on_time_pct::TEXT, '0') || '%');
  END IF;

  IF array_length(change_details, 1) > 0 THEN
    INSERT INTO interactions (
      entity_type,
      entity_id,
      interaction_type,
      title,
      description,
      metadata,
      user_id,
      user_name
    ) VALUES (
      'carrier',
      NEW.id,
      'carrier_updated',
      'Carrier Updated',
      array_to_string(change_details, E'\n'),
      jsonb_build_object(
        'changes', change_details,
        'updated_by', auth.uid()
      ),
      auth.uid(),
      user_name_val
    );
  END IF;

  RETURN NEW;
END;
$$;
