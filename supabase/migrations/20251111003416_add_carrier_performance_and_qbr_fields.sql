/*
  # Add Carrier Performance Metrics and QBR Fields

  ## Overview
  Adds performance tracking fields and QBR scheduling to carriers table for dashboard functionality.

  ## New Columns
  - `logo_url` (text): URL to carrier logo image
  - `account_owner` (text): Owner/manager of this carrier relationship
  - `on_time_pct` (numeric): On-time delivery percentage (0-100)
  - `claims_pct` (numeric): Claims percentage (0-100)
  - `invoice_variance_pct` (numeric): Invoice variance percentage
  - `next_qbr_date` (date): Next scheduled Quarterly Business Review date
  - `last_performance_update` (timestamptz): When performance metrics were last updated

  ## Notes
  - All new fields are nullable for backward compatibility
  - Performance percentages stored as numeric for precision
  - QBR date stored separately from performance update timestamp
*/

-- Add new fields to carriers table
ALTER TABLE carriers
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS account_owner text,
  ADD COLUMN IF NOT EXISTS on_time_pct numeric(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS claims_pct numeric(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS invoice_variance_pct numeric(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_qbr_date date,
  ADD COLUMN IF NOT EXISTS last_performance_update timestamptz DEFAULT now();

-- Add comment for documentation
COMMENT ON COLUMN carriers.on_time_pct IS 'On-time delivery percentage (0-100)';
COMMENT ON COLUMN carriers.claims_pct IS 'Claims percentage (0-100)';
COMMENT ON COLUMN carriers.invoice_variance_pct IS 'Invoice variance percentage';
COMMENT ON COLUMN carriers.next_qbr_date IS 'Next scheduled Quarterly Business Review';
