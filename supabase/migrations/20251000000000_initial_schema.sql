/*
  # Initial Database Schema

  1. Core Tables
    - user_profiles: User account information and roles
    - customers: Customer organizations
    - carriers: Shipping carriers
    - tariffs: Rate agreements between customers and carriers
    - csp_events: Customer Strategic Partnership pipeline events
    - tasks: Action items linked to entities
    - alerts: System notifications and warnings
    - interactions: Activity history for entities
    - shipments: Shipment tracking records
    - lost_opportunities: Track lost business opportunities
    - documents: File attachments for entities
    - calendar_events: Calendar and scheduling
    - carrier_contacts: Carrier contact information
    - csp_event_carriers: CSP event carrier relationships
    - csp_stage_history: Track CSP stage transitions
    - email_activities: Email tracking and threading
    - email_templates: Email template management
    - gmail_watch_subscriptions: Gmail integration
    - user_gmail_tokens: Gmail OAuth tokens
    - user_gmail_credentials: Gmail app passwords
    - field_mappings: Document field mappings
    - knowledge_base_documents: Knowledge base content
    - ai_chatbot_settings: AI assistant settings
    - report_snapshots: Report data snapshots
    - notifications: User notifications
    - permissions: Permission definitions
    - role_permissions: Role-permission mappings
    - user_invitations: User invitation system
    - user_onboarding_state: Onboarding progress
    - user_alert_preferences: Alert customization
    - user_email_notification_settings: Email notification preferences
    - user_feedback: User feedback collection
    - tariff_activities: Tariff change tracking
    - tariff_sops: Tariff SOPs
    - tariff_sop_revisions: SOP version history

  2. Security
    - Enable RLS on all tables
    - Initial policies will be added in subsequent migrations
*/

-- User Profiles Table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE,
  full_name text,
  role text NOT NULL DEFAULT 'basic',
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  metadata jsonb DEFAULT '{}',
  first_name text,
  last_name text,
  phone text,
  title text,
  company text DEFAULT 'Rocketshipping',
  email_signature text
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Customers Table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  account_owner text DEFAULT '',
  csp_strategy text DEFAULT '',
  margin_30d numeric DEFAULT 0,
  margin_60d numeric DEFAULT 0,
  status text DEFAULT 'active',
  notes text DEFAULT '',
  created_date timestamp with time zone DEFAULT now(),
  updated_date timestamp with time zone DEFAULT now(),
  user_id uuid NOT NULL,
  csp_review_frequency text DEFAULT 'annual',
  last_csp_review_date date,
  next_csp_review_date date
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Carriers Table
CREATE TABLE IF NOT EXISTS carriers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  scac_code text DEFAULT '',
  service_type text DEFAULT '',
  contact_name text DEFAULT '',
  contact_email text DEFAULT '',
  contact_phone text DEFAULT '',
  performance_score numeric DEFAULT 0,
  status text DEFAULT 'active',
  notes text DEFAULT '',
  created_date timestamp with time zone DEFAULT now(),
  updated_date timestamp with time zone DEFAULT now(),
  user_id uuid NOT NULL,
  website text,
  carrier_rep_name text,
  carrier_rep_email text,
  carrier_rep_phone text,
  billing_contact_name text,
  billing_contact_email text,
  billing_contact_phone text,
  service_regions text[],
  service_states text[],
  service_countries text[] DEFAULT ARRAY['US'],
  coverage_type text DEFAULT 'regional',
  equipment_types text[],
  specializations text[]
);

ALTER TABLE carriers ENABLE ROW LEVEL SECURITY;

-- CSP Events Table
CREATE TABLE IF NOT EXISTS csp_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  title text NOT NULL,
  stage text DEFAULT 'discovery',
  status text DEFAULT 'in_progress',
  priority text DEFAULT 'normal',
  assigned_to text DEFAULT '',
  due_date date,
  days_in_stage integer DEFAULT 0,
  notes text DEFAULT '',
  created_date timestamp with time zone DEFAULT now(),
  updated_date timestamp with time zone DEFAULT now(),
  user_id uuid NOT NULL,
  honeymoon_monitoring boolean DEFAULT false,
  go_live_date date,
  mode text,
  strategy_summary jsonb DEFAULT '{}',
  strategy_summary_updated_at timestamp with time zone,
  CONSTRAINT csp_events_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES customers(id)
);

