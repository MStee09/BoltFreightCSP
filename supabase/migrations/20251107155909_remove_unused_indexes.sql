/*
  # Remove Unused Indexes

  1. Performance Optimization
    - Remove indexes that are not being used by queries
    - Reduces storage overhead and write operation costs
    - Improves INSERT/UPDATE/DELETE performance
  
  2. Indexes Removed
    - Various indexes across multiple tables that show zero usage
*/

-- Remove unused indexes from alerts table
DROP INDEX IF EXISTS public.idx_alerts_dismissed_until;
DROP INDEX IF EXISTS public.idx_alerts_resolved_by;

-- Remove unused indexes from strategy_snapshots table
DROP INDEX IF EXISTS public.idx_strategy_snapshots_csp_event;
DROP INDEX IF EXISTS public.idx_strategy_snapshots_created_by;

-- Remove unused indexes from shipments table
DROP INDEX IF EXISTS public.idx_shipments_carrier_id;

-- Remove unused indexes from tariff_activities table
DROP INDEX IF EXISTS public.idx_tariff_activities_created_by;

-- Remove unused indexes from email_activities table
DROP INDEX IF EXISTS public.idx_email_activities_created_by;

-- Remove unused indexes from email_templates table
DROP INDEX IF EXISTS public.idx_email_templates_created_by;

-- Remove unused indexes from knowledge_base_documents table
DROP INDEX IF EXISTS public.idx_knowledge_base_documents_uploaded_by;

-- Remove unused indexes from lost_opportunities table
DROP INDEX IF EXISTS public.idx_lost_opportunities_csp_event_id;
DROP INDEX IF EXISTS public.idx_lost_opportunities_customer_id;

-- Remove unused indexes from role_permissions table
DROP INDEX IF EXISTS public.idx_role_permissions_permission_id;

-- Remove unused indexes from tariff_sop_revisions table
DROP INDEX IF EXISTS public.idx_tariff_sop_revisions_changed_by;

-- Remove unused indexes from tariffs table
DROP INDEX IF EXISTS public.idx_tariffs_created_by;
DROP INDEX IF EXISTS public.idx_tariffs_csp_event_id;
DROP INDEX IF EXISTS public.idx_tariffs_superseded_by_id;

-- Remove unused indexes from user_invitations table
DROP INDEX IF EXISTS public.idx_user_invitations_invited_by;

-- Remove unused indexes from user_profiles table
DROP INDEX IF EXISTS public.idx_user_profiles_created_by;
