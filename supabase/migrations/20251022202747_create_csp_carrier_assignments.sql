/*
  # Create CSP Event Carrier Assignments and Carrier Contacts

  1. New Tables
    - `csp_event_carriers`
      - Junction table for many-to-many relationship between CSP events and carriers
      - `id` (uuid, primary key)
      - `csp_event_id` (uuid, foreign key to csp_events)
      - `carrier_id` (uuid, foreign key to carriers)
      - `status` (text) - invited, responded, awarded, declined
      - `invited_date` (timestamptz)
      - `response_date` (timestamptz)
      - `notes` (text)
      - `created_date` (timestamptz)
      - `updated_date` (timestamptz)
      - `user_id` (uuid)

    - `carrier_contacts`
      - Multiple contacts per carrier
      - `id` (uuid, primary key)
      - `carrier_id` (uuid, foreign key to carriers)
      - `contact_type` (text) - primary, sales, billing, operations
      - `name` (text)
      - `email` (text)
      - `phone` (text)
      - `title` (text)
      - `is_primary` (boolean)
      - `notes` (text)
      - `created_date` (timestamptz)
      - `updated_date` (timestamptz)
      - `user_id` (uuid)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

-- Create csp_event_carriers junction table
CREATE TABLE IF NOT EXISTS csp_event_carriers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  csp_event_id uuid REFERENCES csp_events(id) ON DELETE CASCADE NOT NULL,
  carrier_id uuid REFERENCES carriers(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'invited',
  invited_date timestamptz DEFAULT now(),
  response_date timestamptz,
  notes text,
  created_date timestamptz DEFAULT now(),
  updated_date timestamptz DEFAULT now(),
  user_id uuid,
  UNIQUE(csp_event_id, carrier_id)
);

ALTER TABLE csp_event_carriers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view csp event carriers"
  ON csp_event_carriers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert csp event carriers"
  ON csp_event_carriers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update csp event carriers"
  ON csp_event_carriers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete csp event carriers"
  ON csp_event_carriers FOR DELETE
  TO authenticated
  USING (true);

-- Create carrier_contacts table
CREATE TABLE IF NOT EXISTS carrier_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id uuid REFERENCES carriers(id) ON DELETE CASCADE NOT NULL,
  contact_type text DEFAULT 'primary',
  name text NOT NULL,
  email text,
  phone text,
  title text,
  is_primary boolean DEFAULT false,
  notes text,
  created_date timestamptz DEFAULT now(),
  updated_date timestamptz DEFAULT now(),
  user_id uuid
);

ALTER TABLE carrier_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view carrier contacts"
  ON carrier_contacts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert carrier contacts"
  ON carrier_contacts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update carrier contacts"
  ON carrier_contacts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete carrier contacts"
  ON carrier_contacts FOR DELETE
  TO authenticated
  USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_csp_event_carriers_csp_event ON csp_event_carriers(csp_event_id);
CREATE INDEX IF NOT EXISTS idx_csp_event_carriers_carrier ON csp_event_carriers(carrier_id);
CREATE INDEX IF NOT EXISTS idx_carrier_contacts_carrier ON carrier_contacts(carrier_id);
CREATE INDEX IF NOT EXISTS idx_carrier_contacts_primary ON carrier_contacts(carrier_id, is_primary) WHERE is_primary = true;

-- Create trigger to update updated_date
CREATE OR REPLACE FUNCTION update_csp_event_carriers_updated_date()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_date = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER csp_event_carriers_updated_date
  BEFORE UPDATE ON csp_event_carriers
  FOR EACH ROW
  EXECUTE FUNCTION update_csp_event_carriers_updated_date();

CREATE OR REPLACE FUNCTION update_carrier_contacts_updated_date()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_date = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER carrier_contacts_updated_date
  BEFORE UPDATE ON carrier_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_carrier_contacts_updated_date();