ALTER TABLE csp_events ENABLE ROW LEVEL SECURITY;

-- Tariffs Table
CREATE TABLE IF NOT EXISTS tariffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid,
  carrier_ids uuid[] DEFAULT '{}',
  version text DEFAULT '',
  ownership_type text DEFAULT '',
  status text DEFAULT 'proposed',
  effective_date date NOT NULL,
  expiry_date date NOT NULL,
  is_blanket_tariff boolean DEFAULT false,
  file_url text DEFAULT '',
  notes text DEFAULT '',
  created_date timestamp with time zone DEFAULT now(),
  updated_date timestamp with time zone DEFAULT now(),
  user_id uuid NOT NULL,
  customer_ids uuid[] DEFAULT '{}',
  csp_event_id uuid,
  tariff_family_id uuid,
  version_number text DEFAULT '1.0',
  superseded_by_id uuid,
  created_by uuid,
  source text DEFAULT 'manual_upload',
  finalized_date timestamp with time zone,
  carrier_name text,
  customer_name text,
  mode text,
  CONSTRAINT tariffs_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES customers(id),
  CONSTRAINT tariffs_csp_event_id_fkey FOREIGN KEY (csp_event_id) REFERENCES csp_events(id),
  CONSTRAINT tariffs_superseded_by_id_fkey FOREIGN KEY (superseded_by_id) REFERENCES tariffs(id)
);

ALTER TABLE tariffs ENABLE ROW LEVEL SECURITY;

-- Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  title text NOT NULL,
  status text DEFAULT 'open',
  priority text DEFAULT 'normal',
  due_date date,
  assigned_to text DEFAULT '',
  notes text DEFAULT '',
  created_date timestamp with time zone DEFAULT now(),
  updated_date timestamp with time zone DEFAULT now(),
  user_id uuid NOT NULL
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Alerts Table
CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL,
  severity text DEFAULT 'info',
  status text DEFAULT 'active',
  title text NOT NULL,
  message text NOT NULL,
  entity_type text DEFAULT '',
  entity_id uuid,
  created_date timestamp with time zone DEFAULT now(),
  resolved_date timestamp with time zone,
  user_id uuid NOT NULL,
  assigned_to uuid,
  recommended_action text,
  resolved_by uuid,
  resolution_notes text,
  last_seen_at timestamp with time zone,
  action_taken text
);

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Interactions Table
CREATE TABLE IF NOT EXISTS interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  interaction_type text NOT NULL,
  summary text NOT NULL,
  details text DEFAULT '',
  metadata jsonb DEFAULT '{}',
  created_date timestamp with time zone DEFAULT now(),
  user_id uuid NOT NULL
);

ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;

-- Shipments Table
CREATE TABLE IF NOT EXISTS shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid,
  carrier_id uuid,
  tracking_number text DEFAULT '',
  origin text DEFAULT '',
  destination text DEFAULT '',
  ship_date date,
  delivery_date date,
  status text DEFAULT 'pending',
  cost numeric DEFAULT 0,
  weight numeric DEFAULT 0,
  created_date timestamp with time zone DEFAULT now(),
  updated_date timestamp with time zone DEFAULT now(),
  user_id uuid NOT NULL,
  CONSTRAINT shipments_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES customers(id),
  CONSTRAINT shipments_carrier_id_fkey FOREIGN KEY (carrier_id) REFERENCES carriers(id)
);

ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;

-- Lost Opportunities Table
CREATE TABLE IF NOT EXISTS lost_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid,
  csp_event_id uuid,
  reason text DEFAULT '',
  competitor text DEFAULT '',
  estimated_value numeric DEFAULT 0,
  lessons_learned text DEFAULT '',
  created_date timestamp with time zone DEFAULT now(),
  user_id uuid NOT NULL
);

ALTER TABLE lost_opportunities ENABLE ROW LEVEL SECURITY;

