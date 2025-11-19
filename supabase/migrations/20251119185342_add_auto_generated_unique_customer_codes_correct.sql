/*
  # Add Auto-Generated Unique Customer Codes (Corrected)
  
  1. Problem
    - Customer short_code is optional and often null
    - No guarantee of uniqueness across customers
    - Tariff reference IDs rely on customer codes but they're not consistent
  
  2. Solution
    - Make short_code NOT NULL and UNIQUE
    - Create a function to auto-generate unique customer codes from customer names
    - Add a trigger to auto-generate the code when a customer is created
    - Backfill existing customers with unique codes (disable interaction logging temporarily)
  
  3. Code Generation Logic
    - Start with first 3-4 letters of company name (uppercase, letters only)
    - If collision, append sequence number (e.g., ACME, ACM2, ACM3)
    - Ensure uniqueness across all customers
  
  4. Security
    - No changes to RLS policies
*/

-- Function to generate unique customer code
CREATE OR REPLACE FUNCTION generate_unique_customer_code(p_customer_name text, p_customer_id uuid DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_code text;
  final_code text;
  sequence_num integer := 1;
  code_exists boolean;
BEGIN
  -- Extract first 3-4 letters from name, uppercase, letters only
  base_code := substring(upper(regexp_replace(p_customer_name, '[^a-zA-Z]', '', 'g')), 1, 4);
  
  -- Handle empty base_code
  IF base_code IS NULL OR length(base_code) = 0 THEN
    base_code := 'CUST';
  END IF;
  
  -- Start with base code
  final_code := base_code;
  
  -- Check if code exists (excluding current customer if updating)
  LOOP
    SELECT EXISTS(
      SELECT 1 FROM customers 
      WHERE short_code = final_code 
      AND (p_customer_id IS NULL OR id != p_customer_id)
    ) INTO code_exists;
    
    -- If unique, we're done
    EXIT WHEN NOT code_exists;
    
    -- Otherwise, append sequence number
    sequence_num := sequence_num + 1;
    final_code := substring(base_code, 1, 3) || sequence_num::text;
  END LOOP;
  
  RETURN final_code;
END;
$$;

-- Trigger function to auto-generate customer code on insert
CREATE OR REPLACE FUNCTION auto_generate_customer_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only generate if not already set
  IF NEW.short_code IS NULL OR NEW.short_code = '' THEN
    NEW.short_code := generate_unique_customer_code(NEW.name, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for new customers (runs BEFORE other triggers so it happens first)
DROP TRIGGER IF EXISTS auto_generate_customer_code ON customers;
CREATE TRIGGER auto_generate_customer_code
  BEFORE INSERT OR UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_customer_code();

-- Temporarily disable the customer change logging trigger for backfill
ALTER TABLE customers DISABLE TRIGGER trigger_log_customer_changes;

-- Backfill existing customers with unique codes
DO $$
DECLARE
  customer_record RECORD;
  new_code text;
BEGIN
  FOR customer_record IN 
    SELECT id, name, short_code
    FROM customers
    WHERE short_code IS NULL OR short_code = ''
    ORDER BY created_date
  LOOP
    -- Generate unique code
    new_code := generate_unique_customer_code(customer_record.name, customer_record.id);
    
    -- Update customer directly without triggering interaction logging
    UPDATE customers
    SET short_code = new_code
    WHERE id = customer_record.id;
    
    RAISE NOTICE 'Customer % assigned code: %', customer_record.name, new_code;
  END LOOP;
END $$;

-- Re-enable the trigger
ALTER TABLE customers ENABLE TRIGGER trigger_log_customer_changes;

-- Now make short_code NOT NULL and UNIQUE
ALTER TABLE customers 
  ALTER COLUMN short_code SET NOT NULL,
  ADD CONSTRAINT customers_short_code_unique UNIQUE (short_code);

-- Add helpful comment
COMMENT ON COLUMN customers.short_code IS 'Auto-generated unique identifier for the customer, used in tariff reference IDs. Generated from customer name on creation.';
