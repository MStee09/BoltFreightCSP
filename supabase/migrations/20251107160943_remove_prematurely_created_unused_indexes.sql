/*
  # Remove Unused Indexes (Batch 2)

  1. Performance Optimization
    - Remove indexes that were created but are not being used
    - These indexes were created in previous migration but show zero usage
    - Reduces storage overhead and improves write operation performance
  
  2. Indexes Removed
    - Indexes from the first batch that are confirmed unused after monitoring period
*/

-- Remove unused indexes from first batch
DROP INDEX IF EXISTS public.idx_alerts_assigned_to;
DROP INDEX IF EXISTS public.idx_calendar_events_csp_event_id;
DROP INDEX IF EXISTS public.idx_calendar_events_customer_id;
DROP INDEX IF EXISTS public.idx_csp_event_carriers_carrier_id;
DROP INDEX IF EXISTS public.idx_csp_stage_history_customer_id;
DROP INDEX IF EXISTS public.idx_email_activities_carrier_id;
DROP INDEX IF EXISTS public.idx_shipments_customer_id;
DROP INDEX IF EXISTS public.idx_tariff_activities_tariff_id;
DROP INDEX IF EXISTS public.idx_tariff_sop_revisions_sop_id;
DROP INDEX IF EXISTS public.idx_user_feedback_user_id;
