/*
  # Fix user names in tariff_activities to use first_name + last_name

  1. Changes
    - Update all tariff_activities to use first_name + last_name instead of full_name (which contains emails)
    - Update the trigger function to properly set user names

  2. Security
    - No security changes
*/

-- Backfill user_name using first_name and last_name
UPDATE tariff_activities ta
SET user_name = TRIM(up.first_name || ' ' || up.last_name)
FROM user_profiles up
WHERE ta.created_by = up.id
  AND ta.created_by IS NOT NULL;

-- Update the function to use first_name + last_name
CREATE OR REPLACE FUNCTION set_activity_user_name()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Automatically set user_name from user_profiles when created_by is set
  IF NEW.created_by IS NOT NULL THEN
    SELECT TRIM(first_name || ' ' || last_name) INTO NEW.user_name
    FROM user_profiles
    WHERE id = NEW.created_by;
  END IF;
  
  RETURN NEW;
END;
$$;
