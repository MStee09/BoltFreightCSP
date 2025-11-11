/*
  # Fix Email Activities Foreign Key

  1. Changes
    - Drop incorrect foreign key constraint pointing to calendar_events
    - Add correct foreign key constraint pointing to csp_events
    
  2. Reason
    - The csp_event_id column was incorrectly constrained to calendar_events table
    - It should reference csp_events table instead
*/

-- Drop the incorrect foreign key constraint
ALTER TABLE email_activities 
DROP CONSTRAINT IF EXISTS email_activities_csp_event_id_fkey;

-- Add the correct foreign key constraint
ALTER TABLE email_activities 
ADD CONSTRAINT email_activities_csp_event_id_fkey 
FOREIGN KEY (csp_event_id) 
REFERENCES csp_events(id) 
ON DELETE SET NULL;
