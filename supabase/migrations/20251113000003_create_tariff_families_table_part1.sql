/*
  # Create Tariff Families Table - Part 1

  1. New Table
    - `tariff_families`
      - Explicit table for grouping related tariff versions
      - Identity: (customer_id, carrier_id, ownership_type) = unique family
      - Tracks active_version_id for quick lookups

  2. Indexes and RLS
    - Performance indexes
    - Standard authenticated user policies
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
CREATE INDEX IF NOT EXISTS idx_tariff_families_customer ON tariff_families(customer_id);
CREATE INDEX IF NOT EXISTS idx_tariff_families_carrier ON tariff_families(carrier_id);
CREATE INDEX IF NOT EXISTS idx_tariff_families_ownership ON tariff_families(ownership_type);
CREATE INDEX IF NOT EXISTS idx_tariff_families_active_version ON tariff_families(active_version_id) WHERE active_version_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tariff_families_lookup ON tariff_families(customer_id, carrier_id, ownership_type);

-- RLS Policies
CREATE POLICY "Users can view tariff families" ON tariff_families FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert tariff families" ON tariff_families FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update tariff families" ON tariff_families FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Users can delete tariff families" ON tariff_families FOR DELETE TO authenticated USING (true);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_tariff_families_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER tariff_families_updated_at BEFORE UPDATE ON tariff_families FOR EACH ROW EXECUTE FUNCTION update_tariff_families_updated_at();

COMMENT ON TABLE tariff_families IS 'Groups related tariff versions by (customer, carrier, ownership). Only one active tariff per family.';
COMMENT ON COLUMN tariff_families.active_version_id IS 'Points to the currently active tariff in this family';
