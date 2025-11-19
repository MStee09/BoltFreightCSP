/*
  # Use SCAC Code for Tariff Reference IDs
  
  1. Problem
    - Function currently uses short_code (which is null) or generates from name
    - Should use the official SCAC code (scac_code field) instead
    - SCAC codes are industry standard carrier identifiers
  
  2. Solution
    - Update generate_tariff_reference_id to use scac_code instead of short_code
    - Fall back to name-based generation only if scac_code is missing
  
  3. Security
    - No changes to RLS policies
*/

-- Update the generate_tariff_reference_id function to use scac_code
CREATE OR REPLACE FUNCTION generate_tariff_reference_id(
  p_customer_id uuid,
  p_carrier_ids uuid[],
  p_effective_date date,
  p_is_blanket boolean DEFAULT false,
  p_ownership_type text DEFAULT 'customer_direct',
  p_carrier_id uuid DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  type_prefix text;
  customer_code text;
  carrier_code text;
  year_str text;
  sequence_num integer;
  final_id text;
  pattern_prefix text;
  carrier_uuid uuid;
BEGIN
  -- Determine type prefix based on blanket status and ownership type
  IF p_is_blanket THEN
    type_prefix := 'BLK';
  ELSE
    CASE p_ownership_type
      WHEN 'rocket_csp' THEN type_prefix := 'RKT';
      WHEN 'priority1_blanket' THEN type_prefix := 'P1B';
      WHEN 'rocket_blanket' THEN type_prefix := 'RBLK';
      WHEN 'customer_direct' THEN type_prefix := 'DIR';
      WHEN 'customer_csp' THEN type_prefix := 'CCSP';
      ELSE type_prefix := 'DIR';
    END CASE;
  END IF;

  -- For blanket tariffs, use ROCKET as the customer code
  IF p_is_blanket THEN
    customer_code := 'ROCKET';
  ELSE
    -- Get customer short code (now required and always present)
    SELECT short_code
    INTO customer_code
    FROM customers
    WHERE id = p_customer_id;

    IF customer_code IS NULL THEN
      customer_code := 'CUS';
    END IF;
  END IF;

  -- Get carrier code - check carrier_id first, then carrier_ids array
  IF p_carrier_id IS NOT NULL THEN
    carrier_uuid := p_carrier_id;
  ELSIF p_carrier_ids IS NOT NULL AND array_length(p_carrier_ids, 1) > 0 THEN
    carrier_uuid := p_carrier_ids[1];
  END IF;
  
  -- Fetch carrier SCAC code from carriers table (use scac_code, not short_code)
  IF carrier_uuid IS NOT NULL THEN
    SELECT COALESCE(scac_code, substring(upper(regexp_replace(name, '[^a-zA-Z]', '', 'g')), 1, 4))
    INTO carrier_code
    FROM carriers
    WHERE id = carrier_uuid;
  END IF;
  
  -- Default if carrier not found
  IF carrier_code IS NULL THEN
    carrier_code := 'CAR';
  END IF;

  -- Get year from effective date
  year_str := to_char(p_effective_date, 'YYYY');

  -- Find next sequence number for this type prefix + customer + carrier + year combination
  pattern_prefix := type_prefix || '-' || customer_code || '-' || carrier_code || '-' || year_str;
  
  SELECT COALESCE(MAX(CAST(substring(tariff_reference_id FROM '[0-9]+$') AS integer)), 0) + 1
  INTO sequence_num
  FROM tariffs
  WHERE tariff_reference_id LIKE pattern_prefix || '%';

  -- Construct final ID: TYPE-CUSTOMER-CARRIER-YEAR-SEQUENCE
  final_id := type_prefix || '-' || customer_code || '-' || carrier_code || '-' || year_str || '-' || lpad(sequence_num::text, 3, '0');

  RETURN final_id;
END;
$$;

-- Regenerate all tariff reference IDs with correct SCAC codes
DO $$
DECLARE
  tariff_record RECORD;
  new_ref_id text;
BEGIN
  FOR tariff_record IN 
    SELECT 
      id,
      customer_id,
      carrier_id,
      carrier_ids,
      effective_date,
      COALESCE(is_blanket_tariff, false) as is_blanket_tariff,
      COALESCE(ownership_type, 'customer_direct') as ownership_type
    FROM tariffs
    ORDER BY created_date
  LOOP
    -- Generate new reference ID using the improved function with SCAC codes
    new_ref_id := generate_tariff_reference_id(
      tariff_record.customer_id,
      tariff_record.carrier_ids,
      tariff_record.effective_date,
      tariff_record.is_blanket_tariff,
      tariff_record.ownership_type,
      tariff_record.carrier_id
    );
    
    -- Update the tariff with the new reference ID
    UPDATE tariffs
    SET tariff_reference_id = new_ref_id
    WHERE id = tariff_record.id;
  END LOOP;
END $$;