-- Documents Table
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  customer_id uuid,
  csp_event_id uuid,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer DEFAULT 0,
  file_type text DEFAULT '',
  document_type text DEFAULT 'general',
  description text DEFAULT '',
  uploaded_by text DEFAULT '',
  created_date timestamp with time zone DEFAULT now(),
  user_id uuid NOT NULL,
  data_range_start date,
  data_range_end date,
  version integer DEFAULT 1,
  ai_processing_status text DEFAULT 'pending',
  ai_summary text,
  ai_summary_generated_at timestamp with time zone
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Calendar Events Table
CREATE TABLE IF NOT EXISTS calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  event_date date NOT NULL,
  status text DEFAULT 'pending',
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  customer_id uuid,
  csp_event_id uuid,
  assigned_to text DEFAULT '',
  metadata jsonb DEFAULT '{}',
  created_date timestamp with time zone DEFAULT now(),
  completed_date timestamp with time zone,
  user_id uuid NOT NULL
);

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Carrier Contacts Table
CREATE TABLE IF NOT EXISTS carrier_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id uuid NOT NULL,
  contact_type text DEFAULT 'primary',
  name text NOT NULL,
  email text,
  phone text,
  title text,
  is_primary boolean DEFAULT false,
  notes text,
  created_date timestamp with time zone DEFAULT now(),
  updated_date timestamp with time zone DEFAULT now(),
  user_id uuid,
  CONSTRAINT carrier_contacts_carrier_id_fkey FOREIGN KEY (carrier_id) REFERENCES carriers(id)
);

ALTER TABLE carrier_contacts ENABLE ROW LEVEL SECURITY;

-- CSP Event Carriers Table
CREATE TABLE IF NOT EXISTS csp_event_carriers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  csp_event_id uuid NOT NULL,
  carrier_id uuid NOT NULL,
  status text DEFAULT 'invited',
  invited_date timestamp with time zone DEFAULT now(),
  response_date timestamp with time zone,
  notes text,
  created_date timestamp with time zone DEFAULT now(),
  updated_date timestamp with time zone DEFAULT now(),
  user_id uuid,
  CONSTRAINT csp_event_carriers_csp_event_id_fkey FOREIGN KEY (csp_event_id) REFERENCES csp_events(id),
  CONSTRAINT csp_event_carriers_carrier_id_fkey FOREIGN KEY (carrier_id) REFERENCES carriers(id)
);

ALTER TABLE csp_event_carriers ENABLE ROW LEVEL SECURITY;

-- CSP Stage History Table
CREATE TABLE IF NOT EXISTS csp_stage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  csp_event_id uuid NOT NULL,
  customer_id uuid,
  previous_stage text,
  new_stage text NOT NULL,
  changed_by uuid NOT NULL,
  changed_at timestamp with time zone NOT NULL DEFAULT now(),
  days_in_previous_stage integer DEFAULT 0,
  notes text DEFAULT '',
  metadata jsonb DEFAULT '{}',
  CONSTRAINT csp_stage_history_csp_event_id_fkey FOREIGN KEY (csp_event_id) REFERENCES csp_events(id)
);

ALTER TABLE csp_stage_history ENABLE ROW LEVEL SECURITY;

-- Email Activities Table
CREATE TABLE IF NOT EXISTS email_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_code text NOT NULL,
  csp_event_id uuid,
  customer_id uuid,
  carrier_id uuid,
  thread_id text,
  message_id text,
  subject text NOT NULL,
  from_email text NOT NULL,
  from_name text,
  to_emails text[] NOT NULL DEFAULT '{}',
  cc_emails text[] NOT NULL DEFAULT '{}',
  body_text text,
  body_html text,
  direction text NOT NULL,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  metadata jsonb DEFAULT '{}',
  in_reply_to_message_id text,
  email_references text[],
  awaiting_reply boolean DEFAULT false,
  awaiting_reply_since timestamp with time zone,
  reply_by_date timestamp with time zone,
  thread_participants text[],
  thread_message_count integer DEFAULT 1,
  is_thread_starter boolean DEFAULT true
);

ALTER TABLE email_activities ENABLE ROW LEVEL SECURITY;

-- Email Templates Table
CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  template_key text NOT NULL UNIQUE,
  subject_template text NOT NULL,
  body_template text NOT NULL,
  description text,
  is_system boolean DEFAULT false,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  recipient_type text DEFAULT 'general',
  category text
);

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- Gmail Watch Subscriptions Table
CREATE TABLE IF NOT EXISTS gmail_watch_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  email_address text NOT NULL,
  history_id text NOT NULL,
  expiration timestamp with time zone NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE gmail_watch_subscriptions ENABLE ROW LEVEL SECURITY;

