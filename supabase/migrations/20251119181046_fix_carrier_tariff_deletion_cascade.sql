/*
  # Fix Carrier and Tariff Deletion - Add Cascade Deletes
  
  1. Changes
    - Update foreign key constraints for carriers and tariffs
    - When a carrier is deleted:
      - Carrier contacts: CASCADE
      - CSP event carriers: CASCADE
      - Email drafts: CASCADE
      - Email threads: CASCADE
      - Tariffs: CASCADE
      - Email activities: SET NULL (preserve email history)
    - When a tariff is deleted:
      - Fix superseded_by_id to allow deletion
  
  2. Safety
    - Maintains referential integrity
    - Preserves important historical data where appropriate
*/

-- Carrier Contacts
ALTER TABLE carrier_contacts 
DROP CONSTRAINT IF EXISTS carrier_contacts_carrier_id_fkey;

ALTER TABLE carrier_contacts 
ADD CONSTRAINT carrier_contacts_carrier_id_fkey 
FOREIGN KEY (carrier_id) 
REFERENCES carriers(id) 
ON DELETE CASCADE;

-- CSP Event Carriers
ALTER TABLE csp_event_carriers 
DROP CONSTRAINT IF EXISTS csp_event_carriers_carrier_id_fkey;

ALTER TABLE csp_event_carriers 
ADD CONSTRAINT csp_event_carriers_carrier_id_fkey 
FOREIGN KEY (carrier_id) 
REFERENCES carriers(id) 
ON DELETE CASCADE;

-- Email Activities - SET NULL to preserve email history
ALTER TABLE email_activities 
DROP CONSTRAINT IF EXISTS email_activities_carrier_id_fkey;

ALTER TABLE email_activities 
ADD CONSTRAINT email_activities_carrier_id_fkey 
FOREIGN KEY (carrier_id) 
REFERENCES carriers(id) 
ON DELETE SET NULL;

-- Email Drafts for Carriers
ALTER TABLE email_drafts 
DROP CONSTRAINT IF EXISTS email_drafts_carrier_id_fkey;

ALTER TABLE email_drafts 
ADD CONSTRAINT email_drafts_carrier_id_fkey 
FOREIGN KEY (carrier_id) 
REFERENCES carriers(id) 
ON DELETE CASCADE;

-- Email Threads for Carriers
ALTER TABLE email_threads 
DROP CONSTRAINT IF EXISTS email_threads_carrier_id_fkey;

ALTER TABLE email_threads 
ADD CONSTRAINT email_threads_carrier_id_fkey 
FOREIGN KEY (carrier_id) 
REFERENCES carriers(id) 
ON DELETE CASCADE;

-- Tariffs - CASCADE when carrier is deleted
ALTER TABLE tariffs 
DROP CONSTRAINT IF EXISTS tariffs_carrier_id_fkey;

ALTER TABLE tariffs 
ADD CONSTRAINT tariffs_carrier_id_fkey 
FOREIGN KEY (carrier_id) 
REFERENCES carriers(id) 
ON DELETE CASCADE;

-- Fix tariff superseded_by_id to allow deletion
ALTER TABLE tariffs 
DROP CONSTRAINT IF EXISTS tariffs_superseded_by_id_fkey;

ALTER TABLE tariffs 
ADD CONSTRAINT tariffs_superseded_by_id_fkey 
FOREIGN KEY (superseded_by_id) 
REFERENCES tariffs(id) 
ON DELETE SET NULL;

-- Documents - only update if carrier_id column exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documents' 
    AND column_name = 'carrier_id'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE documents 
    DROP CONSTRAINT IF EXISTS documents_carrier_id_fkey;
    
    ALTER TABLE documents 
    ADD CONSTRAINT documents_carrier_id_fkey 
    FOREIGN KEY (carrier_id) 
    REFERENCES carriers(id) 
    ON DELETE CASCADE;
  END IF;
END $$;

-- User Pins for Carriers
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_pins' 
    AND column_name = 'carrier_id'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE user_pins 
    DROP CONSTRAINT IF EXISTS user_pins_carrier_id_fkey;
    
    ALTER TABLE user_pins 
    ADD CONSTRAINT user_pins_carrier_id_fkey 
    FOREIGN KEY (carrier_id) 
    REFERENCES carriers(id) 
    ON DELETE CASCADE;
  END IF;
END $$;

-- User Pins for Tariffs
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_pins' 
    AND column_name = 'tariff_id'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE user_pins 
    DROP CONSTRAINT IF EXISTS user_pins_tariff_id_fkey;
    
    ALTER TABLE user_pins 
    ADD CONSTRAINT user_pins_tariff_id_fkey 
    FOREIGN KEY (tariff_id) 
    REFERENCES tariffs(id) 
    ON DELETE CASCADE;
  END IF;
END $$;
