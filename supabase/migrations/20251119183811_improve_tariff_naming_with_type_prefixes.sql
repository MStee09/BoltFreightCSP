/*
  # Improve Tariff Naming with Type Prefixes
  
  1. Problem
    - Current tariff names don't distinguish between different ownership types
    - "ROCKET-PILOT-2025-001" doesn't indicate if it's a blanket tariff, CSP tariff, or customer direct
    - Hard to tell at a glance what type of tariff you're looking at
  
  2. Solution
    - Add type prefixes to tariff reference IDs:
      - BLK- for Blanket Tariffs
      - RKT- for Rocket CSP (rocket_csp)
      - P1B- for Priority 1 Blanket (priority1_blanket)
      - RBLK- for Rocket Blanket (rocket_blanket)
      - DIR- for Customer Direct (customer_direct)
      - CCSP- for Customer CSP (customer_csp)
    
  3. Examples
    - BLK-ROCKET-PILOT-2025-001 (Blanket Tariff)
    - RKT-AIT-FEDEX-2025-001 (Rocket CSP)
    - P1B-EXTENDED-UPS-2025-001 (Priority 1 Blanket)
    - DIR-AIT-UPS-2025-001 (Customer Direct)
    
  4. Security
    - No changes to RLS policies
*/

-- Update the generate_tariff_reference_id function to include type prefixes
CREATE OR REPLACE FUNCTION generate_tariff_reference_id(
  p_customer_id uuid,
  p_carrier_ids uuid[],
  p_effective_date date,
  p_is_blanket boolean DEFAULT false,
  p_ownership_type text DEFAULT 'customer_direct'
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
      ELSE type_prefix := 'DIR'; -- Default to customer direct
    END CASE;
  END IF;

  -- For blanket tariffs, use ROCKET as the customer code since they're not customer-specific
  IF p_is_blanket THEN
    customer_code := 'ROCKET';
  ELSE
    -- Get customer short code or generate from name
    SELECT COALESCE(short_code, substring(upper(regexp_replace(name, '[^a-zA-Z]', '', 'g')), 1, 3))
    INTO customer_code
    FROM customers
    WHERE id = p_customer_id;

    -- Default if customer not found
    IF customer_code IS NULL THEN
      customer_code := 'CUS';
    END IF;
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

-- Update the auto_generate trigger function to pass the new parameters
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
      COALESCE(NEW.ownership_type, 'customer_direct')
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate the trigger to ensure it uses the updated function
DROP TRIGGER IF EXISTS auto_generate_tariff_reference_id ON tariffs;
CREATE TRIGGER auto_generate_tariff_reference_id
  BEFORE INSERT ON tariffs
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_tariff_reference_id();
