/*
  # Fix Carrier Portal URL Sync Trigger

  1. Problem
    - The sync_carrier_portal_url_to_tariffs() trigger was referencing NEW.carrier_portal_url
    - But the carriers table column is actually named portal_login_url
    - This caused carrier updates to fail with error "record 'new' has no field 'carrier_portal_url'"

  2. Solution
    - Update the trigger function to reference the correct column name: NEW.portal_login_url
    - Also add a check to only update if the portal_login_url actually changed (for performance)

  3. Security
    - No changes to RLS policies
    - Function remains SECURITY DEFINER with search_path = public
*/

-- Fix the sync_carrier_portal_url_to_tariffs function
CREATE OR REPLACE FUNCTION sync_carrier_portal_url_to_tariffs()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only update if portal_login_url changed
  IF NEW.portal_login_url IS DISTINCT FROM OLD.portal_login_url THEN
    UPDATE tariffs
    SET carrier_portal_url = NEW.portal_login_url
    WHERE carrier_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;
