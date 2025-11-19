/*
  # Remove Unused Indexes

  Removes 44 unused indexes to improve write performance and reduce storage overhead.
  These indexes have not been used according to PostgreSQL's index usage statistics.
  
  ## Removed indexes by table:
  
  ### alerts (2)
  - idx_alerts_assigned_to
  - idx_alerts_resolved_by
  
  ### automation_logs (1)
  - idx_automation_logs_rule_id
  
  ### calendar_events (2)
  - idx_calendar_events_csp_event_id
  - idx_calendar_events_customer_id
  
  ### csp_event_carriers (1)
  - idx_csp_event_carriers_carrier_id
  
  ### csp_stage_history (1)
  - idx_csp_stage_history_customer_id
  
  ### email_activities (1)
  - idx_email_activities_created_by
  
  ### email_audit_log (1)
  - idx_email_audit_log_user_id
  
  ### email_drafts (2)
  - idx_email_drafts_carrier_id
  - idx_email_drafts_csp_event_id
  
  ### email_templates (1)
  - idx_email_templates_created_by
  
  ### email_thread_comments (1)
  - idx_email_thread_comments_created_by
  
  ### tariff_families (1)
  - idx_tariff_families_created_by
  
  ### tariff_sop_revisions (2)
  - idx_tariff_sop_revisions_changed_by
  - idx_tariff_sop_revisions_sop_id
  
  ### tariffs (6)
  - idx_tariffs_carrier_id
  - idx_tariffs_created_by
  - idx_tariffs_csp_event_id
  - idx_tariffs_renewal_csp_event_id
  - idx_tariffs_superseded_by_id
  - idx_tariffs_ai_expiration_priority
  - idx_tariffs_ai_last_analyzed
  
  ### freightops_thread_tokens (4)
  - idx_freightops_thread_tokens_carrier_id
  - idx_freightops_thread_tokens_created_by
  - idx_freightops_thread_tokens_csp_event_id
  - idx_freightops_thread_tokens_customer_id
  
  ### knowledge_base_documents (1)
  - idx_knowledge_base_documents_uploaded_by
  
  ### lost_opportunities (1)
  - idx_lost_opportunities_csp_event_id
  
  ### role_permissions (1)
  - idx_role_permissions_permission_id
  
  ### strategy_snapshots (2)
  - idx_strategy_snapshots_created_by
  - idx_strategy_snapshots_csp_event_id
  
  ### tariff_activities (3)
  - idx_tariff_activities_created_by
  - idx_tariff_activities_csp_event_id
  - idx_tariff_activities_tariff_id
  
  ### user_feedback (1)
  - idx_user_feedback_user_id
  
  ### user_invitations (1)
  - idx_user_invitations_invited_by
  
  ### user_profiles (1)
  - idx_user_profiles_created_by
  
  ### notes (6)
  - idx_notes_entity
  - idx_notes_created_by
  - idx_notes_created_at
  - idx_notes_csp_event
  - idx_notes_customer
  - idx_notes_carrier
  
  ## Performance impact:
  - Reduces index maintenance overhead on INSERT/UPDATE/DELETE operations
  - Reduces storage space usage
  - Simplifies query planner decisions
*/

-- alerts
DROP INDEX IF EXISTS idx_alerts_assigned_to;
DROP INDEX IF EXISTS idx_alerts_resolved_by;

-- automation_logs
DROP INDEX IF EXISTS idx_automation_logs_rule_id;

-- calendar_events
DROP INDEX IF EXISTS idx_calendar_events_csp_event_id;
DROP INDEX IF EXISTS idx_calendar_events_customer_id;

-- csp_event_carriers
DROP INDEX IF EXISTS idx_csp_event_carriers_carrier_id;

-- csp_stage_history
DROP INDEX IF EXISTS idx_csp_stage_history_customer_id;

-- email_activities
DROP INDEX IF EXISTS idx_email_activities_created_by;

-- email_audit_log
DROP INDEX IF EXISTS idx_email_audit_log_user_id;

-- email_drafts
DROP INDEX IF EXISTS idx_email_drafts_carrier_id;
DROP INDEX IF EXISTS idx_email_drafts_csp_event_id;

-- email_templates
DROP INDEX IF EXISTS idx_email_templates_created_by;

-- email_thread_comments
DROP INDEX IF EXISTS idx_email_thread_comments_created_by;

-- tariff_families
DROP INDEX IF EXISTS idx_tariff_families_created_by;

-- tariff_sop_revisions
DROP INDEX IF EXISTS idx_tariff_sop_revisions_changed_by;
DROP INDEX IF EXISTS idx_tariff_sop_revisions_sop_id;

-- tariffs
DROP INDEX IF EXISTS idx_tariffs_carrier_id;
DROP INDEX IF EXISTS idx_tariffs_created_by;
DROP INDEX IF EXISTS idx_tariffs_csp_event_id;
DROP INDEX IF EXISTS idx_tariffs_renewal_csp_event_id;
DROP INDEX IF EXISTS idx_tariffs_superseded_by_id;
DROP INDEX IF EXISTS idx_tariffs_ai_expiration_priority;
DROP INDEX IF EXISTS idx_tariffs_ai_last_analyzed;

-- freightops_thread_tokens
DROP INDEX IF EXISTS idx_freightops_thread_tokens_carrier_id;
DROP INDEX IF EXISTS idx_freightops_thread_tokens_created_by;
DROP INDEX IF EXISTS idx_freightops_thread_tokens_csp_event_id;
DROP INDEX IF EXISTS idx_freightops_thread_tokens_customer_id;

-- knowledge_base_documents
DROP INDEX IF EXISTS idx_knowledge_base_documents_uploaded_by;

-- lost_opportunities
DROP INDEX IF EXISTS idx_lost_opportunities_csp_event_id;

-- role_permissions
DROP INDEX IF EXISTS idx_role_permissions_permission_id;

-- strategy_snapshots
DROP INDEX IF EXISTS idx_strategy_snapshots_created_by;
DROP INDEX IF EXISTS idx_strategy_snapshots_csp_event_id;

-- tariff_activities
DROP INDEX IF EXISTS idx_tariff_activities_created_by;
DROP INDEX IF EXISTS idx_tariff_activities_csp_event_id;
DROP INDEX IF EXISTS idx_tariff_activities_tariff_id;

-- user_feedback
DROP INDEX IF EXISTS idx_user_feedback_user_id;

-- user_invitations
DROP INDEX IF EXISTS idx_user_invitations_invited_by;

-- user_profiles
DROP INDEX IF EXISTS idx_user_profiles_created_by;

-- notes
DROP INDEX IF EXISTS idx_notes_entity;
DROP INDEX IF EXISTS idx_notes_created_by;
DROP INDEX IF EXISTS idx_notes_created_at;
DROP INDEX IF EXISTS idx_notes_csp_event;
DROP INDEX IF EXISTS idx_notes_customer;
DROP INDEX IF EXISTS idx_notes_carrier;
