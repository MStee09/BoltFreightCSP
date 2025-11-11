/*
  # Fix Security Issues - Part 5: Fix Function Search Paths

  1. Problem
    - Functions have role-mutable search_path
    - This can lead to security vulnerabilities

  2. Solution
    - Set explicit search_path on all functions
    - Use SECURITY DEFINER with search_path = public

  3. Functions Fixed
    - sync_carrier_portal_url_to_tariffs
    - generate_customer_code
    - generate_carrier_code
    - generate_tariff_reference_id
    - auto_generate_tariff_reference_id
    - enforce_tariff_expiry_date
    - prevent_family_id_change
    - handle_ownership_change
*/

-- ==========================================
-- CARRIER PORTAL URL SYNC
-- ==========================================

CREATE OR REPLACE FUNCTION sync_carrier_portal_url_to_tariffs()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE tariffs
  SET carrier_portal_url = NEW.portal_url
  WHERE carrier_id = NEW.id;
  RETURN NEW;
END;
$$;

-- ==========================================
-- CUSTOMER CODE GENERATION
-- ==========================================

CREATE OR REPLACE FUNCTION generate_customer_code()
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  new_code TEXT;
  counter INT := 1;
  max_attempts INT := 100;
BEGIN
  LOOP
    new_code := 'CUST-' || LPAD(counter::TEXT, 6, '0');

    IF NOT EXISTS (SELECT 1 FROM customers WHERE customer_code = new_code) THEN
      RETURN new_code;
    END IF;

    counter := counter + 1;

    IF counter > max_attempts THEN
      RAISE EXCEPTION 'Could not generate unique customer code after % attempts', max_attempts;
    END IF;
  END LOOP;
END;
$$;

-- ==========================================
-- CARRIER CODE GENERATION
-- ==========================================

CREATE OR REPLACE FUNCTION generate_carrier_code()
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  new_code TEXT;
  counter INT := 1;
  max_attempts INT := 100;
BEGIN
  LOOP
    new_code := 'CARR-' || LPAD(counter::TEXT, 6, '0');

    IF NOT EXISTS (SELECT 1 FROM carriers WHERE carrier_code = new_code) THEN
      RETURN new_code;
    END IF;

    counter := counter + 1;

    IF counter > max_attempts THEN
      RAISE EXCEPTION 'Could not generate unique carrier code after % attempts', max_attempts;
    END IF;
  END LOOP;
END;
$$;

-- ==========================================
-- TARIFF REFERENCE ID GENERATION
-- ==========================================

CREATE OR REPLACE FUNCTION generate_tariff_reference_id()
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  new_id TEXT;
  year_suffix TEXT;
  counter INT := 1;
  max_attempts INT := 1000;
BEGIN
  year_suffix := TO_CHAR(NOW(), 'YY');

  LOOP
    new_id := 'TRF-' || year_suffix || '-' || LPAD(counter::TEXT, 5, '0');

    IF NOT EXISTS (SELECT 1 FROM tariffs WHERE tariff_reference_id = new_id) THEN
      RETURN new_id;
    END IF;

    counter := counter + 1;

    IF counter > max_attempts THEN
      RAISE EXCEPTION 'Could not generate unique tariff reference ID after % attempts', max_attempts;
    END IF;
  END LOOP;
END;
$$;

-- ==========================================
-- AUTO GENERATE TARIFF REFERENCE ID TRIGGER
-- ==========================================

CREATE OR REPLACE FUNCTION auto_generate_tariff_reference_id()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.tariff_reference_id IS NULL OR NEW.tariff_reference_id = '' THEN
    NEW.tariff_reference_id := generate_tariff_reference_id();
  END IF;
  RETURN NEW;
END;
$$;

-- ==========================================
-- ENFORCE TARIFF EXPIRY DATE
-- ==========================================

CREATE OR REPLACE FUNCTION enforce_tariff_expiry_date()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.expiry_date IS NOT NULL AND NEW.expiry_date < NEW.effective_date THEN
    RAISE EXCEPTION 'Expiry date cannot be before effective date';
  END IF;
  RETURN NEW;
END;
$$;

-- ==========================================
-- PREVENT FAMILY ID CHANGE
-- ==========================================

CREATE OR REPLACE FUNCTION prevent_family_id_change()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.tariff_family_id IS NOT NULL AND
     NEW.tariff_family_id IS NOT NULL AND
     OLD.tariff_family_id != NEW.tariff_family_id THEN
    RAISE EXCEPTION 'Cannot change tariff_family_id once set. Create a new tariff instead.';
  END IF;
  RETURN NEW;
END;
$$;

-- ==========================================
-- HANDLE OWNERSHIP CHANGE
-- ==========================================

CREATE OR REPLACE FUNCTION handle_ownership_change()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  old_ownership_type TEXT;
  new_ownership_type TEXT;
BEGIN
  old_ownership_type := CASE
    WHEN OLD.customer_ids IS NOT NULL AND array_length(OLD.customer_ids, 1) > 0 THEN 'customer'
    WHEN OLD.csp_event_id IS NOT NULL THEN 'csp_event'
    ELSE 'carrier'
  END;

  new_ownership_type := CASE
    WHEN NEW.customer_ids IS NOT NULL AND array_length(NEW.customer_ids, 1) > 0 THEN 'customer'
    WHEN NEW.csp_event_id IS NOT NULL THEN 'csp_event'
    ELSE 'carrier'
  END;

  IF old_ownership_type != new_ownership_type THEN
    NEW.ownership_type := new_ownership_type;
  END IF;

  RETURN NEW;
END;
$$;
