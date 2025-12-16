/*
  # Create KPI System for Admin Analytics

  1. New Tables
    - `kpi_definitions`
      - Stores KPI configurations (targets, types, measurement periods)
      - Admin-configurable KPI definitions
    - `kpi_tracking`
      - Historical KPI values over time
      - Tracks actual performance vs targets
    - `kpi_predictions`
      - AI-generated forecasts and insights
      - Likelihood scores and recommendations

  2. Security
    - Enable RLS on all tables
    - Admin-only access for all KPI tables
    - Restricts KPI visibility to admin role only

  3. Indexes
    - Optimized for time-series queries
    - Fast lookups by KPI and date range
*/

-- KPI Definitions Table
CREATE TABLE IF NOT EXISTS kpi_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  kpi_type text NOT NULL CHECK (kpi_type IN (
    'win_rate',
    'avg_cycle_time',
    'stage_conversion',
    'email_response_rate',
    'deals_closed',
    'revenue_target',
    'activity_volume',
    'carrier_engagement',
    'customer_satisfaction',
    'custom'
  )),
  target_value numeric NOT NULL,
  measurement_period text NOT NULL CHECK (measurement_period IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  calculation_method text NOT NULL,
  unit text NOT NULL DEFAULT 'number',
  threshold_green numeric NOT NULL,
  threshold_yellow numeric NOT NULL,
  threshold_red numeric NOT NULL,
  is_active boolean DEFAULT true,
  assigned_to_team text,
  assigned_to_user_id uuid REFERENCES user_profiles(id),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES user_profiles(id)
);

-- KPI Tracking Table (Historical Values)
CREATE TABLE IF NOT EXISTS kpi_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_id uuid NOT NULL REFERENCES kpi_definitions(id) ON DELETE CASCADE,
  recorded_at timestamptz DEFAULT now(),
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  actual_value numeric NOT NULL,
  target_value numeric NOT NULL,
  percentage_of_target numeric GENERATED ALWAYS AS (
    CASE
      WHEN target_value > 0 THEN (actual_value / target_value * 100)
      ELSE 0
    END
  ) STORED,
  status text NOT NULL CHECK (status IN ('on_track', 'at_risk', 'off_track', 'exceeded')),
  contributing_data jsonb DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- KPI Predictions Table (AI Analysis)
CREATE TABLE IF NOT EXISTS kpi_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_id uuid NOT NULL REFERENCES kpi_definitions(id) ON DELETE CASCADE,
  prediction_date timestamptz DEFAULT now(),
  target_period_end timestamptz NOT NULL,
  predicted_value numeric NOT NULL,
  confidence_score numeric NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
  likelihood_of_meeting_target numeric NOT NULL CHECK (likelihood_of_meeting_target >= 0 AND likelihood_of_meeting_target <= 100),
  key_factors jsonb DEFAULT '[]'::jsonb,
  positive_indicators jsonb DEFAULT '[]'::jsonb,
  negative_indicators jsonb DEFAULT '[]'::jsonb,
  recommendations jsonb DEFAULT '[]'::jsonb,
  trend_direction text CHECK (trend_direction IN ('improving', 'stable', 'declining')),
  ai_analysis_summary text,
  data_quality_score numeric CHECK (data_quality_score >= 0 AND data_quality_score <= 100),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE kpi_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_predictions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for kpi_definitions (Admin Only)
CREATE POLICY "Admins can view KPI definitions"
  ON kpi_definitions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can create KPI definitions"
  ON kpi_definitions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update KPI definitions"
  ON kpi_definitions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete KPI definitions"
  ON kpi_definitions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- RLS Policies for kpi_tracking (Admin Only)
CREATE POLICY "Admins can view KPI tracking"
  ON kpi_tracking FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert KPI tracking"
  ON kpi_tracking FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update KPI tracking"
  ON kpi_tracking FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- RLS Policies for kpi_predictions (Admin Only)
CREATE POLICY "Admins can view KPI predictions"
  ON kpi_predictions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert KPI predictions"
  ON kpi_predictions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_kpi_definitions_active ON kpi_definitions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_kpi_definitions_type ON kpi_definitions(kpi_type);
CREATE INDEX IF NOT EXISTS idx_kpi_tracking_kpi_id ON kpi_tracking(kpi_id);
CREATE INDEX IF NOT EXISTS idx_kpi_tracking_period ON kpi_tracking(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_kpi_tracking_recorded_at ON kpi_tracking(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_kpi_predictions_kpi_id ON kpi_predictions(kpi_id);
CREATE INDEX IF NOT EXISTS idx_kpi_predictions_date ON kpi_predictions(prediction_date DESC);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_kpi_definitions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_kpi_definitions_updated_at
  BEFORE UPDATE ON kpi_definitions
  FOR EACH ROW
  EXECUTE FUNCTION update_kpi_definitions_updated_at();