/*
  # Fix updated_by Trigger Field Names
  
  1. Issue
    - The set_updated_by() function assumes all tables have 'updated_at'
    - The tariffs table has 'updated_date' instead
    - This causes errors when updating tariffs
  
  2. Solution
    - Update the function to handle both 'updated_at' and 'updated_date'
    - Check which column exists and use the appropriate one
  
  3. Safety
    - Function remains SECURITY DEFINER
    - Maintains existing functionality for tables with updated_at
*/

-- Drop the old function
DROP FUNCTION IF EXISTS set_updated_by() CASCADE;

-- Create improved function that handles both updated_at and updated_date
CREATE OR REPLACE FUNCTION set_updated_by()
RETURNS TRIGGER AS $$
BEGIN
  -- Set updated_by to current user
  NEW.updated_by = auth.uid();
  
  -- Set the timestamp field - check which one exists
  IF TG_TABLE_NAME = 'tariffs' THEN
    -- Tariffs use updated_date
    NEW.updated_date = now();
  ELSE
    -- Most other tables use updated_at
    IF EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_name = TG_TABLE_NAME 
      AND column_name = 'updated_at'
      AND table_schema = TG_TABLE_SCHEMA
    ) THEN
      NEW.updated_at = now();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate all the triggers that use this function
DROP TRIGGER IF EXISTS set_customers_updated_by ON customers;
CREATE TRIGGER set_customers_updated_by
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_by();

DROP TRIGGER IF EXISTS set_carriers_updated_by ON carriers;
CREATE TRIGGER set_carriers_updated_by
  BEFORE UPDATE ON carriers
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_by();

DROP TRIGGER IF EXISTS set_csp_events_updated_by ON csp_events;
CREATE TRIGGER set_csp_events_updated_by
  BEFORE UPDATE ON csp_events
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_by();

DROP TRIGGER IF EXISTS set_csp_event_carriers_updated_by ON csp_event_carriers;
CREATE TRIGGER set_csp_event_carriers_updated_by
  BEFORE UPDATE ON csp_event_carriers
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_by();

DROP TRIGGER IF EXISTS set_tariffs_updated_by ON tariffs;
CREATE TRIGGER set_tariffs_updated_by
  BEFORE UPDATE ON tariffs
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_by();

DROP TRIGGER IF EXISTS set_carrier_contacts_updated_by ON carrier_contacts;
CREATE TRIGGER set_carrier_contacts_updated_by
  BEFORE UPDATE ON carrier_contacts
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_by();

DROP TRIGGER IF EXISTS set_strategy_snapshots_updated_by ON strategy_snapshots;
CREATE TRIGGER set_strategy_snapshots_updated_by
  BEFORE UPDATE ON strategy_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_by();
