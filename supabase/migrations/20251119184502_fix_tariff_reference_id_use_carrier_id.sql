/*
  # Fix Tariff Reference ID to Use carrier_id Field
  
  1. Problem
    - Function only checks carrier_ids array, which is often empty
    - The actual carrier data is in the carrier_id (singular) field
    - Results in "CAR" default code instead of actual carrier codes
  
  2. Solution
    - Update function to check carrier_id first, then fall back to carrier_ids array
    - Update auto_generate function to pass carrier_id as well
  
  3. Security
    - No changes to RLS policies
*/

-- Update the generate_tariff_reference_id function to handle both carrier_id and carrier_ids
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
    -- Get customer short code or generate from name
    SELECT COALESCE(short_code, substring(upper(regexp_replace(name, '[^a-zA-Z]', '', 'g')), 1, 3))
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
  
  -- Fetch carrier code from carriers table
  IF carrier_uuid IS NOT NULL THEN
    SELECT COALESCE(short_code, substring(upper(regexp_replace(name, '[^a-zA-Z]', '', 'g')), 1, 4))
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

-- Update the auto_generate trigger function to pass carrier_id
CREATE OR REPLACE FUNCTION auto_generate_tariff_reference_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only generate if not already set
  IF NEW.tariff_reference_id IS NULL THEN
    -- Call the proper generation function with required parameters
    NEW.tariff_reference_id := generate_tariff_reference_id(
      NEW.customer_id,
      NEW.carrier_ids,
      NEW.effective_date,
      COALESCE(NEW.is_blanket_tariff, false),
      COALESCE(NEW.ownership_type, 'customer_direct'),
      NEW.carrier_id
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Regenerate all tariff reference IDs with correct carrier codes
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
    -- Generate new reference ID using the improved function
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
