/*
  # Remove Unused Indexes - Part 2

  Removes unused indexes to improve write performance and reduce storage overhead.
  These indexes have not been used and are consuming resources unnecessarily.
*/

DROP INDEX IF EXISTS public.idx_email_activities_tracking_code;
DROP INDEX IF EXISTS public.idx_email_activities_thread_id;
DROP INDEX IF EXISTS public.idx_email_activities_carrier_id;
DROP INDEX IF EXISTS public.idx_email_activities_sent_at;
DROP INDEX IF EXISTS public.idx_carrier_contacts_primary;
DROP INDEX IF EXISTS public.idx_csp_event_carriers_carrier;
DROP INDEX IF EXISTS public.idx_customers_status;
DROP INDEX IF EXISTS public.idx_carriers_status;
DROP INDEX IF EXISTS public.idx_tariffs_status;
DROP INDEX IF EXISTS public.idx_tariffs_carrier_ids;
DROP INDEX IF EXISTS public.idx_csp_events_status;
DROP INDEX IF EXISTS public.idx_tasks_status;
DROP INDEX IF EXISTS public.idx_tasks_due_date;
DROP INDEX IF EXISTS public.idx_interactions_metadata;
DROP INDEX IF EXISTS public.idx_shipments_user_id;
DROP INDEX IF EXISTS public.idx_shipments_customer_id;
DROP INDEX IF EXISTS public.idx_lost_opportunities_user_id;
DROP INDEX IF EXISTS public.idx_report_snapshots_data;
DROP INDEX IF EXISTS public.idx_calendar_events_event_date;
DROP INDEX IF EXISTS public.idx_calendar_events_customer_id;
DROP INDEX IF EXISTS public.idx_calendar_events_csp_event_id;
DROP INDEX IF EXISTS public.idx_calendar_events_status;
DROP INDEX IF EXISTS public.idx_gmail_watch_active;
DROP INDEX IF EXISTS public.idx_user_invitations_expires_at;
DROP INDEX IF EXISTS public.idx_csp_stage_history_customer;
DROP INDEX IF EXISTS public.idx_user_invitations_email;
DROP INDEX IF EXISTS public.idx_csp_stage_history_stage;
DROP INDEX IF EXISTS public.idx_documents_version;
DROP INDEX IF EXISTS public.idx_documents_ai_status;
DROP INDEX IF EXISTS public.idx_ai_chatbot_settings_active;
DROP INDEX IF EXISTS public.idx_tariffs_ownership_type;
DROP INDEX IF EXISTS public.idx_tariffs_expiry_date;
DROP INDEX IF EXISTS public.idx_tariffs_effective_date;
DROP INDEX IF EXISTS public.idx_email_activities_awaiting_reply;
DROP INDEX IF EXISTS public.idx_email_activities_message_id;
DROP INDEX IF EXISTS public.idx_user_alert_preferences_alert_type;
DROP INDEX IF EXISTS public.idx_alerts_status_created;
DROP INDEX IF EXISTS public.idx_alerts_assigned_status;
DROP INDEX IF EXISTS public.idx_tariff_sops_family;
DROP INDEX IF EXISTS public.idx_tariff_sops_created;
DROP INDEX IF EXISTS public.idx_tariff_sop_revisions_sop;
DROP INDEX IF EXISTS public.idx_tariff_sop_revisions_version;
DROP INDEX IF EXISTS public.idx_tariff_activities_tariff_id;
DROP INDEX IF EXISTS public.idx_tariffs_family_id;
DROP INDEX IF EXISTS public.idx_user_feedback_status;
DROP INDEX IF EXISTS public.idx_user_feedback_created_at;
DROP INDEX IF EXISTS public.idx_notifications_user_id;
DROP INDEX IF EXISTS public.idx_notifications_created_at;
DROP INDEX IF EXISTS public.idx_user_feedback_user_id;
DROP INDEX IF EXISTS public.idx_user_feedback_type;
