/*
  # Create Strategy Snapshots Table for Trend Tracking

  1. New Table: `strategy_snapshots`
    - Stores point-in-time snapshots of brokerage vs customer direct metrics
    - Enables trend tracking over time without requiring re-uploads
    - Supports both customer-specific and company-wide analysis
    - Includes mode-specific breakdowns

  2. Fields
    - `id` - Unique identifier
    - `snapshot_date` - Date/time of the snapshot
    - `customer_id` - Optional: specific customer (null = company-wide)
    - `csp_event_id` - Optional: related CSP event
    - `total_spend` - Total spend in snapshot period
    - `total_shipments` - Total shipment count
    - `brokerage_spend` - Total brokerage carrier spend
    - `brokerage_percentage` - Percentage of spend through brokerage
    - `customer_direct_spend` - Total customer direct carrier spend
    - `customer_direct_percentage` - Percentage through customer direct
    - `mode_breakdown` - JSONB: spend/shipments by mode and carrier type
    - `carrier_breakdown` - JSONB: detailed carrier-level data
    - `lane_count` - Number of unique lanes
    - `top_brokerage_carriers` - JSONB: top brokerage carriers in this snapshot
    - `top_customer_direct_carriers` - JSONB: top customer direct carriers
    - `created_by` - User who created the snapshot
    - `notes` - Optional notes about this snapshot

  3. Security
    - Enable RLS
    - Authenticated users can view all snapshots
    - Only authenticated users can create snapshots
*/

-- Create strategy_snapshots table
CREATE TABLE IF NOT EXISTS strategy_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date timestamptz NOT NULL DEFAULT now(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  csp_event_id uuid REFERENCES csp_events(id) ON DELETE CASCADE,
  
  -- Overall metrics
  total_spend numeric DEFAULT 0,
  total_shipments integer DEFAULT 0,
  lane_count integer DEFAULT 0,
  
  -- Brokerage vs Customer Direct
  brokerage_spend numeric DEFAULT 0,
  brokerage_percentage numeric DEFAULT 0,
  brokerage_shipments integer DEFAULT 0,
  customer_direct_spend numeric DEFAULT 0,
  customer_direct_percentage numeric DEFAULT 0,
  customer_direct_shipments integer DEFAULT 0,
  
  -- Detailed breakdowns (JSONB for flexibility)
  mode_breakdown jsonb DEFAULT '{}',
  carrier_breakdown jsonb DEFAULT '[]',
  top_brokerage_carriers jsonb DEFAULT '[]',
  top_customer_direct_carriers jsonb DEFAULT '[]',
  
  -- Metadata
  created_by uuid REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now(),
  notes text,
  
  -- Ensure snapshots are ordered by date
  CONSTRAINT valid_percentages CHECK (
    brokerage_percentage >= 0 AND 
    brokerage_percentage <= 100 AND
    customer_direct_percentage >= 0 AND
    customer_direct_percentage <= 100
  )
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_strategy_snapshots_date ON strategy_snapshots(snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_strategy_snapshots_customer ON strategy_snapshots(customer_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_strategy_snapshots_csp_event ON strategy_snapshots(csp_event_id);
CREATE INDEX IF NOT EXISTS idx_strategy_snapshots_created_by ON strategy_snapshots(created_by);

-- Enable RLS
ALTER TABLE strategy_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view all snapshots"
  ON strategy_snapshots
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create snapshots"
  ON strategy_snapshots
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own snapshots"
  ON strategy_snapshots
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete their own snapshots"
  ON strategy_snapshots
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Add helpful comments
COMMENT ON TABLE strategy_snapshots IS 'Point-in-time snapshots of brokerage vs customer direct spend metrics for trend analysis';
COMMENT ON COLUMN strategy_snapshots.mode_breakdown IS 'JSON object with mode-specific breakdowns: {LTL: {brokerage_spend, customer_direct_spend, ...}, Parcel: {...}}';
COMMENT ON COLUMN strategy_snapshots.carrier_breakdown IS 'JSON array of carrier-level data with spend, shipments, carrier_type for each carrier';
COMMENT ON COLUMN strategy_snapshots.top_brokerage_carriers IS 'JSON array of top brokerage carriers: [{carrier, spend, shipments, percentage}, ...]';
COMMENT ON COLUMN strategy_snapshots.top_customer_direct_carriers IS 'JSON array of top customer direct carriers: [{carrier, spend, shipments, percentage}, ...]';