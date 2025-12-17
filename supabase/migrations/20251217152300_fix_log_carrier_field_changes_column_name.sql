/*
  # Fix log_carrier_field_changes Function Column Name

  1. Problem
    - The log_carrier_field_changes() function was referencing on_time_percentage
    - But the carriers table column is actually named on_time_pct
    - This caused carrier updates to fail

  2. Solution
    - Update the function to use the correct column name: on_time_pct

  3. Security
    - No changes to RLS policies
*/

CREATE OR REPLACE FUNCTION public.log_carrier_field_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
change_details TEXT[];
user_id_val uuid;
BEGIN
user_id_val := auth.uid();
change_details := ARRAY[]::TEXT[];

IF OLD.name IS DISTINCT FROM NEW.name THEN
change_details := array_append(change_details, 'Name: "' || COALESCE(OLD.name, '') || '" → "' || COALESCE(NEW.name, '') || '"');
END IF;

IF OLD.scac_code IS DISTINCT FROM NEW.scac_code THEN
change_details := array_append(change_details, 'SCAC: "' || COALESCE(OLD.scac_code, '') || '" → "' || COALESCE(NEW.scac_code, '') || '"');
END IF;

IF OLD.status IS DISTINCT FROM NEW.status THEN
change_details := array_append(change_details, 'Status: "' || COALESCE(OLD.status, '') || '" → "' || COALESCE(NEW.status, '') || '"');
END IF;

IF OLD.service_type IS DISTINCT FROM NEW.service_type THEN
change_details := array_append(change_details, 'Service Type: "' || COALESCE(OLD.service_type, '') || '" → "' || COALESCE(NEW.service_type, '') || '"');
END IF;

IF OLD.carrier_rep_name IS DISTINCT FROM NEW.carrier_rep_name OR
OLD.carrier_rep_email IS DISTINCT FROM NEW.carrier_rep_email OR
OLD.carrier_rep_phone IS DISTINCT FROM NEW.carrier_rep_phone THEN
change_details := array_append(change_details, 'Carrier representative updated');
END IF;

-- Use correct column name: on_time_pct (not on_time_percentage)
IF OLD.on_time_pct IS DISTINCT FROM NEW.on_time_pct THEN
change_details := array_append(change_details, 'On-time: ' || COALESCE(OLD.on_time_pct::TEXT, '0') || '% → ' || COALESCE(NEW.on_time_pct::TEXT, '0') || '%');
END IF;

IF array_length(change_details, 1) > 0 THEN
INSERT INTO interactions (
entity_type,
entity_id,
interaction_type,
summary,
details,
metadata,
created_date,
user_id
) VALUES (
'carrier',
NEW.id,
'update',
'Carrier Updated',
array_to_string(change_details, ' • '),
jsonb_build_object(
'changes', change_details,
'updated_by', user_id_val,
'carrier_id', NEW.id
),
NOW(),
user_id_val
);
END IF;

RETURN NEW;
END;
$function$;
