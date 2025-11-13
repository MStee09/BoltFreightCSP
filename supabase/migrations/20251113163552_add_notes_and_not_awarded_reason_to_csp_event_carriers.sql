/*
  # Add Notes and Not Awarded Reason to CSP Event Carriers

  1. Changes
    - Add `notes` text field for freeform notes on carrier assignments
    - Add `not_awarded_reason` text field for capturing rejection reasons
    - Add `latest_note` text field for quick display of most recent note

  2. Notes
    - Notes are primarily activity-based, but latest_note provides quick access
    - not_awarded_reason is shown on card when status='not_awarded'
*/

-- Add notes fields
ALTER TABLE csp_event_carriers 
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS not_awarded_reason text,
ADD COLUMN IF NOT EXISTS latest_note text;

-- Create index for faster note queries
CREATE INDEX IF NOT EXISTS idx_csp_event_carriers_notes 
ON csp_event_carriers(id) 
WHERE notes IS NOT NULL;

-- Create index for not_awarded_reason lookups
CREATE INDEX IF NOT EXISTS idx_csp_event_carriers_not_awarded_reason 
ON csp_event_carriers(id) 
WHERE not_awarded_reason IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN csp_event_carriers.notes IS 'Freeform notes about this carrier assignment';
COMMENT ON COLUMN csp_event_carriers.not_awarded_reason IS 'Required reason when status is set to not_awarded';
COMMENT ON COLUMN csp_event_carriers.latest_note IS 'Quick display of most recent note from activity timeline';
