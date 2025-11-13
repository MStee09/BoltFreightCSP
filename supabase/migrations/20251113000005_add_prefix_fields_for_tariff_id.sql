/*
  # Add Prefix Fields for Tariff ID Generation

  1. Customer & Carrier Prefixes
    - Add short_code to customers (e.g., "ACME")
    - Use existing scac_code for carriers (or add short_code fallback)

  2. Tariff ID Generator Function
    - Format: {CUSTOMER_PREFIX}-{CARRIER_PREFIX}-{YEAR}-{SEQ3}
    - Example: ACME-SWIFT-2025-002
    - Auto-generates next sequence number per (customer, carrier, year)
*/

-- Add short_code to customers
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS short_code text;

-- Add short_code to carriers (fallback if scac_code is not available)
ALTER TABLE carriers
  ADD COLUMN IF NOT EXISTS short_code text;

-- Create index for lookups
CREATE INDEX IF NOT EXISTS idx_customers_short_code ON customers(short_code) WHERE short_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_carriers_short_code ON carriers(short_code) WHERE short_code IS NOT NULL;

-- Function to generate customer prefix
CREATE OR REPLACE FUNCTION get_customer_prefix(p_customer_id uuid)
RETURNS text AS $$
DECLARE
  v_short_code text;
  v_name text;
  v_prefix text;
BEGIN
  SELECT short_code, name INTO v_short_code, v_name
  FROM customers
  WHERE id = p_customer_id;

  IF v_short_code IS NOT NULL AND v_short_code != '' THEN
    RETURN UPPER(v_short_code);
  END IF;

  IF v_name IS NULL OR v_name = '' THEN
    RETURN 'CUST';
  END IF;

  v_prefix := regexp_replace(UPPER(v_name), '[^A-Z0-9]', '', 'g');
  v_prefix := substring(v_prefix, 1, 4);

  RETURN v_prefix;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to generate carrier prefix
CREATE OR REPLACE FUNCTION get_carrier_prefix(p_carrier_id uuid)
RETURNS text AS $$
DECLARE
  v_scac text;
  v_short_code text;
  v_name text;
  v_prefix text;
BEGIN
  SELECT scac_code, short_code, name INTO v_scac, v_short_code, v_name
  FROM carriers
  WHERE id = p_carrier_id;

  IF v_scac IS NOT NULL AND v_scac != '' THEN
    RETURN UPPER(v_scac);
  END IF;

  IF v_short_code IS NOT NULL AND v_short_code != '' THEN
    RETURN UPPER(v_short_code);
  END IF;

  IF v_name IS NULL OR v_name = '' THEN
    RETURN 'CARR';
  END IF;

  v_prefix := regexp_replace(UPPER(v_name), '[^A-Z0-9]', '', 'g');
  v_prefix := substring(v_prefix, 1, 4);

  RETURN v_prefix;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to generate next tariff ID
CREATE OR REPLACE FUNCTION generate_tariff_id(
  p_customer_id uuid,
  p_carrier_id uuid,
  p_year integer
)
RETURNS text AS $$
DECLARE
  v_customer_prefix text;
  v_carrier_prefix text;
  v_max_seq integer;
  v_next_seq integer;
  v_tariff_id text;
BEGIN
  v_customer_prefix := get_customer_prefix(p_customer_id);
  v_carrier_prefix := get_carrier_prefix(p_carrier_id);

  SELECT COALESCE(MAX(
    CAST(
      substring(tariff_reference_id from '(\d{3})$') AS integer
    )
  ), 0) INTO v_max_seq
  FROM tariffs
  WHERE customer_id = p_customer_id
    AND carrier_ids @> ARRAY[p_carrier_id]
    AND tariff_reference_id LIKE v_customer_prefix || '-' || v_carrier_prefix || '-' || p_year || '-%';

  v_next_seq := v_max_seq + 1;

  v_tariff_id := v_customer_prefix || '-' || v_carrier_prefix || '-' || p_year || '-' || lpad(v_next_seq::text, 3, '0');

  RETURN v_tariff_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON COLUMN customers.short_code IS 'Short code for tariff ID generation (e.g., ACME)';
COMMENT ON COLUMN carriers.short_code IS 'Short code for tariff ID generation (fallback if SCAC not available)';
COMMENT ON FUNCTION generate_tariff_id IS 'Generates unique tariff ID in format: {CUSTOMER_PREFIX}-{CARRIER_PREFIX}-{YEAR}-{SEQ3}';
