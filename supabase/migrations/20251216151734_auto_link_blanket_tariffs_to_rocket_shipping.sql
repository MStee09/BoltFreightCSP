/*
  # Auto-link blanket tariffs to Rocket Shipping customer

  1. Changes
    - Create a trigger function to automatically set customer_id to Rocket Shipping for all blanket tariffs
    - This ensures all blanket tariffs are always associated with Rocket Shipping
    - Applies to both new tariffs and updates that change a tariff to blanket status

  2. Security
    - No security changes
*/

-- Create function to auto-link blanket tariffs to Rocket Shipping
CREATE OR REPLACE FUNCTION auto_link_blanket_to_rocket_shipping()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  rocket_shipping_id uuid;
BEGIN
  -- Only process if this is a blanket tariff
  IF NEW.is_blanket_tariff = true OR 
     (NEW.ownership_type = 'rocket_csp' AND NEW.rocket_csp_subtype = 'blanket') OR
     NEW.ownership_type = 'rocket_blanket' THEN
    
    -- Get Rocket Shipping customer ID
    SELECT id INTO rocket_shipping_id
    FROM customers
    WHERE LOWER(name) = 'rocket shipping'
    LIMIT 1;
    
    -- Set customer_id to Rocket Shipping if found
    IF rocket_shipping_id IS NOT NULL THEN
      NEW.customer_id := rocket_shipping_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on tariffs table
DROP TRIGGER IF EXISTS link_blanket_tariff_to_rocket_shipping ON tariffs;
CREATE TRIGGER link_blanket_tariff_to_rocket_shipping
  BEFORE INSERT OR UPDATE ON tariffs
  FOR EACH ROW
  EXECUTE FUNCTION auto_link_blanket_to_rocket_shipping();

-- Backfill existing blanket tariffs that don't have Rocket Shipping linked
UPDATE tariffs
SET customer_id = (
  SELECT id FROM customers WHERE LOWER(name) = 'rocket shipping' LIMIT 1
)
WHERE (
  is_blanket_tariff = true OR 
  (ownership_type = 'rocket_csp' AND rocket_csp_subtype = 'blanket') OR
  ownership_type = 'rocket_blanket'
)
AND (
  customer_id IS NULL OR 
  customer_id != (SELECT id FROM customers WHERE LOWER(name) = 'rocket shipping' LIMIT 1)
);
