/*
  # Fix Customer Deletion - Add Cascade Deletes
  
  1. Changes
    - Update foreign key constraints to cascade deletes for customers
    - When a customer is deleted, automatically delete or set null on related records
    - calendar_events: CASCADE
    - csp_stage_history: SET NULL (historical record)
    - freightops_thread_tokens: SET NULL (tracking data)
  
  2. Safety
    - Uses CASCADE delete to maintain referential integrity
    - Uses SET NULL for historical/tracking data that should be preserved
*/

-- Calendar Events - CASCADE (delete events when customer is deleted)
ALTER TABLE calendar_events 
DROP CONSTRAINT IF EXISTS calendar_events_customer_id_fkey;

ALTER TABLE calendar_events 
ADD CONSTRAINT calendar_events_customer_id_fkey 
FOREIGN KEY (customer_id) 
REFERENCES customers(id) 
ON DELETE CASCADE;

-- CSP Stage History already has SET NULL, but let's ensure it's correct
ALTER TABLE csp_stage_history 
DROP CONSTRAINT IF EXISTS csp_stage_history_customer_id_fkey;

ALTER TABLE csp_stage_history 
ADD CONSTRAINT csp_stage_history_customer_id_fkey 
FOREIGN KEY (customer_id) 
REFERENCES customers(id) 
ON DELETE SET NULL;

-- Freightops Thread Tokens already has SET NULL, ensure it's correct
ALTER TABLE freightops_thread_tokens 
DROP CONSTRAINT IF EXISTS freightops_thread_tokens_customer_id_fkey;

ALTER TABLE freightops_thread_tokens 
ADD CONSTRAINT freightops_thread_tokens_customer_id_fkey 
FOREIGN KEY (customer_id) 
REFERENCES customers(id) 
ON DELETE SET NULL;

-- User Pins (if exists)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_pins' 
    AND column_name = 'customer_id'
  ) THEN
    ALTER TABLE user_pins 
    DROP CONSTRAINT IF EXISTS user_pins_customer_id_fkey;
    
    ALTER TABLE user_pins 
    ADD CONSTRAINT user_pins_customer_id_fkey 
    FOREIGN KEY (customer_id) 
    REFERENCES customers(id) 
    ON DELETE CASCADE;
  END IF;
END $$;
