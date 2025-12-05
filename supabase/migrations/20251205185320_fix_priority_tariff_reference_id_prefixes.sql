/*
  # Fix Priority Tariff Reference ID Prefixes

  1. Problem
    - Priority 1/2/3 tariffs are showing with "RKT-" prefix (Rocket CSP)
    - They should show as "P1-", "P2-", "P3-" since they're distinct ownership types
  
  2. Solution
    - Update generate_tariff_reference_id to check rocket_csp_subtype
    - When rocket_csp_subtype is 'Priority 1/2/3', use P1/P2/P3 prefix
    - When rocket_csp_subtype is standard type (rocket_owned, blanket, care_of), use RKT prefix
  
  3. Examples
    - P1-DECK-CCYQ-2025-001 (Priority 1 CSP)
    - P2-DECK-FEDEX-2025-001 (Priority 2 CSP)
    - RKT-AIT-UPS-2025-001 (Standard Rocket CSP)
  
  4. Security
    - No RLS changes needed
*/

-- Update function to handle rocket_csp_subtype for Priority tariffs
CREATE OR REPLACE FUNCTION generate_tariff_reference_id(
  p_customer_id uuid,
  p_carrier_ids uuid[],
  p_effective_date date,
  p_is_blanket boolean DEFAULT false,
  p_ownership_type text DEFAULT 'customer_direct',
  p_rocket_csp_subtype text DEFAULT NULL
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
  -- Determine type prefix based on blanket status, ownership type, and rocket_csp_subtype
  IF p_is_blanket THEN
    type_prefix := 'BLK';
  ELSIF p_ownership_type = 'rocket_csp' AND p_rocket_csp_subtype IS NOT NULL THEN
    -- Check if it's a Priority type
    CASE p_rocket_csp_subtype
      WHEN 'Priority 1' THEN type_prefix := 'P1';
      WHEN 'Priority 2' THEN type_prefix := 'P2';
      WHEN 'Priority 3' THEN type_prefix := 'P3';
      ELSE type_prefix := 'RKT'; -- Standard Rocket CSP subtypes (rocket_owned, blanket, care_of)
    END CASE;
  ELSE
    -- Standard ownership types
    CASE p_ownership_type
      WHEN 'rocket_csp' THEN type_prefix := 'RKT';
      WHEN 'customer_direct' THEN type_prefix := 'CD';
      WHEN 'customer_csp' THEN type_prefix := 'CCSP';
      ELSE type_prefix := 'CD'; -- Default to customer direct
    END CASE;
  END IF;

  -- For blanket tariffs, use ROCKET as the customer code since they're not customer-specific
  IF p_is_blanket THEN
    customer_code := 'ROCKET';
  ELSE
    -- Get customer short code or generate from name
    SELECT COALESCE(short_code, substring(upper(regexp_replace(name, '[^a-zA-Z]', '', 'g')), 1, 4))
    INTO customer_code
    FROM customers
    WHERE id = p_customer_id;

    -- Default if customer not found
    IF customer_code IS NULL THEN
      customer_code := 'CUST';
    END IF;
  END IF;

  -- Get first carrier short code or generate from name
  IF p_carrier_ids IS NOT NULL AND array_length(p_carrier_ids, 1) > 0 THEN
    SELECT COALESCE(short_code, substring(upper(regexp_replace(name, '[^a-zA-Z]', '', 'g')), 1, 4))
    INTO carrier_code
    FROM carriers
    WHERE id = p_carrier_ids[1];
  END IF;
  
  -- Default if carrier not found
  IF carrier_code IS NULL THEN
    carrier_code := 'CARR';
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

-- Update the auto_generate trigger function to pass rocket_csp_subtype
CREATE OR REPLACE FUNCTION auto_generate_tariff_reference_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only generate if not already set
  IF NEW.tariff_reference_id IS NULL THEN
    -- Call the proper generation function with required parameters including rocket_csp_subtype
    NEW.tariff_reference_id := generate_tariff_reference_id(
      NEW.customer_id,
      NEW.carrier_ids,
      NEW.effective_date,
      COALESCE(NEW.is_blanket_tariff, false),
      COALESCE(NEW.ownership_type, 'customer_direct'),
      NEW.rocket_csp_subtype
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS auto_generate_tariff_reference_id ON tariffs;
CREATE TRIGGER auto_generate_tariff_reference_id
  BEFORE INSERT ON tariffs
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_tariff_reference_id();
