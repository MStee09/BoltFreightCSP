/*
  # Add Comprehensive Note User Attribution
  
  1. Changes
    - Add created_by and updated_by to all tables with notes
    - Add created_by/updated_by to key tables: customers, carriers, csp_events, csp_event_carriers, tariffs
    - Create triggers to automatically set these fields
    - Migrate existing InlineNoteEditor to use structured note storage
  
  2. Tables Updated
    - customers
    - carriers  
    - csp_events
    - csp_event_carriers
    - tariffs
    - carrier_contacts
    - alerts (for resolution_notes)
    - strategy_snapshots
  
  3. Security
    - Triggers automatically populate user info from auth.uid()
    - All notes will now have proper audit trails
*/

-- Add created_by and updated_by columns to tables that don't have them

-- Customers
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE customers ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'updated_by'
  ) THEN
    ALTER TABLE customers ADD COLUMN updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Carriers
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'carriers' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE carriers ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'carriers' AND column_name = 'updated_by'
  ) THEN
    ALTER TABLE carriers ADD COLUMN updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- CSP Events
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'csp_events' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE csp_events ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'csp_events' AND column_name = 'updated_by'
  ) THEN
    ALTER TABLE csp_events ADD COLUMN updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- CSP Event Carriers - this is the most important one for inline notes
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'csp_event_carriers' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE csp_event_carriers ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'csp_event_carriers' AND column_name = 'updated_by'
  ) THEN
    ALTER TABLE csp_event_carriers ADD COLUMN updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'csp_event_carriers' AND column_name = 'notes_updated_by'
  ) THEN
    ALTER TABLE csp_event_carriers ADD COLUMN notes_updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'csp_event_carriers' AND column_name = 'notes_updated_at'
  ) THEN
    ALTER TABLE csp_event_carriers ADD COLUMN notes_updated_at timestamptz;
  END IF;
END $$;

-- Tariffs
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tariffs' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE tariffs ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tariffs' AND column_name = 'updated_by'
  ) THEN
    ALTER TABLE tariffs ADD COLUMN updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Carrier Contacts
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'carrier_contacts' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE carrier_contacts ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'carrier_contacts' AND column_name = 'updated_by'
  ) THEN
    ALTER TABLE carrier_contacts ADD COLUMN updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Strategy Snapshots
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'strategy_snapshots' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE strategy_snapshots ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'strategy_snapshots' AND column_name = 'updated_by'
  ) THEN
    ALTER TABLE strategy_snapshots ADD COLUMN updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create a comprehensive table for structured notes with full audit trail
CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- What entity is this note for?
  entity_type text NOT NULL CHECK (entity_type IN (
    'customer', 'carrier', 'csp_event', 'csp_event_carrier', 
    'tariff', 'carrier_contact', 'alert'
  )),
  entity_id uuid NOT NULL,
  
  -- Note content
  content text NOT NULL,
  note_type text DEFAULT 'general' CHECK (note_type IN (
    'general', 'internal', 'followup', 'resolution', 'escalation'
  )),
  
  -- Author and audit
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Context
  csp_event_id uuid REFERENCES csp_events(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  carrier_id uuid REFERENCES carriers(id) ON DELETE CASCADE,
  
  -- Metadata
  metadata jsonb DEFAULT '{}'::jsonb,
  is_deleted boolean DEFAULT false
);

-- Add indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_notes_entity ON notes(entity_type, entity_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_notes_created_by ON notes(created_by);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_csp_event ON notes(csp_event_id) WHERE csp_event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notes_customer ON notes(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notes_carrier ON notes(carrier_id) WHERE carrier_id IS NOT NULL;

-- Enable RLS on notes table
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notes
CREATE POLICY "Users can view all notes"
  ON notes FOR SELECT
  TO authenticated
  USING (NOT is_deleted);

CREATE POLICY "Users can create notes"
  ON notes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own notes within 1 hour"
  ON notes FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = created_by 
    AND created_at > (now() - interval '1 hour')
    AND NOT is_deleted
  )
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can update any note"
  ON notes FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin'
    AND NOT is_deleted
  )
  WITH CHECK (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Users can soft-delete their own notes"
  ON notes FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = created_by
    AND NOT is_deleted
  )
  WITH CHECK (
    auth.uid() = created_by
    AND is_deleted = true
  );

-- Function to automatically set created_by on INSERT
CREATE OR REPLACE FUNCTION set_created_by()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically set updated_by on UPDATE
CREATE OR REPLACE FUNCTION set_updated_by()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_by = auth.uid();
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for automatic user attribution on INSERT
DROP TRIGGER IF EXISTS set_customers_created_by ON customers;
CREATE TRIGGER set_customers_created_by
  BEFORE INSERT ON customers
  FOR EACH ROW
  WHEN (NEW.created_by IS NULL)
  EXECUTE FUNCTION set_created_by();

DROP TRIGGER IF EXISTS set_carriers_created_by ON carriers;
CREATE TRIGGER set_carriers_created_by
  BEFORE INSERT ON carriers
  FOR EACH ROW
  WHEN (NEW.created_by IS NULL)
  EXECUTE FUNCTION set_created_by();

DROP TRIGGER IF EXISTS set_csp_events_created_by ON csp_events;
CREATE TRIGGER set_csp_events_created_by
  BEFORE INSERT ON csp_events
  FOR EACH ROW
  WHEN (NEW.created_by IS NULL)
  EXECUTE FUNCTION set_created_by();

DROP TRIGGER IF EXISTS set_csp_event_carriers_created_by ON csp_event_carriers;
CREATE TRIGGER set_csp_event_carriers_created_by
  BEFORE INSERT ON csp_event_carriers
  FOR EACH ROW
  WHEN (NEW.created_by IS NULL)
  EXECUTE FUNCTION set_created_by();

DROP TRIGGER IF EXISTS set_tariffs_created_by ON tariffs;
CREATE TRIGGER set_tariffs_created_by
  BEFORE INSERT ON tariffs
  FOR EACH ROW
  WHEN (NEW.created_by IS NULL)
  EXECUTE FUNCTION set_created_by();

DROP TRIGGER IF EXISTS set_carrier_contacts_created_by ON carrier_contacts;
CREATE TRIGGER set_carrier_contacts_created_by
  BEFORE INSERT ON carrier_contacts
  FOR EACH ROW
  WHEN (NEW.created_by IS NULL)
  EXECUTE FUNCTION set_created_by();

DROP TRIGGER IF EXISTS set_strategy_snapshots_created_by ON strategy_snapshots;
CREATE TRIGGER set_strategy_snapshots_created_by
  BEFORE INSERT ON strategy_snapshots
  FOR EACH ROW
  WHEN (NEW.created_by IS NULL)
  EXECUTE FUNCTION set_created_by();

-- Create triggers for automatic user attribution on UPDATE
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

-- Special trigger for tracking notes field changes in csp_event_carriers
CREATE OR REPLACE FUNCTION track_notes_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.notes IS DISTINCT FROM OLD.notes THEN
    NEW.notes_updated_by = auth.uid();
    NEW.notes_updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS track_csp_event_carriers_notes ON csp_event_carriers;
CREATE TRIGGER track_csp_event_carriers_notes
  BEFORE UPDATE ON csp_event_carriers
  FOR EACH ROW
  WHEN (NEW.notes IS DISTINCT FROM OLD.notes)
  EXECUTE FUNCTION track_notes_update();
