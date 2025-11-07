/*
  # Recreate Essential Foreign Key Indexes

  1. Performance Optimization
    - Recreate indexes for foreign keys that were previously removed
    - These indexes are essential for JOIN performance even if not immediately used
    - Foreign key indexes prevent table scans during constraint checking
  
  2. Indexes Created
    - Core foreign keys that were mistakenly removed as "unused"
    - Usage statistics reset after index creation, so they appear unused initially
    - These will become actively used as queries execute
*/

-- Recreate indexes that were removed but are needed for foreign key performance
CREATE INDEX IF NOT EXISTS idx_alerts_assigned_to ON public.alerts(assigned_to);
CREATE INDEX IF NOT EXISTS idx_calendar_events_csp_event_id ON public.calendar_events(csp_event_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_customer_id ON public.calendar_events(customer_id);
CREATE INDEX IF NOT EXISTS idx_csp_event_carriers_carrier_id ON public.csp_event_carriers(carrier_id);
CREATE INDEX IF NOT EXISTS idx_csp_stage_history_customer_id ON public.csp_stage_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_email_activities_carrier_id ON public.email_activities(carrier_id);
CREATE INDEX IF NOT EXISTS idx_shipments_customer_id ON public.shipments(customer_id);
CREATE INDEX IF NOT EXISTS idx_tariff_activities_tariff_id ON public.tariff_activities(tariff_id);
CREATE INDEX IF NOT EXISTS idx_tariff_sop_revisions_sop_id ON public.tariff_sop_revisions(sop_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON public.user_feedback(user_id);
