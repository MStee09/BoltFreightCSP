/*
  # Add AI Strategic Intelligence to Tariffs

  1. New Columns
    - `ai_carrier_blockers` (jsonb) - List of carriers that cannot be competitively bid due to this tariff
    - `ai_expiration_priority` (text) - Priority ranking for expiration (high/medium/low)
    - `ai_risk_awareness` (text) - Conflicts with other tariffs or blankets
    - `ai_comparison_score` (jsonb) - Comparison metrics vs blankets and CSPs
    - `ai_opportunity_flags` (text[]) - Strategic opportunity indicators
    - `ai_competitive_strength` (text) - Overall competitive assessment
    - `ai_last_analyzed` (timestamptz) - Last time AI analysis was run
    
  2. Purpose
    - Add AI-enriched metadata to Customer Direct tariffs
    - Enable strategic intelligence without modifying customer tariffs
    - Support carrier targeting and CSP opportunity identification
    - Internal visibility only - not customer-facing
*/

-- Add AI strategic intelligence columns to tariffs
ALTER TABLE tariffs ADD COLUMN IF NOT EXISTS ai_carrier_blockers jsonb;
ALTER TABLE tariffs ADD COLUMN IF NOT EXISTS ai_expiration_priority text CHECK (ai_expiration_priority IN ('high', 'medium', 'low'));
ALTER TABLE tariffs ADD COLUMN IF NOT EXISTS ai_risk_awareness text;
ALTER TABLE tariffs ADD COLUMN IF NOT EXISTS ai_comparison_score jsonb;
ALTER TABLE tariffs ADD COLUMN IF NOT EXISTS ai_opportunity_flags text[];
ALTER TABLE tariffs ADD COLUMN IF NOT EXISTS ai_competitive_strength text CHECK (ai_competitive_strength IN ('strong', 'moderate', 'weak', 'unknown'));
ALTER TABLE tariffs ADD COLUMN IF NOT EXISTS ai_last_analyzed timestamptz;

-- Create index for querying by AI analysis
CREATE INDEX IF NOT EXISTS idx_tariffs_ai_expiration_priority ON tariffs(ai_expiration_priority) WHERE ai_expiration_priority IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tariffs_ai_last_analyzed ON tariffs(ai_last_analyzed);

-- Add comment explaining these are internal-only fields
COMMENT ON COLUMN tariffs.ai_carrier_blockers IS 'Internal AI analysis: carriers that cannot be competitively bid due to this tariff';
COMMENT ON COLUMN tariffs.ai_expiration_priority IS 'Internal AI analysis: priority ranking for expiration monitoring';
COMMENT ON COLUMN tariffs.ai_risk_awareness IS 'Internal AI analysis: conflicts with other tariffs or blankets';
COMMENT ON COLUMN tariffs.ai_comparison_score IS 'Internal AI analysis: comparison metrics vs blankets and CSPs';
COMMENT ON COLUMN tariffs.ai_opportunity_flags IS 'Internal AI analysis: strategic opportunity indicators';
COMMENT ON COLUMN tariffs.ai_competitive_strength IS 'Internal AI analysis: overall competitive assessment';