-- User Gmail Tokens Table
CREATE TABLE IF NOT EXISTS user_gmail_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  email_address text NOT NULL,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_expiry timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE user_gmail_tokens ENABLE ROW LEVEL SECURITY;

-- User Gmail Credentials Table
CREATE TABLE IF NOT EXISTS user_gmail_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  email_address text NOT NULL,
  app_password text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE user_gmail_credentials ENABLE ROW LEVEL SECURITY;

-- Field Mappings Table
CREATE TABLE IF NOT EXISTS field_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  document_type text NOT NULL,
  mapping jsonb NOT NULL DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE field_mappings ENABLE ROW LEVEL SECURITY;

-- Knowledge Base Documents Table
CREATE TABLE IF NOT EXISTS knowledge_base_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  file_type text,
  file_size integer,
  uploaded_by uuid,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  metadata jsonb DEFAULT '{}'
);

ALTER TABLE knowledge_base_documents ENABLE ROW LEVEL SECURITY;

-- AI Chatbot Settings Table
CREATE TABLE IF NOT EXISTS ai_chatbot_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  organization_id text,
  instructions text DEFAULT 'You are a helpful logistics and procurement analyst. Provide clear, actionable insights based on the shipment data.',
  knowledge_base text DEFAULT '',
  temperature numeric DEFAULT 0.7,
  max_tokens integer DEFAULT 1000,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ai_chatbot_settings ENABLE ROW LEVEL SECURITY;

-- Report Snapshots Table
CREATE TABLE IF NOT EXISTS report_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  data jsonb DEFAULT '{}',
  created_date timestamp with time zone DEFAULT now(),
  user_id uuid NOT NULL
);

ALTER TABLE report_snapshots ENABLE ROW LEVEL SECURITY;

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  read boolean DEFAULT false,
  link text,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  read_at timestamp with time zone
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Permissions Table
CREATE TABLE IF NOT EXISTS permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text NOT NULL,
  resource text NOT NULL,
  action text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

-- Role Permissions Table
CREATE TABLE IF NOT EXISTS role_permissions (
  role text NOT NULL,
  permission_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (role, permission_id),
  CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES permissions(id)
);

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- User Invitations Table
CREATE TABLE IF NOT EXISTS user_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role text NOT NULL DEFAULT 'basic',
  invited_by uuid NOT NULL,
  token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamp with time zone NOT NULL,
  accepted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'
);

ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

-- User Onboarding State Table
CREATE TABLE IF NOT EXISTS user_onboarding_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  onboarding_completed boolean NOT NULL DEFAULT false,
  current_step integer NOT NULL DEFAULT 0,
  skipped boolean NOT NULL DEFAULT false,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE user_onboarding_state ENABLE ROW LEVEL SECURITY;

-- User Alert Preferences Table
CREATE TABLE IF NOT EXISTS user_alert_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  alert_type text NOT NULL,
  enabled boolean DEFAULT true,
  threshold_days integer,
  threshold_hours integer,
  severity_level text DEFAULT 'medium',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, alert_type)
);

ALTER TABLE user_alert_preferences ENABLE ROW LEVEL SECURITY;

-- User Email Notification Settings Table
CREATE TABLE IF NOT EXISTS user_email_notification_settings (
  user_id uuid PRIMARY KEY,
  awaiting_reply_days integer DEFAULT 3,
  critical_reply_days integer DEFAULT 7,
  auto_alert_enabled boolean DEFAULT true,
  alert_frequency text DEFAULT 'daily',
  include_weekends boolean DEFAULT true,
  quiet_hours_start time,
  quiet_hours_end time,
  alert_channels jsonb DEFAULT '["in_app"]',
  custom_rules jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE user_email_notification_settings ENABLE ROW LEVEL SECURITY;

-- User Feedback Table
CREATE TABLE IF NOT EXISTS user_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  feedback_type text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  current_page text NOT NULL,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'submitted',
  admin_notes text,
  bolt_prompt_suggestion text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone
);

ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- Tariff Activities Table
CREATE TABLE IF NOT EXISTS tariff_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tariff_id uuid NOT NULL,
  activity_type text NOT NULL,
  description text NOT NULL,
  old_status text,
  new_status text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  metadata jsonb DEFAULT '{}',
  CONSTRAINT tariff_activities_tariff_id_fkey FOREIGN KEY (tariff_id) REFERENCES tariffs(id)
);

