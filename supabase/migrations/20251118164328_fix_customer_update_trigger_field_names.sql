/*
  # Fix Customer Update Trigger Field Names

  1. Changes
    - Update log_customer_field_changes function to use correct column names:
      - contact_name → primary_contact_name
      - contact_email → primary_contact_email
      - contact_phone → primary_contact_phone
      - annual_spend → annual_revenue
    - Remove reference to non-existent monthly_shipments field
  
  2. Notes
    - This fixes the "record 'old' has no field 'contact_name'" error when updating customers
*/

CREATE OR REPLACE FUNCTION log_customer_field_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  change_details TEXT[];
  user_id_val uuid;
BEGIN
  user_id_val := auth.uid();
  change_details := ARRAY[]::TEXT[];

  IF OLD.name IS DISTINCT FROM NEW.name THEN
    change_details := array_append(change_details, 'Name: "' || COALESCE(OLD.name, '') || '" → "' || COALESCE(NEW.name, '') || '"');
  END IF;

  IF OLD.segment IS DISTINCT FROM NEW.segment THEN
    change_details := array_append(change_details, 'Segment: "' || COALESCE(OLD.segment, '') || '" → "' || COALESCE(NEW.segment, '') || '"');
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status THEN
    change_details := array_append(change_details, 'Status: "' || COALESCE(OLD.status, '') || '" → "' || COALESCE(NEW.status, '') || '"');
  END IF;

  IF OLD.primary_contact_name IS DISTINCT FROM NEW.primary_contact_name OR
     OLD.primary_contact_email IS DISTINCT FROM NEW.primary_contact_email OR
     OLD.primary_contact_phone IS DISTINCT FROM NEW.primary_contact_phone THEN
    change_details := array_append(change_details, 'Contact information updated');
  END IF;

  IF OLD.annual_revenue IS DISTINCT FROM NEW.annual_revenue THEN
    change_details := array_append(change_details, 'Annual revenue: $' || COALESCE(OLD.annual_revenue::TEXT, '0') || ' → $' || COALESCE(NEW.annual_revenue::TEXT, '0'));
  END IF;

  IF OLD.short_code IS DISTINCT FROM NEW.short_code THEN
    change_details := array_append(change_details, 'Short code: "' || COALESCE(OLD.short_code, '') || '" → "' || COALESCE(NEW.short_code, '') || '"');
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
      'customer',
      NEW.id,
      'update',
      'Customer Updated',
      array_to_string(change_details, ' • '),
      jsonb_build_object(
        'changes', change_details,
        'updated_by', user_id_val,
        'customer_id', NEW.id
      ),
      NOW(),
      user_id_val
    );
  END IF;

  RETURN NEW;
END;
$$;
