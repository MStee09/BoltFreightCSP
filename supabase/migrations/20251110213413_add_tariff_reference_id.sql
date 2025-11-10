/*
  # Add Unique Tariff Reference ID System

  ## Overview
  Adds a human-readable, searchable unique identifier to every tariff.
  Format: {CUSTOMER_CODE}-{CARRIER_CODE}-{YEAR}-{SEQUENCE}
  Example: EXT-FEDEX-2025-001, EXT-FEDEX-2025-002

  ## Changes
  1. Add tariff_reference_id column to tariffs table
  2. Create function to auto-generate reference IDs based on:
     - Customer abbreviation (first 3-4 letters)
     - Carrier abbreviation (from carrier name)
     - Year of effective date
     - Sequential number within that customer-carrier-year group
  3. Create unique index to prevent duplicates
  4. Backfill existing tariffs with reference IDs

  ## Security
  - No RLS changes needed (inherits from tariffs table)

  ## Notes
  - Reference IDs are immutable once created
  - Provides easy searching and verbal reference
  - Visible in all UI lists and details
*/

-- Add tariff_reference_id column
ALTER TABLE tariffs 
ADD COLUMN IF NOT EXISTS tariff_reference_id text UNIQUE;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_tariffs_reference_id ON tariffs(tariff_reference_id);

-- Function to generate customer code (first 3-4 uppercase letters)
CREATE OR REPLACE FUNCTION generate_customer_code(customer_name text)
RETURNS text AS $$
BEGIN
  IF customer_name IS NULL THEN
    RETURN 'UNK';
  END IF;
  
  -- Remove common words and get first letters
  RETURN UPPER(
    LEFT(
      REGEXP_REPLACE(
        REGEXP_REPLACE(customer_name, '\s+(Inc|LLC|Corp|Ltd|Co|Company)\.?$', '', 'i'),
        '[^A-Za-z]', '', 'g'
      ), 
      4
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to generate carrier code
CREATE OR REPLACE FUNCTION generate_carrier_code(carrier_name text)
RETURNS text AS $$
DECLARE
  cleaned_name text;
BEGIN
  IF carrier_name IS NULL THEN
    RETURN 'UNK';
  END IF;
  
  cleaned_name := UPPER(REGEXP_REPLACE(carrier_name, '[^A-Za-z]', '', 'g'));
  
  -- Handle common carrier names with known abbreviations
  CASE 
    WHEN carrier_name ILIKE '%fedex%' THEN RETURN 'FEDEX';
    WHEN carrier_name ILIKE '%ups%' THEN RETURN 'UPS';
    WHEN carrier_name ILIKE '%dhl%' THEN RETURN 'DHL';
    WHEN carrier_name ILIKE '%usps%' THEN RETURN 'USPS';
    WHEN carrier_name ILIKE '%r+l%' OR carrier_name ILIKE '%r&l%' THEN RETURN 'RL';
    WHEN carrier_name ILIKE '%old dominion%' OR carrier_name ILIKE '%odfl%' THEN RETURN 'ODFL';
    WHEN carrier_name ILIKE '%xpo%' THEN RETURN 'XPO';
    WHEN carrier_name ILIKE '%saia%' THEN RETURN 'SAIA';
    WHEN carrier_name ILIKE '%estes%' THEN RETURN 'ESTES';
    WHEN carrier_name ILIKE '%yrc%' THEN RETURN 'YRC';
    WHEN carrier_name ILIKE '%abf%' THEN RETURN 'ABF';
    ELSE RETURN LEFT(cleaned_name, 5);
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to generate unique tariff reference ID
CREATE OR REPLACE FUNCTION generate_tariff_reference_id(
  p_tariff_id uuid,
  p_customer_id uuid,
  p_customer_name text,
  p_carrier_id uuid,
  p_carrier_name text,
  p_effective_date date
)
RETURNS text AS $$
DECLARE
  v_customer_code text;
  v_carrier_code text;
  v_year text;
  v_sequence int;
  v_reference_id text;
BEGIN
  -- Generate codes
  v_customer_code := generate_customer_code(p_customer_name);
  v_carrier_code := generate_carrier_code(p_carrier_name);
  v_year := COALESCE(EXTRACT(YEAR FROM p_effective_date)::text, TO_CHAR(NOW(), 'YYYY'));
  
  -- Find next sequence number for this customer-carrier-year combination
  SELECT COALESCE(MAX(
    CASE 
      WHEN tariff_reference_id ~ '-[0-9]+$' THEN
        SUBSTRING(tariff_reference_id FROM '[0-9]+$')::int
      ELSE 0
    END
  ), 0) + 1
  INTO v_sequence
  FROM tariffs
  WHERE id != p_tariff_id
    AND tariff_reference_id LIKE v_customer_code || '-' || v_carrier_code || '-' || v_year || '-%';
  
  -- Build reference ID
  v_reference_id := v_customer_code || '-' || v_carrier_code || '-' || v_year || '-' || LPAD(v_sequence::text, 3, '0');
  
  RETURN v_reference_id;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-populate reference ID on insert
CREATE OR REPLACE FUNCTION auto_generate_tariff_reference_id()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_name text;
  v_carrier_name text;
BEGIN
  -- Only generate if not already set
  IF NEW.tariff_reference_id IS NULL THEN
    -- Get customer name
    SELECT name INTO v_customer_name
    FROM customers
    WHERE id = NEW.customer_id;
    
    -- Get carrier name
    SELECT name INTO v_carrier_name
    FROM carriers
    WHERE id = NEW.carrier_id;
    
    -- Generate reference ID
    NEW.tariff_reference_id := generate_tariff_reference_id(
      NEW.id,
      NEW.customer_id,
      v_customer_name,
      NEW.carrier_id,
      v_carrier_name,
      NEW.effective_date
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new tariffs
DROP TRIGGER IF EXISTS trigger_auto_generate_tariff_reference_id ON tariffs;
CREATE TRIGGER trigger_auto_generate_tariff_reference_id
  BEFORE INSERT ON tariffs
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_tariff_reference_id();

-- Backfill existing tariffs with reference IDs
DO $$
DECLARE
  tariff_record RECORD;
  v_customer_name text;
  v_carrier_name text;
  v_reference_id text;
BEGIN
  FOR tariff_record IN 
    SELECT t.id, t.customer_id, t.carrier_id, t.effective_date
    FROM tariffs t
    WHERE t.tariff_reference_id IS NULL
    ORDER BY t.created_date ASC
  LOOP
    -- Get customer name
    SELECT name INTO v_customer_name
    FROM customers
    WHERE id = tariff_record.customer_id;
    
    -- Get carrier name
    SELECT name INTO v_carrier_name
    FROM carriers
    WHERE id = tariff_record.carrier_id;
    
    -- Generate reference ID
    v_reference_id := generate_tariff_reference_id(
      tariff_record.id,
      tariff_record.customer_id,
      v_customer_name,
      tariff_record.carrier_id,
      v_carrier_name,
      tariff_record.effective_date
    );
    
    -- Update tariff
    UPDATE tariffs
    SET tariff_reference_id = v_reference_id
    WHERE id = tariff_record.id;
  END LOOP;
END $$;
