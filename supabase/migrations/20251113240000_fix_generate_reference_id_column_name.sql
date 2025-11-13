/*
  # Fix generate_tariff_reference_id Function - Use Correct Column Name

  1. Changes
    - Fix query to use tariff_reference_id instead of reference_id
    - This was causing the "column reference_id does not exist" error

  2. Security
    - No changes to security model
*/

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

  -- Find next sequence number for this combination (FIXED: use tariff_reference_id not reference_id)
  SELECT COALESCE(MAX(CAST(substring(tariff_reference_id FROM '[0-9]+$') AS integer)), 0) + 1
  INTO sequence_num
  FROM tariffs
  WHERE tariff_reference_id LIKE customer_code || '-' || carrier_code || '-' || year_str || month_str || '%';

  -- Construct final ID
  final_id := customer_code || '-' || carrier_code || '-' || year_str || month_str || '-' || lpad(sequence_num::text, 3, '0');

  RETURN final_id;
END;
$$;
