/*
  # Add "Deals Entering Stage" KPI Type

  1. Changes
    - Updates kpi_type CHECK constraint to include 'deals_entering_stage'
    - This allows tracking when deals enter specific pipeline stages
    - Stage configuration will be stored in the metadata jsonb field
  
  2. Notes
    - The metadata field will store: { "target_stage": "stage_name" }
    - This KPI counts how many deals entered the specified stage during the period
*/

-- Drop the existing constraint
ALTER TABLE kpi_definitions 
DROP CONSTRAINT IF EXISTS kpi_definitions_kpi_type_check;

-- Add updated constraint with new type
ALTER TABLE kpi_definitions 
ADD CONSTRAINT kpi_definitions_kpi_type_check 
CHECK (kpi_type IN (
  'win_rate',
  'avg_cycle_time',
  'stage_conversion',
  'email_response_rate',
  'deals_closed',
  'revenue_target',
  'activity_volume',
  'carrier_engagement',
  'customer_satisfaction',
  'deals_entering_stage',
  'custom'
));