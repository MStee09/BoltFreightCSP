/*
  # Tariff Family Resolution Function

  1. Function
    - resolve_tariff_family: Returns existing or creates new family for (customer, carrier, ownership)

  2. Usage
    - Called when creating proposed tariffs from awarded CSP carriers
    - Auto-generates family name from customer + carrier names
*/

CREATE OR REPLACE FUNCTION resolve_tariff_family(
  p_customer_id uuid,
  p_carrier_id uuid,
  p_ownership_type text,
  p_created_by uuid DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_family_id uuid;
  v_customer_name text;
  v_carrier_name text;
  v_family_name text;
BEGIN
  SELECT id INTO v_family_id
  FROM tariff_families
  WHERE customer_id = p_customer_id
    AND carrier_id = p_carrier_id
    AND ownership_type = p_ownership_type;

  IF v_family_id IS NOT NULL THEN
    RETURN v_family_id;
  END IF;

  SELECT name INTO v_customer_name FROM customers WHERE id = p_customer_id;
  SELECT name INTO v_carrier_name FROM carriers WHERE id = p_carrier_id;

  v_family_name := COALESCE(v_customer_name, 'Unknown') || ' - ' || COALESCE(v_carrier_name, 'Unknown');

  INSERT INTO tariff_families (
    customer_id,
    carrier_id,
    ownership_type,
    name,
    created_by
  ) VALUES (
    p_customer_id,
    p_carrier_id,
    p_ownership_type,
    v_family_name,
    p_created_by
  )
  RETURNING id INTO v_family_id;

  RETURN v_family_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION resolve_tariff_family IS 'Returns existing family or creates new one for (customer, carrier, ownership) tuple';
