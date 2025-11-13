/*
  # Add Email Threading Per Carrier & Tentative Tariff Dates

  1. Email Activities Enhancement
    - Add csp_event_carrier_id to link emails to specific carrier conversations
    - Enables per-carrier thread filtering within a CSP event
    - Index for performance

  2. Tariff Tentative Dates
    - Add effective_date_tentative and expiry_date_tentative
    - Used for proposed tariffs before activation
    - On activation, confirmed dates go into effective_date/expiry_date

  3. Tariff Family Support
    - Add ownership_type to CSP events (inherited by tariffs)
    - Used in family resolution logic: (customer_id, carrier_id, ownership_type)
*/

-- Add csp_event_carrier_id to email_activities
ALTER TABLE email_activities
  ADD COLUMN IF NOT EXISTS csp_event_carrier_id uuid REFERENCES csp_event_carriers(id) ON DELETE SET NULL;

-- Add index for carrier-specific email filtering
CREATE INDEX IF NOT EXISTS idx_email_activities_csp_event_carrier
  ON email_activities(csp_event_carrier_id)
  WHERE csp_event_carrier_id IS NOT NULL;

-- Add tentative date fields to tariffs
ALTER TABLE tariffs
  ADD COLUMN IF NOT EXISTS effective_date_tentative date,
  ADD COLUMN IF NOT EXISTS expiry_date_tentative date,
  ADD COLUMN IF NOT EXISTS activated_at timestamptz,
  ADD COLUMN IF NOT EXISTS activated_by uuid REFERENCES auth.users(id);

-- Add ownership_type to csp_events if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'csp_events'
    AND column_name = 'ownership_type'
  ) THEN
    ALTER TABLE csp_events
      ADD COLUMN ownership_type text DEFAULT 'rocket_csp';
  END IF;
END $$;

-- Add constraint for valid ownership types
DO $$
BEGIN
  ALTER TABLE csp_events DROP CONSTRAINT IF EXISTS csp_events_ownership_type_check;
  ALTER TABLE csp_events
    ADD CONSTRAINT csp_events_ownership_type_check
    CHECK (ownership_type IN ('rocket_csp', 'customer_direct', 'rocket_blanket', 'priority1_blanket'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_tariffs_activated_by
  ON tariffs(activated_by)
  WHERE activated_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_csp_events_ownership_type
  ON csp_events(ownership_type);

-- Add comments
COMMENT ON COLUMN email_activities.csp_event_carrier_id IS 'Links email to specific carrier within a CSP event for per-carrier threading';
COMMENT ON COLUMN tariffs.effective_date_tentative IS 'Tentative effective date for proposed tariffs (confirmed on activation)';
COMMENT ON COLUMN tariffs.expiry_date_tentative IS 'Tentative expiry date for proposed tariffs (confirmed on activation)';
COMMENT ON COLUMN tariffs.activated_at IS 'Timestamp when tariff was activated from proposed status';
COMMENT ON COLUMN tariffs.activated_by IS 'User who activated the tariff';
COMMENT ON COLUMN csp_events.ownership_type IS 'Inherited by tariffs for family resolution: rocket_csp, customer_direct, rocket_blanket, priority1_blanket';
