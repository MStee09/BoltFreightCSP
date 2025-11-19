/*
  # Fix Function Search Paths

  Sets immutable search paths for trigger functions to prevent role-based search path manipulation.
  This is a security best practice that prevents malicious users from hijacking function behavior.
  
  ## Fixed functions:
  - set_created_by
  - track_notes_update
  - set_updated_by
  - generate_tariff_reference_id
  
  ## Security impact:
  - Prevents search_path injection attacks
  - Ensures functions always use the intended schema
  - Improves function stability and predictability
*/

-- Fix set_created_by function
CREATE OR REPLACE FUNCTION public.set_created_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.created_by := auth.uid();
  RETURN NEW;
END;
$$;

-- Fix track_notes_update function
CREATE OR REPLACE FUNCTION public.track_notes_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.note_text IS DISTINCT FROM NEW.note_text THEN
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

-- Fix set_updated_by function
CREATE OR REPLACE FUNCTION public.set_updated_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_by := auth.uid();
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- Fix generate_tariff_reference_id function
CREATE OR REPLACE FUNCTION public.generate_tariff_reference_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  carrier_scac text;
  tariff_type_prefix text;
  next_sequence int;
  new_reference_id text;
BEGIN
  IF NEW.tariff_reference_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.carrier_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT scac_code INTO carrier_scac
  FROM carriers
  WHERE id = NEW.carrier_id;

  IF carrier_scac IS NULL THEN
    carrier_scac := 'XXXX';
  END IF;

  CASE NEW.tariff_type
    WHEN 'blanket' THEN tariff_type_prefix := 'BL';
    WHEN 'customer_specific' THEN tariff_type_prefix := 'CS';
    WHEN 'spot_quote' THEN tariff_type_prefix := 'SQ';
    ELSE tariff_type_prefix := 'UK';
  END CASE;

  SELECT COALESCE(MAX(
    CASE 
      WHEN tariff_reference_id ~ '^[A-Z]{2}-[A-Z]{4}-[0-9]+$' 
      THEN (regexp_match(tariff_reference_id, '-([0-9]+)$'))[1]::int
      ELSE 0
    END
  ), 0) + 1
  INTO next_sequence
  FROM tariffs
  WHERE carrier_id = NEW.carrier_id
    AND tariff_type = NEW.tariff_type;

  new_reference_id := tariff_type_prefix || '-' || carrier_scac || '-' || LPAD(next_sequence::text, 4, '0');

  NEW.tariff_reference_id := new_reference_id;

  RETURN NEW;
END;
$$;
