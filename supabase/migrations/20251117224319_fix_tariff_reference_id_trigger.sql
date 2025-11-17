/*
  # Fix Tariff Reference ID Trigger
  
  1. Problem
    - The auto_generate_tariff_reference_id trigger is trying to use NEW.tariff_id_prefix
    - This column doesn't exist in the tariffs table
    - This causes "record NEW has no field tariff_id_prefix" error on insert
  
  2. Solution
    - Replace the broken trigger function with a working version
    - Use the generate_tariff_reference_id function that takes proper parameters
    - Generate reference ID from customer_id, carrier_ids, and effective_date
  
  3. Security
    - No changes to RLS policies
*/

-- Replace the broken trigger function
CREATE OR REPLACE FUNCTION auto_generate_tariff_reference_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only generate if not already set
  IF NEW.tariff_reference_id IS NULL THEN
    -- Call the proper generation function with required parameters
    NEW.tariff_reference_id := generate_tariff_reference_id(
      NEW.customer_id,
      NEW.carrier_ids,
      NEW.effective_date
    );
  END IF;
  RETURN NEW;
END;
$$;
