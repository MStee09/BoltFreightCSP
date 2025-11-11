/*
  # Fix Security Issues - Part 5: Fix Function Search Paths

  1. Changes
    - Add SET search_path = public to all functions with mutable search paths
    - This prevents search_path injection attacks

  2. Functions Updated
    - sync_carrier_portal_url_to_tariffs
    - generate_customer_code
    - generate_carrier_code
    - generate_tariff_reference_id
    - auto_generate_tariff_reference_id
    - enforce_tariff_expiry_date
    - prevent_family_id_change
    - handle_ownership_change
*/

-- sync_carrier_portal_url_to_tariffs
CREATE OR REPLACE FUNCTION sync_carrier_portal_url_to_tariffs()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE tariffs
  SET carrier_portal_url = NEW.carrier_portal_url
  WHERE carrier_id = NEW.id;
  
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
    
    IF NOT code_exists THEN
      RETURN new_code;
    END IF;
  END LOOP;
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
    
    IF NOT code_exists THEN
      RETURN new_code;
    END IF;
  END LOOP;
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
    
    IF NOT id_exists THEN
      RETURN new_id;
    END IF;
  END LOOP;
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
  IF NEW.expiry_date IS NOT NULL AND NEW.effective_date IS NOT NULL THEN
    IF NEW.expiry_date <= NEW.effective_date THEN
      RAISE EXCEPTION 'Expiry date must be after effective date';
    END IF;
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
  IF OLD.family_id IS NOT NULL AND NEW.family_id IS DISTINCT FROM OLD.family_id THEN
    RAISE EXCEPTION 'Cannot change family_id once set. Family ID is immutable.';
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
  IF NEW.ownership_type IS DISTINCT FROM OLD.ownership_type THEN
    IF NEW.ownership_type = 'carrier' THEN
      NEW.csp_event_id := NULL;
    ELSIF NEW.ownership_type = 'csp_event' THEN
      NEW.carrier_id := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;