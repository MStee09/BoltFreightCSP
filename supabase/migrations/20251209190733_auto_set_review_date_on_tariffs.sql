/*
  # Auto-set review_date on tariffs

  1. Changes
    - Create a trigger function to automatically set review_date to 30 days before expiry_date
    - This ensures review_date is always populated when a tariff is created or updated
    - User can still manually override the auto-set value

  2. Security
    - No security changes
*/

-- Create function to auto-set review_date
CREATE OR REPLACE FUNCTION auto_set_review_date()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only auto-set review_date if it's not already set and expiry_date exists
  IF NEW.review_date IS NULL AND NEW.expiry_date IS NOT NULL THEN
    NEW.review_date := NEW.expiry_date - INTERVAL '30 days';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on tariffs table
DROP TRIGGER IF EXISTS set_tariff_review_date ON tariffs;
CREATE TRIGGER set_tariff_review_date
  BEFORE INSERT OR UPDATE ON tariffs
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_review_date();

-- Backfill existing tariffs that have expiry_date but no review_date
UPDATE tariffs
SET review_date = expiry_date - INTERVAL '30 days'
WHERE expiry_date IS NOT NULL 
  AND review_date IS NULL;
