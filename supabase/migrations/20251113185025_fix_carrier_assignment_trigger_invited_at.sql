/*
  # Fix Carrier Assignment Trigger - Update invited_date to invited_at

  1. Changes
    - Updates the `log_carrier_to_csp_assignment()` function to reference `invited_at` instead of `invited_date`
    - This fixes the error: "record 'new' has no field 'invited_date'"

  2. Security
    - Maintains existing SECURITY DEFINER
    - No RLS changes needed
*/

-- Update the function to use invited_at instead of invited_date
CREATE OR REPLACE FUNCTION log_carrier_to_csp_assignment()
RETURNS TRIGGER AS $$
DECLARE
  csp_title TEXT;
  customer_name TEXT;
  carrier_name TEXT;
  customer_id_val uuid;
BEGIN
  -- Get CSP event details
  SELECT ce.title, c.name, ce.customer_id
  INTO csp_title, customer_name, customer_id_val
  FROM csp_events ce
  LEFT JOIN customers c ON c.id = ce.customer_id
  WHERE ce.id = NEW.csp_event_id;

  -- Get carrier name
  SELECT name INTO carrier_name
  FROM carriers
  WHERE id = NEW.carrier_id;

  -- Log to carrier timeline
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
    NEW.carrier_id,
    'csp_event',
    'Added to CSP Event: ' || COALESCE(csp_title, 'Unknown'),
    'You were added to the CSP event "' || COALESCE(csp_title, 'Unknown') || '" for customer: ' || COALESCE(customer_name, 'Unknown'),
    jsonb_build_object(
      'csp_event_id', NEW.csp_event_id,
      'action', 'carrier_assigned',
      'invited_at', NEW.invited_at,
      'status', NEW.status
    ),
    NEW.created_date,
    NEW.user_id
  );

  -- Log to customer timeline if customer exists
  IF customer_id_val IS NOT NULL THEN
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
      customer_id_val,
      'csp_event',
      'Carrier Added to CSP: ' || COALESCE(carrier_name, 'Unknown'),
      'Carrier "' || COALESCE(carrier_name, 'Unknown') || '" was added to CSP event: ' || COALESCE(csp_title, 'Unknown'),
      jsonb_build_object(
        'csp_event_id', NEW.csp_event_id,
        'carrier_id', NEW.carrier_id,
        'carrier_name', carrier_name,
        'action', 'carrier_assigned'
      ),
      NEW.created_date,
      NEW.user_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
