/*
  # Fix set_updated_by Function Field Name

  1. Problem
    - The set_updated_by() function tries to set NEW.updated_at
    - But the tariffs table uses updated_date, not updated_at
    - This causes "record new has no field updated_at" error on every tariff update

  2. Solution
    - Update the function to use updated_date instead of updated_at

  3. Security
    - No changes to RLS policies
*/

-- Fix the set_updated_by function to use correct field name
CREATE OR REPLACE FUNCTION set_updated_by()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_by := auth.uid();
  NEW.updated_date := now();
  RETURN NEW;
END;
$$;