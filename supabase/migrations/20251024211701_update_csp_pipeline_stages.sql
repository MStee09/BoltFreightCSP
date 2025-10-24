/*
  # Update CSP Pipeline Stages

  1. Overview
    - Replaces existing CSP event stages with optimized LTL CSP workflow
    - Updates stage naming and definitions for clarity
    - Maintains data integrity by migrating existing stage values

  2. New Stages
    - discovery: Internal prep / identify opportunity
    - data_room_ready: Bid packet and lane data finalized
    - carrier_invites_sent: Formal CSP bid invitations issued (formerly rfp_sent)
    - carrier_submissions: Collecting and validating rate submissions (formerly negotiation/QA)
    - round_2_optimization: Iterate pricing and negotiate final offers
    - award_tariff_finalization: Select winning carriers and finalize tariffs
    - implementation: Upload and publish awarded tariffs
    - validation_monitoring: Verify accuracy of published tariffs
    - renewal_watch: Active monitoring before expiry (60-90 days)

  3. Migration Strategy
    - Temporarily disable triggers to prevent auth.uid() issues
    - Map old stage values to new equivalents
    - Update csp_stage_history records
    - Re-enable triggers
    - Preserve all historical data

  4. Security
    - No changes to RLS policies
*/

-- Disable triggers temporarily during migration
ALTER TABLE csp_events DISABLE TRIGGER on_csp_stage_change;

-- Update existing csp_events to new stage names
UPDATE csp_events
SET stage = CASE stage
  WHEN 'discovery' THEN 'discovery'
  WHEN 'data_room_ready' THEN 'data_room_ready'
  WHEN 'rfp_sent' THEN 'carrier_invites_sent'
  WHEN 'negotiation' THEN 'carrier_submissions'
  WHEN 'implementation' THEN 'implementation'
  ELSE stage
END
WHERE stage IN ('discovery', 'data_room_ready', 'rfp_sent', 'negotiation', 'implementation');

-- Update csp_stage_history to match new stage names
UPDATE csp_stage_history
SET previous_stage = CASE previous_stage
  WHEN 'rfp_sent' THEN 'carrier_invites_sent'
  WHEN 'negotiation' THEN 'carrier_submissions'
  ELSE previous_stage
END,
new_stage = CASE new_stage
  WHEN 'rfp_sent' THEN 'carrier_invites_sent'
  WHEN 'negotiation' THEN 'carrier_submissions'
  ELSE new_stage
END
WHERE previous_stage IN ('rfp_sent', 'negotiation')
   OR new_stage IN ('rfp_sent', 'negotiation');

-- Re-enable triggers
ALTER TABLE csp_events ENABLE TRIGGER on_csp_stage_change;

-- Add comment to document the stage workflow
COMMENT ON COLUMN csp_events.stage IS 
'CSP Pipeline Stages:
1. discovery - Internal prep / identify opportunity
2. data_room_ready - Bid packet and lane data finalized
3. carrier_invites_sent - Formal CSP bid invitations issued
4. carrier_submissions - Collecting and validating rate submissions
5. round_2_optimization - Iterate pricing and negotiate final offers
6. award_tariff_finalization - Select winning carriers and finalize tariffs
7. implementation - Upload and publish awarded tariffs
8. validation_monitoring - Verify accuracy of published tariffs
9. renewal_watch - Active monitoring before expiry (60-90 days)';