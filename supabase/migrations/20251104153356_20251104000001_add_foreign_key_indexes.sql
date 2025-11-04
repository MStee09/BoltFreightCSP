/*
  # Add Missing Foreign Key Indexes - Part 1

  Adds covering indexes for all foreign key columns to improve query performance:
  - alerts.resolved_by
  - email_activities.created_by
  - email_templates.created_by
  - knowledge_base_documents.uploaded_by
  - lost_opportunities (csp_event_id, customer_id)
  - role_permissions.permission_id
  - shipments.carrier_id
  - tariff_activities.created_by
  - tariff_sop_revisions.changed_by
  - tariff_sops.created_by
  - tariffs (created_by, csp_event_id, superseded_by_id)
  - user_invitations.invited_by
  - user_profiles.created_by
*/

CREATE INDEX IF NOT EXISTS idx_alerts_resolved_by ON public.alerts(resolved_by);
CREATE INDEX IF NOT EXISTS idx_email_activities_created_by ON public.email_activities(created_by);
CREATE INDEX IF NOT EXISTS idx_email_templates_created_by ON public.email_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_documents_uploaded_by ON public.knowledge_base_documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_lost_opportunities_csp_event_id ON public.lost_opportunities(csp_event_id);
CREATE INDEX IF NOT EXISTS idx_lost_opportunities_customer_id ON public.lost_opportunities(customer_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON public.role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_shipments_carrier_id ON public.shipments(carrier_id);
CREATE INDEX IF NOT EXISTS idx_tariff_activities_created_by ON public.tariff_activities(created_by);
CREATE INDEX IF NOT EXISTS idx_tariff_sop_revisions_changed_by ON public.tariff_sop_revisions(changed_by);
CREATE INDEX IF NOT EXISTS idx_tariff_sops_created_by ON public.tariff_sops(created_by);
CREATE INDEX IF NOT EXISTS idx_tariffs_created_by ON public.tariffs(created_by);
CREATE INDEX IF NOT EXISTS idx_tariffs_csp_event_id ON public.tariffs(csp_event_id);
CREATE INDEX IF NOT EXISTS idx_tariffs_superseded_by_id ON public.tariffs(superseded_by_id);
CREATE INDEX IF NOT EXISTS idx_user_invitations_invited_by ON public.user_invitations(invited_by);
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_by ON public.user_profiles(created_by);
