/*
  # Fix Function Search Paths - Security Audit

  1. Purpose
    - Fix mutable search_path configuration on functions
    - Improves security by preventing search_path manipulation attacks
    - Ensures consistent function behavior

  2. Changes
    - Set search_path to 'public' for get_effective_user_id function
    - Set search_path to 'public' for generate_tariff_reference_id function

  3. Security Impact
    - Prevents potential security vulnerabilities from search_path manipulation
    - Ensures functions always reference correct schema objects
    - Follows PostgreSQL security best practices
*/

-- Fix get_effective_user_id function
CREATE OR REPLACE FUNCTION public.get_effective_user_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN COALESCE(
    (current_setting('request.jwt.claims', true)::json->>'impersonated_user_id')::uuid,
    auth.uid()
  );
END;
$$;

-- Fix generate_tariff_reference_id function
CREATE OR REPLACE FUNCTION public.generate_tariff_reference_id(
  p_customer_name text,
  p_carrier_name text,
  p_effective_date date
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_customer_prefix text;
  v_carrier_prefix text;
  v_year text;
  v_sequence int;
  v_reference_id text;
BEGIN
  v_customer_prefix := UPPER(LEFT(REGEXP_REPLACE(p_customer_name, '[^A-Za-z0-9]', '', 'g'), 3));
  v_carrier_prefix := UPPER(LEFT(REGEXP_REPLACE(p_carrier_name, '[^A-Za-z0-9]', '', 'g'), 3));
  v_year := TO_CHAR(p_effective_date, 'YY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(tariff_reference_id FROM '\d{4}$') AS INT)), 0) + 1
  INTO v_sequence
  FROM public.tariffs
  WHERE tariff_reference_id LIKE v_customer_prefix || '-' || v_carrier_prefix || '-' || v_year || '%';
  
  v_reference_id := v_customer_prefix || '-' || v_carrier_prefix || '-' || v_year || LPAD(v_sequence::text, 4, '0');
  
  RETURN v_reference_id;
END;
$$;