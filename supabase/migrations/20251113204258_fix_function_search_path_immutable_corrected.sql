/*
  # Fix Function Search Path Immutability

  1. Changes
    - Drop and recreate generate_tariff_reference_id function with proper search_path
    - Ensures function behavior is consistent regardless of caller's search_path

  2. Security Impact
    - Prevents potential security issues from search_path manipulation
    - Makes function behavior predictable and safe
*/

-- Drop the existing function
DROP FUNCTION IF EXISTS generate_tariff_reference_id() CASCADE;

-- Recreate the function with proper search_path
CREATE FUNCTION generate_tariff_reference_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tariff_reference_id IS NULL THEN
    NEW.tariff_reference_id := NEW.tariff_id_prefix || '-' || LPAD(NEW.id::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS auto_generate_tariff_reference_id ON tariffs;
CREATE TRIGGER auto_generate_tariff_reference_id
  BEFORE INSERT ON tariffs
  FOR EACH ROW
  EXECUTE FUNCTION generate_tariff_reference_id();
