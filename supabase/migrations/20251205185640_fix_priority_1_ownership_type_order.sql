/*
  # Fix Priority 1 Ownership Type - Correct Order

  1. Problem
    - Need to drop constraint first before migrating data
    - Then migrate data
    - Then add new constraint
  
  2. Changes
    - Drop old constraint
    - Migrate existing Priority 1 tariffs to priority_1_csp
    - Add new constraint with priority_1_csp and rocket_blanket
    - Update rocket_csp_subtype constraint
  
  3. Security
    - No RLS changes needed
*/

-- Step 1: Drop the old ownership_type constraint
ALTER TABLE tariffs 
DROP CONSTRAINT IF EXISTS tariffs_ownership_type_check;

-- Step 2: Migrate existing Priority 1 tariffs
UPDATE tariffs 
SET ownership_type = 'priority_1_csp', 
    rocket_csp_subtype = NULL
WHERE ownership_type = 'rocket_csp' 
  AND rocket_csp_subtype = 'Priority 1';

-- Step 3: Add new ownership_type constraint
ALTER TABLE tariffs 
ADD CONSTRAINT tariffs_ownership_type_check 
CHECK (ownership_type IN ('customer_direct', 'rocket_csp', 'customer_csp', 'priority_1_csp', 'rocket_blanket'));

-- Step 4: Drop old rocket_csp_subtype constraint
ALTER TABLE tariffs 
DROP CONSTRAINT IF EXISTS tariffs_rocket_csp_subtype_check;

-- Step 5: Add new rocket_csp_subtype constraint (only standard Rocket CSP types)
ALTER TABLE tariffs 
ADD CONSTRAINT tariffs_rocket_csp_subtype_check 
CHECK (rocket_csp_subtype IN ('rocket_owned', 'blanket', 'care_of'));

-- Step 6: Update comments
COMMENT ON COLUMN tariffs.ownership_type IS 
'Ownership type: customer_direct (customer owns), rocket_csp (Rocket negotiated), customer_csp (customer CSP), priority_1_csp (Priority 1 broker), rocket_blanket (Rocket blanket tariff)';

COMMENT ON COLUMN tariffs.rocket_csp_subtype IS 
'Subtype for Rocket CSP ownership only: rocket_owned (Rocket negotiated), blanket (multi-customer), care_of (customer-owned with Rocket margin)';

-- Step 7: Update the reference ID generation function
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
  -- Determine type prefix based on blanket status and ownership type
  IF p_is_blanket OR p_ownership_type = 'rocket_blanket' THEN
    type_prefix := 'BLK';
  ELSIF p_ownership_type = 'priority_1_csp' THEN
    type_prefix := 'P1';
  ELSIF p_ownership_type = 'rocket_csp' THEN
    type_prefix := 'RKT';
  ELSE
    -- Standard ownership types
    CASE p_ownership_type
      WHEN 'customer_direct' THEN type_prefix := 'CD';
      WHEN 'customer_csp' THEN type_prefix := 'CCSP';
      ELSE type_prefix := 'CD'; -- Default to customer direct
    END CASE;
  END IF;

  -- For blanket tariffs, use ROCKET as the customer code
  IF p_is_blanket OR p_ownership_type = 'rocket_blanket' THEN
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
