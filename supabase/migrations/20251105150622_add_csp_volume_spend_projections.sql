/*
  # Add CSP Volume and Spend Projections
  
  1. New Columns
    - `total_shipments` (integer) - Total number of shipments in the dataset/timeframe
    - `data_timeframe_months` (integer) - How many months of data we're looking at
    - `data_start_date` (date) - Start date of the data period
    - `data_end_date` (date) - End date of the data period
    - `projected_monthly_shipments` (numeric) - Calculated/projected shipments per month
    - `projected_annual_shipments` (numeric) - Projected shipments per year
    - `projected_monthly_spend` (numeric) - Projected spend per month
    - `projected_annual_spend` (numeric) - Projected annual spend
    - `projected_monthly_revenue` (numeric) - Projected revenue per month
    - `projected_annual_revenue` (numeric) - Projected annual revenue
    - `minimum_annual_spend_threshold` (numeric) - Minimum spend carriers require
    
  2. Purpose
    - Allow tracking of shipment volumes for CSP negotiations
    - Project annual spend to determine if carriers will participate
    - Help prioritize CSPs based on spend thresholds
*/

-- Add volume and spend projection columns to csp_events
ALTER TABLE csp_events
  ADD COLUMN IF NOT EXISTS total_shipments integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS data_timeframe_months integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS data_start_date date,
  ADD COLUMN IF NOT EXISTS data_end_date date,
  ADD COLUMN IF NOT EXISTS projected_monthly_shipments numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS projected_annual_shipments numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS projected_monthly_spend numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS projected_annual_spend numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS projected_monthly_revenue numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS projected_annual_revenue numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS minimum_annual_spend_threshold numeric(12,2) DEFAULT 0;

-- Add helpful comment
COMMENT ON COLUMN csp_events.total_shipments IS 'Total number of shipments in the analyzed dataset';
COMMENT ON COLUMN csp_events.data_timeframe_months IS 'Number of months of historical data analyzed';
COMMENT ON COLUMN csp_events.projected_annual_spend IS 'Projected annual spend - used to qualify carriers';
COMMENT ON COLUMN csp_events.minimum_annual_spend_threshold IS 'Minimum annual spend required by carriers to participate';
