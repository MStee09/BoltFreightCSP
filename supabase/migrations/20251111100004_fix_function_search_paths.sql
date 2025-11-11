/*
  # Fix Function Search Paths

  1. Changes
    - Set SECURITY DEFINER and explicit search_path for all functions
    - Prevents search_path manipulation attacks
    - Sets search_path to 'public' for all affected functions

  2. Security
    - Eliminates mutable search_path vulnerability
*/

-- sync_carrier_portal_url_to_tariffs
CREATE OR REPLACE FUNCTION sync_carrier_portal_url_to_tariffs()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.portal_login_url IS DISTINCT FROM OLD.portal_login_url THEN
    UPDATE tariffs
    SET carrier_portal_url = NEW.portal_login_url
    WHERE carrier_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- generate_customer_code
CREATE OR REPLACE FUNCTION generate_customer_code()
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := 'CUST-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
    SELECT EXISTS(SELECT 1 FROM customers WHERE customer_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$;

-- generate_carrier_code
CREATE OR REPLACE FUNCTION generate_carrier_code()
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := 'CARR-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
    SELECT EXISTS(SELECT 1 FROM carriers WHERE carrier_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$;

-- generate_tariff_reference_id
CREATE OR REPLACE FUNCTION generate_tariff_reference_id()
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  new_id TEXT;
  id_exists BOOLEAN;
BEGIN
  LOOP
    new_id := 'TRF-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 9999)::TEXT, 4, '0');
    SELECT EXISTS(SELECT 1 FROM tariffs WHERE reference_id = new_id) INTO id_exists;
    EXIT WHEN NOT id_exists;
  END LOOP;
  RETURN new_id;
END;
$$;

-- auto_generate_tariff_reference_id
CREATE OR REPLACE FUNCTION auto_generate_tariff_reference_id()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.reference_id IS NULL THEN
    NEW.reference_id := generate_tariff_reference_id();
  END IF;
  RETURN NEW;
END;
$$;

-- enforce_tariff_expiry_date
CREATE OR REPLACE FUNCTION enforce_tariff_expiry_date()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.start_date IS NOT NULL AND NEW.expiry_date IS NULL THEN
    NEW.expiry_date := NEW.start_date + INTERVAL '1 year';
  END IF;
  RETURN NEW;
END;
$$;

-- prevent_family_id_change
CREATE OR REPLACE FUNCTION prevent_family_id_change()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.tariff_family_id IS NOT NULL AND NEW.tariff_family_id IS DISTINCT FROM OLD.tariff_family_id THEN
    RAISE EXCEPTION 'Cannot change tariff_family_id once set';
  END IF;
  RETURN NEW;
END;
$$;

-- handle_ownership_change
CREATE OR REPLACE FUNCTION handle_ownership_change()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.ownership_type IS DISTINCT FROM NEW.ownership_type THEN
    IF NEW.ownership_type IN ('customer_direct', 'customer_blanket') THEN
      IF NEW.customer_id IS NULL OR array_length(NEW.customer_ids, 1) IS NULL THEN
        RAISE EXCEPTION 'customer_id or customer_ids required for customer ownership types';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
