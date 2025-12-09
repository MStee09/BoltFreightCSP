/*
  # Add tariff_family_id to tariff_activities table

  1. Changes
    - Add tariff_family_id column to tariff_activities table to support family-level activity tracking
    - Add index for better query performance
    - Create trigger to auto-populate tariff_family_id from parent tariff

  2. Security
    - No RLS changes needed (inherits existing policies)
*/

-- Add tariff_family_id column to tariff_activities
ALTER TABLE tariff_activities
ADD COLUMN IF NOT EXISTS tariff_family_id uuid;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_tariff_activities_family_id
ON tariff_activities(tariff_family_id);

-- Create trigger function to auto-populate tariff_family_id
CREATE OR REPLACE FUNCTION set_tariff_activity_family_id()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Get tariff_family_id from the related tariff
  SELECT tariff_family_id INTO NEW.tariff_family_id
  FROM tariffs
  WHERE id = NEW.tariff_id;

  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_set_tariff_activity_family_id ON tariff_activities;
CREATE TRIGGER trigger_set_tariff_activity_family_id
  BEFORE INSERT ON tariff_activities
  FOR EACH ROW
  EXECUTE FUNCTION set_tariff_activity_family_id();

-- Backfill existing activities with tariff_family_id
UPDATE tariff_activities ta
SET tariff_family_id = t.tariff_family_id
FROM tariffs t
WHERE ta.tariff_id = t.id
  AND ta.tariff_family_id IS NULL;