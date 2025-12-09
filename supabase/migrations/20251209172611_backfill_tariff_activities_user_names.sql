/*
  # Backfill user names in tariff_activities table

  1. Changes
    - Update all tariff_activities with missing user_name to include the full_name from user_profiles
    - This ensures all activities show who performed them

  2. Security
    - No security changes
*/

-- Backfill user_name for all activities with a created_by but missing user_name
UPDATE tariff_activities ta
SET user_name = up.full_name
FROM user_profiles up
WHERE ta.created_by = up.id
  AND ta.created_by IS NOT NULL
  AND (ta.user_name IS NULL OR ta.user_name = '');

-- Create function to automatically set user_name on insert/update
CREATE OR REPLACE FUNCTION set_activity_user_name()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Automatically set user_name from user_profiles when created_by is set
  IF NEW.created_by IS NOT NULL AND (NEW.user_name IS NULL OR NEW.user_name = '') THEN
    SELECT full_name INTO NEW.user_name
    FROM user_profiles
    WHERE id = NEW.created_by;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add trigger to tariff_activities
DROP TRIGGER IF EXISTS set_tariff_activity_user_name ON tariff_activities;
CREATE TRIGGER set_tariff_activity_user_name
  BEFORE INSERT OR UPDATE ON tariff_activities
  FOR EACH ROW
  EXECUTE FUNCTION set_activity_user_name();
