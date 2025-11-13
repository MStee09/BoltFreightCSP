/*
  # Create Tariff Families Table

  1. New Table
    - `tariff_families`
      - Explicit table for grouping related tariff versions
      - Identity: (customer_id, carrier_id, ownership_type) = unique family
      - Tracks active_version_id for quick lookups
      - Auto-generated display name

  2. Family Resolution Logic
    - One family per (customer, carrier, ownership) combination
    - All tariff versions in a family share the same customer/carrier/ownership
    - Only one tariff can be active per family at a time

  3. Migration of Existing Data
    - Backfill families for existing tariffs
    - Link tariffs to their resolved family

  4. Security
    - Enable RLS with standard policies
*/

-- Create tariff_families table
CREATE TABLE IF NOT EXISTS tariff_families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  carrier_id uuid REFERENCES carriers(id) ON DELETE CASCADE NOT NULL,
  ownership_type text NOT NULL DEFAULT 'rocket_csp',
  active_version_id uuid REFERENCES tariffs(id) ON DELETE SET NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE(customer_id, carrier_id, ownership_type)
);

ALTER TABLE tariff_families ENABLE ROW LEVEL SECURITY;

-- Add constraint for valid ownership types
ALTER TABLE tariff_families
  ADD CONSTRAINT tariff_families_ownership_type_check
  CHECK (ownership_type IN ('rocket_csp', 'customer_direct', 'rocket_blanket', 'priority1_blanket'));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tariff_families_customer
  ON tariff_families(customer_id);

CREATE INDEX IF NOT EXISTS idx_tariff_families_carrier
  ON tariff_families(carrier_id);

CREATE INDEX IF NOT EXISTS idx_tariff_families_ownership
  ON tariff_families(ownership_type);

CREATE INDEX IF NOT EXISTS idx_tariff_families_active_version
  ON tariff_families(active_version_id)
  WHERE active_version_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tariff_families_lookup
  ON tariff_families(customer_id, carrier_id, ownership_type);

-- RLS Policies
CREATE POLICY "Users can view tariff families"
  ON tariff_families FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert tariff families"
  ON tariff_families FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update tariff families"
  ON tariff_families FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete tariff families"
  ON tariff_families FOR DELETE
  TO authenticated
  USING (true);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_tariff_families_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER tariff_families_updated_at
  BEFORE UPDATE ON tariff_families
  FOR EACH ROW
  EXECUTE FUNCTION update_tariff_families_updated_at();

-- Function to resolve or create a tariff family
CREATE OR REPLACE FUNCTION resolve_tariff_family(
  p_customer_id uuid,
  p_carrier_id uuid,
  p_ownership_type text,
  p_created_by uuid DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_family_id uuid;
  v_customer_name text;
  v_carrier_name text;
  v_family_name text;
BEGIN
  -- Try to find existing family
  SELECT id INTO v_family_id
  FROM tariff_families
  WHERE customer_id = p_customer_id
    AND carrier_id = p_carrier_id
    AND ownership_type = p_ownership_type;

  -- If found, return it
  IF v_family_id IS NOT NULL THEN
    RETURN v_family_id;
  END IF;

  -- Otherwise, create new family
  -- Get customer and carrier names for display
  SELECT name INTO v_customer_name FROM customers WHERE id = p_customer_id;
  SELECT name INTO v_carrier_name FROM carriers WHERE id = p_carrier_id;

  -- Generate family name
  v_family_name := COALESCE(v_customer_name, 'Unknown') || ' - ' || COALESCE(v_carrier_name, 'Unknown');

  -- Insert new family
  INSERT INTO tariff_families (
    customer_id,
    carrier_id,
    ownership_type,
    name,
    created_by
  ) VALUES (
    p_customer_id,
    p_carrier_id,
    p_ownership_type,
    v_family_name,
    p_created_by
  )
  RETURNING id INTO v_family_id;

  RETURN v_family_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Backfill existing tariffs into families
DO $$
DECLARE
  v_tariff RECORD;
  v_family_id uuid;
BEGIN
  -- Only process tariffs that don't have a tariff_family_id yet
  FOR v_tariff IN
    SELECT id, customer_id, carrier_ids[1] as carrier_id, ownership_type, user_id
    FROM tariffs
    WHERE tariff_family_id IS NULL
      AND customer_id IS NOT NULL
      AND carrier_ids IS NOT NULL
      AND array_length(carrier_ids, 1) > 0
  LOOP
    -- Resolve or create family
    v_family_id := resolve_tariff_family(
      v_tariff.customer_id,
      v_tariff.carrier_id,
      COALESCE(v_tariff.ownership_type, 'rocket_csp'),
      v_tariff.user_id
    );

    -- Link tariff to family
    UPDATE tariffs
    SET tariff_family_id = v_family_id
    WHERE id = v_tariff.id;

    -- If this tariff is active, set it as the active version
    IF EXISTS (
      SELECT 1 FROM tariffs
      WHERE id = v_tariff.id AND status = 'active'
    ) THEN
      UPDATE tariff_families
      SET active_version_id = v_tariff.id
      WHERE id = v_family_id;
    END IF;
  END LOOP;
END $$;

-- Add comments
COMMENT ON TABLE tariff_families IS 'Groups related tariff versions by (customer, carrier, ownership). Only one active tariff per family.';
COMMENT ON COLUMN tariff_families.active_version_id IS 'Points to the currently active tariff in this family';
COMMENT ON FUNCTION resolve_tariff_family IS 'Returns existing family or creates new one for (customer, carrier, ownership) tuple';
