/*
  # Add Missing Foreign Key Indexes

  1. Performance Optimization
    - Add indexes for all foreign keys that are missing covering indexes
    - This improves JOIN performance and foreign key constraint checking
  
  2. Tables Affected
    - alerts: assigned_to
    - calendar_events: csp_event_id, customer_id
    - csp_event_carriers: carrier_id
    - csp_stage_history: customer_id
    - email_activities: carrier_id
    - shipments: customer_id
    - tariff_activities: tariff_id
    - tariff_sop_revisions: sop_id
    - user_feedback: user_id
*/

-- Add index for alerts.assigned_to foreign key
CREATE INDEX IF NOT EXISTS idx_alerts_assigned_to ON public.alerts(assigned_to);

-- Add indexes for calendar_events foreign keys
CREATE INDEX IF NOT EXISTS idx_calendar_events_csp_event_id ON public.calendar_events(csp_event_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_customer_id ON public.calendar_events(customer_id);

-- Add index for csp_event_carriers.carrier_id foreign key
CREATE INDEX IF NOT EXISTS idx_csp_event_carriers_carrier_id ON public.csp_event_carriers(carrier_id);

-- Add index for csp_stage_history.customer_id foreign key
CREATE INDEX IF NOT EXISTS idx_csp_stage_history_customer_id ON public.csp_stage_history(customer_id);

-- Add index for email_activities.carrier_id foreign key
CREATE INDEX IF NOT EXISTS idx_email_activities_carrier_id ON public.email_activities(carrier_id);

-- Add index for shipments.customer_id foreign key
CREATE INDEX IF NOT EXISTS idx_shipments_customer_id ON public.shipments(customer_id);

-- Add index for tariff_activities.tariff_id foreign key
CREATE INDEX IF NOT EXISTS idx_tariff_activities_tariff_id ON public.tariff_activities(tariff_id);

-- Add index for tariff_sop_revisions.sop_id foreign key
CREATE INDEX IF NOT EXISTS idx_tariff_sop_revisions_sop_id ON public.tariff_sop_revisions(sop_id);

-- Add index for user_feedback.user_id foreign key
CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON public.user_feedback(user_id);
