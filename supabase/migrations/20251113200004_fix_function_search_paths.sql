/*
  # Fix Function Search Paths

  1. Changes
    - Sets search_path to 'public' for security-sensitive functions
    - Prevents search path manipulation attacks
    - Makes functions immune to role-specific search_path settings

  2. Affected Functions
    - log_carrier_to_csp_assignment
    - generate_customer_code
    - generate_carrier_code
    - generate_tariff_reference_id

  3. Security
    - Hardens functions against schema injection attacks
    - Ensures functions always use public schema
    - No functional changes to existing behavior
*/

-- Fix log_carrier_to_csp_assignment function
CREATE OR REPLACE FUNCTION log_carrier_to_csp_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Fix generate_customer_code function
CREATE OR REPLACE FUNCTION generate_customer_code(customer_name text)
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base_code text;
  final_code text;
  counter integer := 1;
BEGIN
  -- Generate base code from first 3 letters
  base_code := upper(substring(regexp_replace(customer_name, '[^a-zA-Z]', '', 'g'), 1, 3));

  -- If less than 3 letters, pad with 'X'
  WHILE length(base_code) < 3 LOOP
    base_code := base_code || 'X';
  END LOOP;

  final_code := base_code;

  -- Check for duplicates and append number if needed
  WHILE EXISTS (SELECT 1 FROM customers WHERE short_code = final_code) LOOP
    final_code := base_code || counter::text;
    counter := counter + 1;
  END LOOP;

  RETURN final_code;
END;
$$;

-- Fix generate_carrier_code function
CREATE OR REPLACE FUNCTION generate_carrier_code(carrier_name text)
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base_code text;
  final_code text;
  counter integer := 1;
BEGIN
  -- Generate base code from first 3 letters
  base_code := upper(substring(regexp_replace(carrier_name, '[^a-zA-Z]', '', 'g'), 1, 3));

  -- If less than 3 letters, pad with 'X'
  WHILE length(base_code) < 3 LOOP
    base_code := base_code || 'X';
  END LOOP;

  final_code := base_code;

  -- Check for duplicates and append number if needed
  WHILE EXISTS (SELECT 1 FROM carriers WHERE short_code = final_code) LOOP
    final_code := base_code || counter::text;
    counter := counter + 1;
  END LOOP;

  RETURN final_code;
END;
$$;

-- Fix generate_tariff_reference_id function
CREATE OR REPLACE FUNCTION generate_tariff_reference_id(
  p_customer_id uuid,
  p_carrier_ids uuid[],
  p_effective_date date
)
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  customer_code text;
  carrier_code text;
  year_str text;
  month_str text;
  sequence_num integer;
  final_id text;
BEGIN
  -- Get customer short code or generate from name
  SELECT COALESCE(short_code, substring(upper(regexp_replace(name, '[^a-zA-Z]', '', 'g')), 1, 3))
  INTO customer_code
  FROM customers
  WHERE id = p_customer_id;

  -- Get first carrier short code or generate from name
  IF p_carrier_ids IS NOT NULL AND array_length(p_carrier_ids, 1) > 0 THEN
    SELECT COALESCE(short_code, substring(upper(regexp_replace(name, '[^a-zA-Z]', '', 'g')), 1, 3))
    INTO carrier_code
    FROM carriers
    WHERE id = p_carrier_ids[1];
  ELSE
    carrier_code := 'XXX';
  END IF;

  -- Get year and month from effective date
  year_str := to_char(p_effective_date, 'YY');
  month_str := to_char(p_effective_date, 'MM');

  -- Find next sequence number for this combination
  SELECT COALESCE(MAX(CAST(substring(reference_id FROM '[0-9]+$') AS integer)), 0) + 1
  INTO sequence_num
  FROM tariffs
  WHERE reference_id LIKE customer_code || '-' || carrier_code || '-' || year_str || month_str || '%';

  -- Construct final ID
  final_id := customer_code || '-' || carrier_code || '-' || year_str || month_str || '-' || lpad(sequence_num::text, 3, '0');

  RETURN final_id;
END;
$$;