ALTER TABLE tariff_activities ENABLE ROW LEVEL SECURITY;

-- Tariff SOPs Table
CREATE TABLE IF NOT EXISTS tariff_sops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tariff_id uuid,
  tariff_family_id text,
  title text NOT NULL,
  type text NOT NULL,
  content text,
  document_url text,
  document_type text,
  visibility text NOT NULL DEFAULT 'internal',
  version integer NOT NULL DEFAULT 1,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid NOT NULL,
  metadata jsonb DEFAULT '{}',
  CONSTRAINT tariff_sops_tariff_id_fkey FOREIGN KEY (tariff_id) REFERENCES tariffs(id)
);

ALTER TABLE tariff_sops ENABLE ROW LEVEL SECURITY;

-- Tariff SOP Revisions Table
CREATE TABLE IF NOT EXISTS tariff_sop_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sop_id uuid NOT NULL,
  version integer NOT NULL,
  title text NOT NULL,
  content text,
  document_url text,
  changed_by uuid,
  changed_at timestamp with time zone NOT NULL DEFAULT now(),
  change_notes text DEFAULT '',
  CONSTRAINT tariff_sop_revisions_sop_id_fkey FOREIGN KEY (sop_id) REFERENCES tariff_sops(id)
);

ALTER TABLE tariff_sop_revisions ENABLE ROW LEVEL SECURITY;

-- Create indexes for foreign keys and commonly queried fields
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_carriers_user_id ON carriers(user_id);
CREATE INDEX IF NOT EXISTS idx_csp_events_customer_id ON csp_events(customer_id);
CREATE INDEX IF NOT EXISTS idx_csp_events_user_id ON csp_events(user_id);
CREATE INDEX IF NOT EXISTS idx_tariffs_customer_id ON tariffs(customer_id);
CREATE INDEX IF NOT EXISTS idx_tariffs_csp_event_id ON tariffs(csp_event_id);
CREATE INDEX IF NOT EXISTS idx_tariffs_user_id ON tariffs(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_entity_id ON tasks(entity_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_entity_id ON alerts(entity_id);
CREATE INDEX IF NOT EXISTS idx_interactions_entity_id ON interactions(entity_id);
CREATE INDEX IF NOT EXISTS idx_interactions_user_id ON interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_shipments_customer_id ON shipments(customer_id);
CREATE INDEX IF NOT EXISTS idx_shipments_carrier_id ON shipments(carrier_id);
CREATE INDEX IF NOT EXISTS idx_shipments_user_id ON shipments(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_entity_id ON documents(entity_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_entity_id ON calendar_events(entity_id);
CREATE INDEX IF NOT EXISTS idx_carrier_contacts_carrier_id ON carrier_contacts(carrier_id);
CREATE INDEX IF NOT EXISTS idx_csp_event_carriers_csp_event_id ON csp_event_carriers(csp_event_id);
CREATE INDEX IF NOT EXISTS idx_csp_event_carriers_carrier_id ON csp_event_carriers(carrier_id);
CREATE INDEX IF NOT EXISTS idx_email_activities_csp_event_id ON email_activities(csp_event_id);
CREATE INDEX IF NOT EXISTS idx_email_activities_customer_id ON email_activities(customer_id);
CREATE INDEX IF NOT EXISTS idx_email_activities_carrier_id ON email_activities(carrier_id);
CREATE INDEX IF NOT EXISTS idx_email_activities_thread_id ON email_activities(thread_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_tariff_activities_tariff_id ON tariff_activities(tariff_id);
CREATE INDEX IF NOT EXISTS idx_tariff_sops_tariff_id ON tariff_sops(tariff_id);
CREATE INDEX IF NOT EXISTS idx_tariff_sop_revisions_sop_id ON tariff_sop_revisions(sop_id);
