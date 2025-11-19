/*
  # Enforce Single Carrier Per Tariff
  
  1. Problem
    - Tariffs have both carrier_id (single) and carrier_ids (array)
    - This creates confusion - a tariff should only be with one carrier
    - Blanket tariffs are with one carrier but multiple customers
  
  2. Solution
    - Make carrier_id NOT NULL (required)
    - Keep carrier_ids for backward compatibility but mark as deprecated
    - Migrate any data that only has carrier_ids to carrier_id
    - Update functions to use carrier_id as primary field
  
  3. Business Logic
    - One tariff = One carrier (always)
    - Blanket tariffs: One carrier, multiple sub-customers
    - Regular tariffs: One carrier, one customer
  
  4. Security
    - No changes to RLS policies
*/

-- First, ensure all tariffs have carrier_id set
-- If carrier_id is null but carrier_ids has values, use the first one
UPDATE tariffs
SET carrier_id = carrier_ids[1]
WHERE carrier_id IS NULL 
  AND carrier_ids IS NOT NULL 
  AND array_length(carrier_ids, 1) > 0;

-- Now make carrier_id NOT NULL
ALTER TABLE tariffs
  ALTER COLUMN carrier_id SET NOT NULL;

-- Add check constraint to ensure carrier_ids, if present, only has one element
ALTER TABLE tariffs
  ADD CONSTRAINT tariffs_single_carrier_check 
  CHECK (carrier_ids IS NULL OR array_length(carrier_ids, 1) <= 1);

-- Add helpful comments
COMMENT ON COLUMN tariffs.carrier_id IS 'The single carrier for this tariff. Every tariff is with exactly one carrier.';
COMMENT ON COLUMN tariffs.carrier_ids IS 'DEPRECATED: Use carrier_id instead. Kept for backward compatibility only.';

-- Update the generate_tariff_reference_id function to prioritize carrier_id
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

  -- Get carrier code - ALWAYS use carrier_id first (the single carrier)
  IF p_carrier_id IS NOT NULL THEN
    carrier_uuid := p_carrier_id;
  ELSIF p_carrier_ids IS NOT NULL AND array_length(p_carrier_ids, 1) > 0 THEN
    -- Fallback for legacy data
    carrier_uuid := p_carrier_ids[1];
  END IF;
  
  -- Fetch carrier SCAC code from carriers table
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

-- Update the trigger to use carrier_id
CREATE OR REPLACE FUNCTION auto_generate_tariff_reference_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only generate if not already set
  IF NEW.tariff_reference_id IS NULL OR NEW.tariff_reference_id = '' THEN
    NEW.tariff_reference_id := generate_tariff_reference_id(
      NEW.customer_id,
      NEW.carrier_ids,
      NEW.effective_date,
      COALESCE(NEW.is_blanket_tariff, false),
      COALESCE(NEW.ownership_type, 'customer_direct'),
      NEW.carrier_id  -- Use carrier_id as primary source
    );
  END IF;
  RETURN NEW;
END;
$$;
