/*
  # Fix Tariff Reference ID Trigger - CASCADE Fix
  
  1. Problem
    - Trigger is failing with "record NEW has no field reference_id"
    - The actual column name is tariff_reference_id, not reference_id
    - Need to drop with CASCADE to remove dependent trigger first
  
  2. Solution
    - Drop function with CASCADE to remove trigger
    - Recreate both function and trigger with proper implementation
  
  3. Security
    - No changes to RLS policies
*/

-- Drop the function with CASCADE to remove dependent trigger
DROP FUNCTION IF EXISTS auto_generate_tariff_reference_id() CASCADE;

-- Recreate the function to auto-generate tariff_reference_id
CREATE OR REPLACE FUNCTION auto_generate_tariff_reference_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  customer_code text;
  carrier_code text;
  year_str text;
  sequence_num integer;
  final_id text;
  v_carrier_id uuid;
BEGIN
  -- Only generate if not already set
  IF NEW.tariff_reference_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Get carrier_id (prefer carrier_id, fallback to first element of carrier_ids)
  IF NEW.carrier_id IS NOT NULL THEN
    v_carrier_id := NEW.carrier_id;
  ELSIF NEW.carrier_ids IS NOT NULL AND array_length(NEW.carrier_ids, 1) > 0 THEN
    v_carrier_id := NEW.carrier_ids[1];
  ELSE
    v_carrier_id := NULL;
  END IF;

  -- Get customer short code or generate from name
  SELECT COALESCE(
    short_code, 
    UPPER(substring(regexp_replace(name, '[^a-zA-Z]', '', 'g'), 1, 4))
  )
  INTO customer_code
  FROM customers
  WHERE id = NEW.customer_id;

  -- Default if customer not found
  IF customer_code IS NULL OR customer_code = '' THEN
    customer_code := 'CUST';
  END IF;

  -- Get carrier short code or SCAC code or generate from name
  SELECT COALESCE(
    scac_code,
    short_code,
    UPPER(substring(regexp_replace(name, '[^a-zA-Z]', '', 'g'), 1, 4))
  )
  INTO carrier_code
  FROM carriers
  WHERE id = v_carrier_id;

  -- Default if carrier not found
  IF carrier_code IS NULL OR carrier_code = '' THEN
    carrier_code := 'CARR';
  END IF;

  -- Get year from effective date
  IF NEW.effective_date IS NOT NULL THEN
    year_str := to_char(NEW.effective_date, 'YYYY');
  ELSE
    year_str := to_char(CURRENT_DATE, 'YYYY');
  END IF;

  -- Find next sequence number for this combination
  SELECT COALESCE(MAX(
    CASE 
      WHEN tariff_reference_id ~ (customer_code || '-' || carrier_code || '-' || year_str || '-[0-9]+$')
      THEN CAST(substring(tariff_reference_id FROM '[0-9]+$') AS integer)
      ELSE 0
    END
  ), 0) + 1
  INTO sequence_num
  FROM tariffs
  WHERE tariff_reference_id LIKE customer_code || '-' || carrier_code || '-' || year_str || '-%';

  -- Construct final ID
  final_id := customer_code || '-' || carrier_code || '-' || year_str || '-' || lpad(sequence_num::text, 3, '0');

  NEW.tariff_reference_id := final_id;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER trigger_auto_generate_tariff_reference_id
  BEFORE INSERT ON tariffs
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_tariff_reference_id();
