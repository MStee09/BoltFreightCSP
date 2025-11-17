/*
  # Fix generate_tariff_reference_id Function
  
  1. Problem
    - The generate_tariff_reference_id() function (not auto_generate_tariff_reference_id) is broken
    - It tries to use NEW.tariff_id_prefix which doesn't exist
    - The trigger auto_generate_tariff_reference_id calls this broken function
  
  2. Solution
    - Replace the generate_tariff_reference_id() function with the proper implementation
    - Accept customer_id, carrier_ids, and effective_date parameters
    - Generate reference ID from these parameters
  
  3. Security
    - No changes to RLS policies
*/

-- Replace the broken function with the proper implementation
CREATE OR REPLACE FUNCTION generate_tariff_reference_id(
  p_customer_id uuid,
  p_carrier_ids uuid[],
  p_effective_date date
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
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

  -- Default if customer not found
  IF customer_code IS NULL THEN
    customer_code := 'CUS';
  END IF;

  -- Get first carrier short code or generate from name
  IF p_carrier_ids IS NOT NULL AND array_length(p_carrier_ids, 1) > 0 THEN
    SELECT COALESCE(short_code, substring(upper(regexp_replace(name, '[^a-zA-Z]', '', 'g')), 1, 3))
    INTO carrier_code
    FROM carriers
    WHERE id = p_carrier_ids[1];
  END IF;
  
  -- Default if carrier not found
  IF carrier_code IS NULL THEN
    carrier_code := 'CAR';
  END IF;

  -- Get year and month from effective date
  year_str := to_char(p_effective_date, 'YY');
  month_str := to_char(p_effective_date, 'MM');

  -- Find next sequence number for this combination
  SELECT COALESCE(MAX(CAST(substring(tariff_reference_id FROM '[0-9]+$') AS integer)), 0) + 1
  INTO sequence_num
  FROM tariffs
  WHERE tariff_reference_id LIKE customer_code || '-' || carrier_code || '-' || year_str || month_str || '%';

  -- Construct final ID
  final_id := customer_code || '-' || carrier_code || '-' || year_str || month_str || '-' || lpad(sequence_num::text, 3, '0');

  RETURN final_id;
END;
$$;
