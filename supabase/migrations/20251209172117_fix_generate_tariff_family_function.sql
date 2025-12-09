/*
  # Fix generate_tariff_family_id function to not require uuid-ossp extension

  1. Changes
    - Recreate function to use gen_random_uuid and md5 instead of uuid_generate_v5
    - Backfill all tariffs with missing family_id
    - Backfill all activities with missing family_id

  2. Security
    - No security changes
*/

-- Recreate the function without uuid-ossp dependency
CREATE OR REPLACE FUNCTION generate_tariff_family_id(
  p_customer_id uuid,
  p_carrier_ids uuid[],
  p_ownership_type text
)
RETURNS uuid
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_carrier_id uuid;
  v_hash_input text;
  v_hash text;
  v_family_id uuid;
BEGIN
  -- Use first carrier_id for family grouping
  IF array_length(p_carrier_ids, 1) > 0 THEN
    v_carrier_id := p_carrier_ids[1];
  END IF;

  -- Create deterministic hash from customer + carrier + ownership
  v_hash_input := COALESCE(p_customer_id::text, '') || 
                  COALESCE(v_carrier_id::text, '') || 
                  COALESCE(p_ownership_type, '');
  
  v_hash := md5(v_hash_input);
  
  -- Convert hash to UUID format
  v_family_id := (
    substring(v_hash, 1, 8) || '-' ||
    substring(v_hash, 9, 4) || '-' ||
    '4' || substring(v_hash, 13, 3) || '-' ||
    '8' || substring(v_hash, 17, 3) || '-' ||
    substring(v_hash, 21, 12)
  )::uuid;

  RETURN v_family_id;
END;
$$;

-- Backfill tariff_family_id for tariffs that are missing it
UPDATE tariffs
SET tariff_family_id = generate_tariff_family_id(customer_id, carrier_ids, ownership_type)
WHERE tariff_family_id IS NULL
  AND customer_id IS NOT NULL;

-- Backfill tariff_family_id for activities that are missing it
UPDATE tariff_activities ta
SET tariff_family_id = t.tariff_family_id
FROM tariffs t
WHERE ta.tariff_id = t.id
  AND ta.tariff_family_id IS NULL
  AND t.tariff_family_id IS NOT NULL;
