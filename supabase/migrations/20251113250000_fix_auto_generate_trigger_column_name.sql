/*
  # Fix Auto Generate Tariff Reference ID Trigger

  1. Changes
    - Fix trigger function to use tariff_reference_id instead of reference_id
    - This was causing "record NEW has no field reference_id" error

  2. Security
    - No changes to security model
*/

CREATE OR REPLACE FUNCTION auto_generate_tariff_reference_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tariff_reference_id IS NULL THEN
    NEW.tariff_reference_id := generate_tariff_reference_id(
      NEW.customer_id,
      NEW.carrier_ids,
      NEW.effective_date
    );
  END IF;
  RETURN NEW;
END;
$$;
