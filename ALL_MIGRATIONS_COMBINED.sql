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
/*
  # Add Mock User Policies

  1. Changes
    - Add policies for mock user ID to bypass RLS checks
    - Allow full CRUD operations for mock data testing
    - Mock user ID: 00000000-0000-0000-0000-000000000000
  
  2. Security
    - These policies only apply to the specific mock user ID
    - Real user data remains protected by existing policies
*/

CREATE POLICY "Mock user can view customers"
  ON customers FOR SELECT
  USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Mock user can insert customers"
  ON customers FOR INSERT
  WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Mock user can update customers"
  ON customers FOR UPDATE
  USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid)
  WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Mock user can delete customers"
  ON customers FOR DELETE
  USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Mock user can view carriers"
  ON carriers FOR SELECT
  USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Mock user can insert carriers"
  ON carriers FOR INSERT
  WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Mock user can update carriers"
  ON carriers FOR UPDATE
  USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid)
  WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Mock user can delete carriers"
  ON carriers FOR DELETE
  USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Mock user can view tariffs"
  ON tariffs FOR SELECT
  USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Mock user can insert tariffs"
  ON tariffs FOR INSERT
  WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Mock user can update tariffs"
  ON tariffs FOR UPDATE
  USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid)
  WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Mock user can delete tariffs"
  ON tariffs FOR DELETE
  USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Mock user can view csp_events"
  ON csp_events FOR SELECT
  USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Mock user can insert csp_events"
  ON csp_events FOR INSERT
  WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Mock user can update csp_events"
  ON csp_events FOR UPDATE
  USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid)
  WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Mock user can delete csp_events"
  ON csp_events FOR DELETE
  USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Mock user can view tasks"
  ON tasks FOR SELECT
  USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Mock user can insert tasks"
  ON tasks FOR INSERT
  WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Mock user can update tasks"
  ON tasks FOR UPDATE
  USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid)
  WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Mock user can delete tasks"
  ON tasks FOR DELETE
  USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Mock user can view alerts"
  ON alerts FOR SELECT
  USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Mock user can insert alerts"
  ON alerts FOR INSERT
  WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Mock user can update alerts"
  ON alerts FOR UPDATE
  USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid)
  WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Mock user can delete alerts"
  ON alerts FOR DELETE
  USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Mock user can view interactions"
  ON interactions FOR SELECT
  USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Mock user can insert interactions"
  ON interactions FOR INSERT
  WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Mock user can delete interactions"
  ON interactions FOR DELETE
  USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Mock user can view shipments"
  ON shipments FOR SELECT
  USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Mock user can insert shipments"
  ON shipments FOR INSERT
  WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Mock user can delete shipments"
  ON shipments FOR DELETE
  USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid);
/*
  # Remove user_id foreign key constraints

  1. Changes
    - Drop foreign key constraints on user_id columns across all tables
    - This allows mock data to be inserted without requiring auth.users entries
  
  2. Security
    - RLS policies still protect data access
    - Only affects the foreign key relationship, not the security model
*/

ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_user_id_fkey;
ALTER TABLE carriers DROP CONSTRAINT IF EXISTS carriers_user_id_fkey;
ALTER TABLE tariffs DROP CONSTRAINT IF EXISTS tariffs_user_id_fkey;
ALTER TABLE csp_events DROP CONSTRAINT IF EXISTS csp_events_user_id_fkey;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_user_id_fkey;
ALTER TABLE interactions DROP CONSTRAINT IF EXISTS interactions_user_id_fkey;
ALTER TABLE alerts DROP CONSTRAINT IF EXISTS alerts_user_id_fkey;
ALTER TABLE shipments DROP CONSTRAINT IF EXISTS shipments_user_id_fkey;
ALTER TABLE lost_opportunities DROP CONSTRAINT IF EXISTS lost_opportunities_user_id_fkey;
ALTER TABLE report_snapshots DROP CONSTRAINT IF EXISTS report_snapshots_user_id_fkey;
/*
  # Create Documents Table

  1. New Tables
    - `documents`
      - `id` (uuid, primary key) - Unique identifier for the document
      - `entity_type` (text, not null) - Type of entity the document belongs to (customer, csp_event, carrier, etc.)
      - `entity_id` (uuid, not null) - ID of the entity the document belongs to
      - `customer_id` (uuid, nullable) - Direct reference to customer for easy filtering
      - `csp_event_id` (uuid, nullable) - Direct reference to CSP event if applicable
      - `file_name` (text, not null) - Original file name
      - `file_path` (text, not null) - Path to file in Supabase Storage
      - `file_size` (integer, default 0) - File size in bytes
      - `file_type` (text, default '') - MIME type of the file
      - `document_type` (text, default 'general') - Category/type of document
      - `description` (text, default '') - Optional description
      - `uploaded_by` (text, default '') - Name of person who uploaded
      - `created_date` (timestamptz, default now()) - Upload timestamp
      - `user_id` (uuid, not null) - User who owns this document
  
  2. Security
    - Enable RLS on `documents` table
    - Add policy for authenticated users to read their own documents
    - Add policy for authenticated users to insert their own documents
    - Add policy for authenticated users to delete their own documents
  
  3. Indexes
    - Create index on entity_type and entity_id for fast lookups
    - Create index on customer_id for filtering customer documents
    - Create index on csp_event_id for filtering CSP event documents

  4. Storage Bucket
    - Create a storage bucket for document uploads
    - Enable RLS on the storage bucket
    - Add policies for authenticated users to upload, read, and delete their own files
*/

CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  csp_event_id uuid REFERENCES csp_events(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer DEFAULT 0,
  file_type text DEFAULT '',
  document_type text DEFAULT 'general',
  description text DEFAULT '',
  uploaded_by text DEFAULT '',
  created_date timestamptz DEFAULT now(),
  user_id uuid NOT NULL
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own documents"
  ON documents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents"
  ON documents FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_documents_entity ON documents(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_documents_customer ON documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_documents_csp_event ON documents(csp_event_id);

INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload their own files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
/*
  # Add Extended Carrier Information

  This migration adds additional fields to the carriers table to support:
  - Complete carrier contact information
  - Service network/geographic coverage
  - Additional business details

  ## New Fields Added
  
  ### Contact Information
    - `website` (text): Carrier's website URL
    - `carrier_rep_name` (text): Primary carrier representative name
    - `carrier_rep_email` (text): Carrier representative email
    - `carrier_rep_phone` (text): Carrier representative phone
    - `billing_contact_name` (text): Billing contact name
    - `billing_contact_email` (text): Billing contact email
    - `billing_contact_phone` (text): Billing contact phone
  
  ### Service Network
    - `service_regions` (text[]): Array of regions served (e.g., ['upper_midwest', 'northeast'])
    - `service_states` (text[]): Array of US state codes served (e.g., ['WI', 'MN', 'IL'])
    - `service_countries` (text[]): Array of country codes (e.g., ['US', 'CA', 'MX'])
    - `coverage_type` (text): Type of coverage - 'national', 'regional', 'local', 'international'
  
  ### Additional Details
    - `equipment_types` (text[]): Types of equipment available (e.g., ['dry_van', 'reefer', 'flatbed'])
    - `specializations` (text[]): Special services offered (e.g., ['hazmat', 'expedited', 'white_glove'])

  ## Notes
  - All new fields are nullable to support gradual data population
  - Using PostgreSQL arrays for multi-value fields (regions, states, equipment types)
  - Existing carrier records will have NULL values for new fields
*/

-- Add contact information fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'carriers' AND column_name = 'website'
  ) THEN
    ALTER TABLE carriers ADD COLUMN website text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'carriers' AND column_name = 'carrier_rep_name'
  ) THEN
    ALTER TABLE carriers ADD COLUMN carrier_rep_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'carriers' AND column_name = 'carrier_rep_email'
  ) THEN
    ALTER TABLE carriers ADD COLUMN carrier_rep_email text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'carriers' AND column_name = 'carrier_rep_phone'
  ) THEN
    ALTER TABLE carriers ADD COLUMN carrier_rep_phone text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'carriers' AND column_name = 'billing_contact_name'
  ) THEN
    ALTER TABLE carriers ADD COLUMN billing_contact_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'carriers' AND column_name = 'billing_contact_email'
  ) THEN
    ALTER TABLE carriers ADD COLUMN billing_contact_email text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'carriers' AND column_name = 'billing_contact_phone'
  ) THEN
    ALTER TABLE carriers ADD COLUMN billing_contact_phone text;
  END IF;
END $$;

-- Add service network fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'carriers' AND column_name = 'service_regions'
  ) THEN
    ALTER TABLE carriers ADD COLUMN service_regions text[];
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'carriers' AND column_name = 'service_states'
  ) THEN
    ALTER TABLE carriers ADD COLUMN service_states text[];
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'carriers' AND column_name = 'service_countries'
  ) THEN
    ALTER TABLE carriers ADD COLUMN service_countries text[] DEFAULT ARRAY['US'];
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'carriers' AND column_name = 'coverage_type'
  ) THEN
    ALTER TABLE carriers ADD COLUMN coverage_type text DEFAULT 'regional';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'carriers' AND column_name = 'equipment_types'
  ) THEN
    ALTER TABLE carriers ADD COLUMN equipment_types text[];
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'carriers' AND column_name = 'specializations'
  ) THEN
    ALTER TABLE carriers ADD COLUMN specializations text[];
  END IF;
END $$;
/*
  # Create function to retrieve all registered users
  
  1. New Functions
    - `get_all_users()` - Returns all users from auth.users with id and email
  
  2. Security
    - Function is accessible to authenticated users only
    - Returns only non-sensitive user information (id, email)
*/

CREATE OR REPLACE FUNCTION get_all_users()
RETURNS TABLE (
  id uuid,
  email text,
  created_at timestamptz
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id,
    au.email,
    au.created_at
  FROM auth.users au
  ORDER BY au.email;
END;
$$;/*
  # Add calendar events and CSP review cadence
  
  1. New Tables
    - `calendar_events`
      - `id` (uuid, primary key)
      - `event_type` (text) - 'csp_review' or 'honeymoon_check'
      - `title` (text)
      - `description` (text)
      - `event_date` (date)
      - `status` (text) - 'pending', 'completed', 'cancelled'
      - `entity_type` (text) - 'customer' or 'csp_event'
      - `entity_id` (uuid)
      - `customer_id` (uuid, foreign key)
      - `csp_event_id` (uuid, foreign key, nullable)
      - `assigned_to` (text)
      - `metadata` (jsonb) - for additional data like honeymoon_day
      - `created_date` (timestamptz)
      - `completed_date` (timestamptz, nullable)
      - `user_id` (uuid)
  
  2. Changes to Existing Tables
    - Add `csp_review_frequency` to customers table
      - Values: 'monthly', 'quarterly', 'semi_annual', 'annual'
    - Add `last_csp_review_date` to customers table
    - Add `next_csp_review_date` to customers table
    - Add `honeymoon_monitoring` to csp_events table (boolean)
    - Add `go_live_date` to csp_events table (date)
  
  3. Security
    - Enable RLS on `calendar_events` table
    - Add policies for authenticated users to manage their own calendar events
*/

-- Add CSP review cadence fields to customers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'csp_review_frequency'
  ) THEN
    ALTER TABLE customers ADD COLUMN csp_review_frequency text DEFAULT 'quarterly';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'last_csp_review_date'
  ) THEN
    ALTER TABLE customers ADD COLUMN last_csp_review_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'next_csp_review_date'
  ) THEN
    ALTER TABLE customers ADD COLUMN next_csp_review_date date;
  END IF;
END $$;

-- Add honeymoon monitoring fields to csp_events table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'csp_events' AND column_name = 'honeymoon_monitoring'
  ) THEN
    ALTER TABLE csp_events ADD COLUMN honeymoon_monitoring boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'csp_events' AND column_name = 'go_live_date'
  ) THEN
    ALTER TABLE csp_events ADD COLUMN go_live_date date;
  END IF;
END $$;

-- Create calendar_events table
CREATE TABLE IF NOT EXISTS calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  event_date date NOT NULL,
  status text DEFAULT 'pending',
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  customer_id uuid REFERENCES customers(id),
  csp_event_id uuid REFERENCES csp_events(id),
  assigned_to text DEFAULT '',
  metadata jsonb DEFAULT '{}',
  created_date timestamptz DEFAULT now(),
  completed_date timestamptz,
  user_id uuid NOT NULL
);

-- Enable RLS
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for calendar_events
CREATE POLICY "Users can view own calendar events"
  ON calendar_events FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own calendar events"
  ON calendar_events FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own calendar events"
  ON calendar_events FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own calendar events"
  ON calendar_events FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_calendar_events_event_date ON calendar_events(event_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_customer_id ON calendar_events(customer_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_csp_event_id ON calendar_events(csp_event_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_status ON calendar_events(status);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON calendar_events(user_id);
/*
  # Email Tracking System

  ## Overview
  Creates a comprehensive email tracking system that captures all customer/carrier communications
  through CC tracking and Gmail API monitoring.

  ## New Tables
  
  ### `email_activities`
  - `id` (uuid, primary key) - Unique identifier
  - `tracking_code` (text, unique, indexed) - Subject line tracking code (e.g., CSP-1234)
  - `csp_event_id` (uuid, foreign key) - Links to calendar_events
  - `customer_id` (uuid, foreign key) - Links to customers
  - `carrier_id` (uuid, foreign key, nullable) - Links to carriers if applicable
  - `thread_id` (text, indexed) - Gmail thread ID for grouping conversations
  - `message_id` (text, unique) - Gmail message ID
  - `subject` (text) - Email subject line
  - `from_email` (text) - Sender email address
  - `from_name` (text) - Sender name
  - `to_emails` (text[]) - Array of recipient emails
  - `cc_emails` (text[]) - Array of CC emails
  - `body_text` (text) - Plain text email body
  - `body_html` (text) - HTML email body
  - `direction` (text) - 'outbound' or 'inbound'
  - `sent_at` (timestamptz) - When email was sent/received
  - `created_at` (timestamptz) - When record was created
  - `created_by` (uuid, foreign key) - User who sent (for outbound)
  - `metadata` (jsonb) - Additional data (attachments, labels, etc.)

  ### `gmail_watch_subscriptions`
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid, foreign key) - Links to auth.users
  - `email_address` (text) - Gmail address being watched
  - `history_id` (text) - Gmail history ID for incremental sync
  - `expiration` (timestamptz) - When watch expires
  - `is_active` (boolean) - Whether watch is currently active
  - `created_at` (timestamptz) - When subscription was created
  - `updated_at` (timestamptz) - Last update

  ## Security
  - Enable RLS on all tables
  - Authenticated users can view email activities for their organization
  - Only authenticated users can create email activities
  - Gmail watch subscriptions are user-specific

  ## Indexes
  - `tracking_code` for quick lookup
  - `thread_id` for grouping conversations
  - `csp_event_id` for event-based queries
  - `customer_id` and `carrier_id` for timeline views
*/

-- Create email_activities table
CREATE TABLE IF NOT EXISTS email_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_code text UNIQUE NOT NULL,
  csp_event_id uuid REFERENCES calendar_events(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  carrier_id uuid REFERENCES carriers(id) ON DELETE SET NULL,
  thread_id text,
  message_id text UNIQUE NOT NULL,
  subject text NOT NULL,
  from_email text NOT NULL,
  from_name text,
  to_emails text[] NOT NULL DEFAULT '{}',
  cc_emails text[] NOT NULL DEFAULT '{}',
  body_text text,
  body_html text,
  direction text NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create indexes for email_activities
CREATE INDEX IF NOT EXISTS idx_email_activities_tracking_code ON email_activities(tracking_code);
CREATE INDEX IF NOT EXISTS idx_email_activities_thread_id ON email_activities(thread_id);
CREATE INDEX IF NOT EXISTS idx_email_activities_csp_event_id ON email_activities(csp_event_id);
CREATE INDEX IF NOT EXISTS idx_email_activities_customer_id ON email_activities(customer_id);
CREATE INDEX IF NOT EXISTS idx_email_activities_carrier_id ON email_activities(carrier_id);
CREATE INDEX IF NOT EXISTS idx_email_activities_sent_at ON email_activities(sent_at DESC);

-- Create gmail_watch_subscriptions table
CREATE TABLE IF NOT EXISTS gmail_watch_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email_address text NOT NULL,
  history_id text NOT NULL,
  expiration timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, email_address)
);

-- Create index for active subscriptions
CREATE INDEX IF NOT EXISTS idx_gmail_watch_active ON gmail_watch_subscriptions(is_active, expiration);

-- Enable RLS
ALTER TABLE email_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmail_watch_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_activities

-- Allow authenticated users to view all email activities (organization-wide)
CREATE POLICY "Authenticated users can view email activities"
  ON email_activities
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert email activities
CREATE POLICY "Authenticated users can create email activities"
  ON email_activities
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow users to update their own sent emails
CREATE POLICY "Users can update their own email activities"
  ON email_activities
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- RLS Policies for gmail_watch_subscriptions

-- Users can view their own subscriptions
CREATE POLICY "Users can view own gmail subscriptions"
  ON gmail_watch_subscriptions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can create their own subscriptions
CREATE POLICY "Users can create own gmail subscriptions"
  ON gmail_watch_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own subscriptions
CREATE POLICY "Users can update own gmail subscriptions"
  ON gmail_watch_subscriptions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own subscriptions
CREATE POLICY "Users can delete own gmail subscriptions"
  ON gmail_watch_subscriptions
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Function to generate tracking codes
CREATE OR REPLACE FUNCTION generate_tracking_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  LOOP
    -- Generate code like CSP-1234
    new_code := 'CSP-' || LPAD(floor(random() * 10000)::text, 4, '0');
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM email_activities WHERE tracking_code = new_code) INTO code_exists;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;
/*
  # User Gmail Tokens Table

  ## Overview
  Stores OAuth tokens for Gmail API access per user, enabling email sending and inbox monitoring.

  ## New Tables
  
  ### `user_gmail_tokens`
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid, foreign key) - Links to auth.users
  - `email_address` (text) - Gmail address
  - `access_token` (text) - Gmail OAuth access token
  - `refresh_token` (text) - Gmail OAuth refresh token
  - `token_expiry` (timestamptz) - When access token expires
  - `created_at` (timestamptz) - When record was created
  - `updated_at` (timestamptz) - Last update

  ## Security
  - Enable RLS on table
  - Users can only access their own tokens
  - Tokens are sensitive and should be encrypted at rest (handled by Supabase)
*/

-- Create user_gmail_tokens table
CREATE TABLE IF NOT EXISTS user_gmail_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email_address text NOT NULL,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_expiry timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_gmail_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view their own tokens
CREATE POLICY "Users can view own gmail tokens"
  ON user_gmail_tokens
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own tokens
CREATE POLICY "Users can insert own gmail tokens"
  ON user_gmail_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own tokens
CREATE POLICY "Users can update own gmail tokens"
  ON user_gmail_tokens
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own tokens
CREATE POLICY "Users can delete own gmail tokens"
  ON user_gmail_tokens
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
/*
  # User Roles and Permissions System

  ## Overview
  Implements a role-based access control (RBAC) system with two roles:
  - Administrator: Full access to all features, user management, and system settings
  - Basic User: Standard access to CRM features but no admin capabilities

  ## New Tables

  ### `user_profiles`
  - `id` (uuid, primary key) - Links to auth.users
  - `email` (text) - User's email address
  - `full_name` (text) - User's full name
  - `role` (text) - User role: 'admin' or 'basic'
  - `is_active` (boolean) - Whether user account is active
  - `created_at` (timestamptz) - When profile was created
  - `updated_at` (timestamptz) - Last update
  - `created_by` (uuid, foreign key) - Admin who created this user
  - `metadata` (jsonb) - Additional user data

  ## Security
  - Enable RLS on user_profiles table
  - All users can view their own profile
  - Only admins can view all profiles
  - Only admins can create/update/delete user profiles
  - First user to register automatically becomes admin

  ## Helper Functions
  - `is_admin()` - Check if current user is an admin
  - `ensure_first_user_is_admin()` - Trigger to make first user admin
*/

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  role text NOT NULL DEFAULT 'basic' CHECK (role IN ('admin', 'basic')),
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create index on role for faster queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_active ON user_profiles(is_active);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role = 'admin'
    AND is_active = true
  );
END;
$$;

-- RLS Policies for user_profiles

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- Only admins can insert new user profiles
CREATE POLICY "Admins can create user profiles"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- Admins can update all profiles (except changing their own role)
CREATE POLICY "Admins can update user profiles"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (
    is_admin() AND (
      -- Admins can update others freely
      id != auth.uid() OR
      -- Admins can update their own profile but not change their role
      (id = auth.uid() AND role = (SELECT role FROM user_profiles WHERE id = auth.uid()))
    )
  );

-- Users can update their own non-privileged fields
CREATE POLICY "Users can update own profile metadata"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid() AND
    role = (SELECT role FROM user_profiles WHERE id = auth.uid())
  );

-- Only admins can delete user profiles
CREATE POLICY "Admins can delete user profiles"
  ON user_profiles
  FOR DELETE
  TO authenticated
  USING (is_admin() AND id != auth.uid());

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_count integer;
  user_role text;
BEGIN
  -- Check if this is the first user
  SELECT COUNT(*) INTO user_count FROM user_profiles;
  
  -- First user becomes admin, others are basic by default
  IF user_count = 0 THEN
    user_role := 'admin';
  ELSE
    user_role := 'basic';
  END IF;

  -- Create user profile
  INSERT INTO user_profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    user_role
  );

  RETURN NEW;
END;
$$;

-- Trigger to create user profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Function to get user role
CREATE OR REPLACE FUNCTION get_user_role(user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM user_profiles
  WHERE id = user_id;
  
  RETURN COALESCE(user_role, 'basic');
END;
$$;

-- Update existing auth.users to have profiles (if any exist)
DO $$
DECLARE
  user_record RECORD;
  user_count integer;
  is_first boolean := true;
BEGIN
  SELECT COUNT(*) INTO user_count FROM user_profiles;
  
  -- Only create profiles if none exist yet
  IF user_count = 0 THEN
    FOR user_record IN SELECT id, email, raw_user_meta_data FROM auth.users
    LOOP
      INSERT INTO user_profiles (id, email, full_name, role)
      VALUES (
        user_record.id,
        user_record.email,
        COALESCE(user_record.raw_user_meta_data->>'full_name', user_record.email),
        CASE WHEN is_first THEN 'admin' ELSE 'basic' END
      )
      ON CONFLICT (id) DO NOTHING;
      
      is_first := false;
    END LOOP;
  END IF;
END $$;
/*
  # User Invitation System

  ## Overview
  Allows administrators to invite new users via email. Invited users receive an email
  with a link to create their account with a pre-assigned role.

  ## New Tables

  ### `user_invitations`
  - `id` (uuid, primary key) - Unique identifier
  - `email` (text, unique) - Invited user's email address
  - `role` (text) - Pre-assigned role: 'admin' or 'basic'
  - `invited_by` (uuid, foreign key) - Admin who sent the invitation
  - `token` (text, unique) - Unique invitation token for verification
  - `status` (text) - Invitation status: 'pending', 'accepted', 'expired'
  - `expires_at` (timestamptz) - When invitation expires
  - `accepted_at` (timestamptz, nullable) - When invitation was accepted
  - `created_at` (timestamptz) - When invitation was created
  - `metadata` (jsonb) - Additional invitation data

  ## Security
  - Enable RLS on user_invitations table
  - Only admins can create invitations
  - Only admins can view all invitations
  - Anyone can view their own invitation by token (for acceptance flow)
  - Invitations expire after 7 days by default

  ## Indexes
  - `email` for quick lookup
  - `token` for verification
  - `status` for filtering active invitations
*/

-- Create user_invitations table
CREATE TABLE IF NOT EXISTS user_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role text NOT NULL DEFAULT 'basic' CHECK (role IN ('admin', 'basic')),
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  token text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  UNIQUE(email, status)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON user_invitations(token);
CREATE INDEX IF NOT EXISTS idx_user_invitations_status ON user_invitations(status);
CREATE INDEX IF NOT EXISTS idx_user_invitations_expires_at ON user_invitations(expires_at);

-- Enable RLS
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_invitations

-- Admins can view all invitations
CREATE POLICY "Admins can view all invitations"
  ON user_invitations
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- Anyone can view invitation by token (for acceptance)
CREATE POLICY "Anyone can view invitation by token"
  ON user_invitations
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Admins can create invitations
CREATE POLICY "Admins can create invitations"
  ON user_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- Admins can update invitations (cancel, etc)
CREATE POLICY "Admins can update invitations"
  ON user_invitations
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Admins can delete invitations
CREATE POLICY "Admins can delete invitations"
  ON user_invitations
  FOR DELETE
  TO authenticated
  USING (is_admin());

-- Function to generate invitation token
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  new_token text;
  token_exists boolean;
BEGIN
  LOOP
    new_token := encode(gen_random_bytes(32), 'base64');
    new_token := replace(new_token, '/', '_');
    new_token := replace(new_token, '+', '-');
    new_token := replace(new_token, '=', '');
    
    SELECT EXISTS(SELECT 1 FROM user_invitations WHERE token = new_token) INTO token_exists;
    
    EXIT WHEN NOT token_exists;
  END LOOP;
  
  RETURN new_token;
END;
$$;

-- Function to automatically expire old invitations
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE user_invitations
  SET status = 'expired'
  WHERE status = 'pending'
  AND expires_at < now();
END;
$$;

-- Function to cancel existing pending invitations for email before creating new one
CREATE OR REPLACE FUNCTION cancel_existing_invitations()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE user_invitations
  SET status = 'cancelled'
  WHERE email = NEW.email
  AND status = 'pending'
  AND id != NEW.id;
  
  RETURN NEW;
END;
$$;

-- Trigger to cancel existing invitations
DROP TRIGGER IF EXISTS on_invitation_created ON user_invitations;
CREATE TRIGGER on_invitation_created
  AFTER INSERT ON user_invitations
  FOR EACH ROW
  EXECUTE FUNCTION cancel_existing_invitations();
/*
  # Fix User Profile Creation Trigger

  ## Changes
  - Update handle_new_user() function to properly bypass RLS
  - Ensure trigger can create user profiles without policy conflicts
  - Add created_by to track who created the profile (self for signups)

  ## Security
  - Function uses SECURITY DEFINER to bypass RLS for user creation
  - Only triggered on new auth.users inserts (controlled by Supabase Auth)
*/

-- Drop and recreate the function with proper permissions
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count integer;
  user_role text;
BEGIN
  -- Check if this is the first user
  SELECT COUNT(*) INTO user_count FROM user_profiles;
  
  -- First user becomes admin, others are basic by default
  IF user_count = 0 THEN
    user_role := 'admin';
  ELSE
    user_role := 'basic';
  END IF;

  -- Create user profile (bypasses RLS because of SECURITY DEFINER)
  INSERT INTO user_profiles (id, email, full_name, role, created_by)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    user_role,
    NEW.id
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Add policy to allow the function to insert (belt and suspenders approach)
DROP POLICY IF EXISTS "Allow trigger to create user profiles" ON user_profiles;
CREATE POLICY "Allow trigger to create user profiles"
  ON user_profiles
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (id = auth.uid() OR auth.uid() IS NULL);
/*
  # CSP Event Stage History Tracking

  ## Overview
  Tracks all stage changes for CSP events to enable user performance analytics
  and reporting on how deals progress through the pipeline.

  ## New Tables

  ### `csp_stage_history`
  - `id` (uuid, primary key) - Unique identifier
  - `csp_event_id` (uuid, foreign key) - References csp_events
  - `customer_id` (uuid, foreign key) - References customers
  - `previous_stage` (text) - Stage before change (null for new events)
  - `new_stage` (text) - Stage after change
  - `changed_by` (uuid, foreign key) - User who made the change
  - `changed_at` (timestamptz) - When the change occurred
  - `days_in_previous_stage` (integer) - Time spent in previous stage
  - `notes` (text) - Optional notes about the change
  - `metadata` (jsonb) - Additional context

  ## Security
  - Enable RLS on csp_stage_history table
  - All authenticated users can view history
  - Only event owners can create history entries
  - History is immutable (no updates or deletes)

  ## Indexes
  - `csp_event_id` for event lookup
  - `changed_by` for user analytics
  - `changed_at` for time-based queries
  - `new_stage` for stage-based filtering
*/

-- Create csp_stage_history table
CREATE TABLE IF NOT EXISTS csp_stage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  csp_event_id uuid NOT NULL REFERENCES csp_events(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  previous_stage text,
  new_stage text NOT NULL,
  changed_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  days_in_previous_stage integer DEFAULT 0,
  notes text DEFAULT '',
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_csp_stage_history_event ON csp_stage_history(csp_event_id);
CREATE INDEX IF NOT EXISTS idx_csp_stage_history_customer ON csp_stage_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_csp_stage_history_user ON csp_stage_history(changed_by);
CREATE INDEX IF NOT EXISTS idx_csp_stage_history_date ON csp_stage_history(changed_at);
CREATE INDEX IF NOT EXISTS idx_csp_stage_history_stage ON csp_stage_history(new_stage);

-- Enable RLS
ALTER TABLE csp_stage_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for csp_stage_history

-- All users can view stage history
CREATE POLICY "Users can view stage history"
  ON csp_stage_history
  FOR SELECT
  TO authenticated
  USING (true);

-- Only event owners can create history entries
CREATE POLICY "Users can create stage history"
  ON csp_stage_history
  FOR INSERT
  TO authenticated
  WITH CHECK (changed_by = auth.uid());

-- No updates or deletes (history is immutable)

-- Function to automatically track stage changes
CREATE OR REPLACE FUNCTION track_csp_stage_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  previous_stage_value text;
  days_in_stage integer;
  last_change_date timestamptz;
BEGIN
  -- Only track if stage actually changed
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    previous_stage_value := OLD.stage;
    
    -- Calculate days in previous stage
    SELECT changed_at INTO last_change_date
    FROM csp_stage_history
    WHERE csp_event_id = NEW.id
    ORDER BY changed_at DESC
    LIMIT 1;
    
    IF last_change_date IS NOT NULL THEN
      days_in_stage := EXTRACT(DAY FROM (now() - last_change_date));
    ELSE
      days_in_stage := EXTRACT(DAY FROM (now() - OLD.created_date));
    END IF;
    
    -- Insert stage history record
    INSERT INTO csp_stage_history (
      csp_event_id,
      customer_id,
      previous_stage,
      new_stage,
      changed_by,
      changed_at,
      days_in_previous_stage
    ) VALUES (
      NEW.id,
      NEW.customer_id,
      previous_stage_value,
      NEW.stage,
      auth.uid(),
      now(),
      COALESCE(days_in_stage, 0)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to track stage changes on csp_events
DROP TRIGGER IF EXISTS on_csp_stage_change ON csp_events;
CREATE TRIGGER on_csp_stage_change
  AFTER UPDATE ON csp_events
  FOR EACH ROW
  EXECUTE FUNCTION track_csp_stage_change();

-- Function to track initial stage when event is created
CREATE OR REPLACE FUNCTION track_initial_csp_stage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO csp_stage_history (
    csp_event_id,
    customer_id,
    previous_stage,
    new_stage,
    changed_by,
    changed_at,
    days_in_previous_stage
  ) VALUES (
    NEW.id,
    NEW.customer_id,
    NULL,
    NEW.stage,
    auth.uid(),
    now(),
    0
  );
  
  RETURN NEW;
END;
$$;

-- Trigger to track initial stage
DROP TRIGGER IF EXISTS on_csp_event_created ON csp_events;
CREATE TRIGGER on_csp_event_created
  AFTER INSERT ON csp_events
  FOR EACH ROW
  EXECUTE FUNCTION track_initial_csp_stage();
/*
  # Add Alert Assignment and Recommended Action

  1. Changes
    - Add `assigned_to` column to alerts table to track who owns the alert
    - Add `recommended_action` column if it doesn't exist already
  
  2. Security
    - No changes to RLS policies needed
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'alerts' AND column_name = 'assigned_to'
  ) THEN
    ALTER TABLE alerts ADD COLUMN assigned_to uuid REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'alerts' AND column_name = 'recommended_action'
  ) THEN
    ALTER TABLE alerts ADD COLUMN recommended_action text;
  END IF;
END $$;
/*
  # Add Customer Segment/Revenue Tier

  1. Changes
    - Add `segment` column to customers table
    - Values: 'Enterprise', 'Mid-Market', 'SMB'
    - Default to 'Mid-Market'

  2. Purpose
    - Helps analysts prioritize which customers justify heavy bid preparation
    - Provides instant context for customer importance
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'segment'
  ) THEN
    ALTER TABLE customers ADD COLUMN segment text DEFAULT 'Mid-Market';
  END IF;
END $$;
/*
  # Add customer_ids to tariffs table

  1. Changes
    - Add `customer_ids` column to store multiple customers for blanket tariffs
    - This allows blanket tariffs to be associated with multiple customers
  
  2. Notes
    - Existing single customer relationships remain in `customer_id` column
    - For blanket tariffs, use `customer_ids` array instead
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tariffs' AND column_name = 'customer_ids'
  ) THEN
    ALTER TABLE tariffs ADD COLUMN customer_ids uuid[] DEFAULT '{}';
  END IF;
END $$;
/*
  # Add CSP Event Link to Tariffs

  1. Changes
    - Add `csp_event_id` column to tariffs table to link tariffs with the RFP/CSP event that generated them
    - Add foreign key constraint to ensure referential integrity

  2. Purpose
    - Enable cross-linking between tariffs and the CSP events that generated them
    - Allow users to view the related RFP from a tariff detail page
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tariffs' AND column_name = 'csp_event_id'
  ) THEN
    ALTER TABLE tariffs ADD COLUMN csp_event_id uuid REFERENCES csp_events(id) ON DELETE SET NULL;
  END IF;
END $$;/*
  # Add Mode Field to CSP Events

  1. Changes
    - Add `mode` column to csp_events table for categorizing freight type
    - Common values: LTL, Truckload, Home Delivery, Parcel, Intermodal

  2. Purpose
    - Enable filtering and sorting of CSP events by freight mode
    - Better organization and visibility for different service types
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'csp_events' AND column_name = 'mode'
  ) THEN
    ALTER TABLE csp_events ADD COLUMN mode text;
  END IF;
END $$;/*
  # Fix get_all_users function type mismatch

  1. Changes
    - Update get_all_users function to properly cast email from varchar to text
    - Ensures compatibility with auth.users schema

  2. Notes
    - Fixes error: "Returned type character varying(255) does not match expected type text"
*/

CREATE OR REPLACE FUNCTION get_all_users()
RETURNS TABLE (
  id uuid,
  email text,
  created_at timestamptz
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    au.id,
    au.email::text,
    au.created_at
  FROM auth.users au
  ORDER BY au.email;
END;
$$;
/*
  # Add Document Metadata and AI Summary Support

  1. Changes to documents table
    - Add `data_range_start` (date, nullable) - Start date of data in the file
    - Add `data_range_end` (date, nullable) - End date of data in the file
    - Add `version` (integer, default 1) - Version number for file revisions
    - Add `ai_processing_status` (text, default 'pending') - Status: pending, processing, completed, failed
    - Add `ai_summary` (text, nullable) - AI-generated summary of the file contents
    - Add `ai_summary_generated_at` (timestamptz, nullable) - When the AI summary was created
    
  2. New document_type values
    - 'transaction_detail' - Transaction/shipment detail files
    - 'lost_opportunity' - Lost opportunity files
    - 'summary' - AI-generated summary reports
    - 'general' - Other documents

  3. New csp_events fields
    - Add `strategy_summary` (jsonb, default '{}') - Stores AI-generated topline summary with metadata
    - Add `strategy_summary_updated_at` (timestamptz, nullable) - When the summary was last updated
    
  4. Notes
    - Existing documents will retain their current structure
    - New fields are nullable to support backwards compatibility
    - AI processing happens asynchronously after upload
*/

-- Add new columns to documents table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'data_range_start'
  ) THEN
    ALTER TABLE documents ADD COLUMN data_range_start date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'data_range_end'
  ) THEN
    ALTER TABLE documents ADD COLUMN data_range_end date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'version'
  ) THEN
    ALTER TABLE documents ADD COLUMN version integer DEFAULT 1;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'ai_processing_status'
  ) THEN
    ALTER TABLE documents ADD COLUMN ai_processing_status text DEFAULT 'pending';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'ai_summary'
  ) THEN
    ALTER TABLE documents ADD COLUMN ai_summary text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'ai_summary_generated_at'
  ) THEN
    ALTER TABLE documents ADD COLUMN ai_summary_generated_at timestamptz;
  END IF;
END $$;

-- Add strategy summary fields to csp_events table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'csp_events' AND column_name = 'strategy_summary'
  ) THEN
    ALTER TABLE csp_events ADD COLUMN strategy_summary jsonb DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'csp_events' AND column_name = 'strategy_summary_updated_at'
  ) THEN
    ALTER TABLE csp_events ADD COLUMN strategy_summary_updated_at timestamptz;
  END IF;
END $$;

-- Create index for faster document queries by version
CREATE INDEX IF NOT EXISTS idx_documents_version ON documents(entity_id, document_type, version DESC);

-- Create index for AI processing status
CREATE INDEX IF NOT EXISTS idx_documents_ai_status ON documents(ai_processing_status) WHERE ai_processing_status != 'completed';
/*
  # Fix Documents Table RLS Policy

  1. Changes
    - Update INSERT policy to allow users to insert documents where they are the user_id
    - Add policy to allow service role to bypass RLS for system operations
    - Ensure mock user can create documents for testing

  2. Security
    - Maintains user ownership validation
    - Allows authenticated users to create their own documents
    - Service role has full access for system operations
*/

-- Drop existing restrictive INSERT policy
DROP POLICY IF EXISTS "Users can insert their own documents" ON documents;

-- Create new INSERT policy that works with the current authentication
CREATE POLICY "Users can insert their own documents"
  ON documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id 
    OR user_id = '00000000-0000-0000-0000-000000000000'::uuid
  );

-- Also update SELECT to allow viewing mock user documents
DROP POLICY IF EXISTS "Users can view their own documents" ON documents;

CREATE POLICY "Users can view their own documents"
  ON documents
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR user_id = '00000000-0000-0000-0000-000000000000'::uuid
  );

-- Update DELETE policy
DROP POLICY IF EXISTS "Users can delete their own documents" ON documents;

CREATE POLICY "Users can delete their own documents"
  ON documents
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR user_id = '00000000-0000-0000-0000-000000000000'::uuid
  );
/*
  # Fix get_all_users function email type

  1. Changes
    - Drop and recreate get_all_users function with proper email casting
    - Ensures email column is returned as text, not varchar(255)

  2. Notes
    - Fixes error: "Returned type character varying(255) does not match expected type text"
*/

DROP FUNCTION IF EXISTS get_all_users();

CREATE OR REPLACE FUNCTION get_all_users()
RETURNS TABLE (
  id uuid,
  email text,
  created_at timestamptz
)
SECURITY DEFINER
SET search_path = auth, public
LANGUAGE sql
AS $$
  SELECT
    au.id,
    au.email::text,
    au.created_at
  FROM auth.users au
  ORDER BY au.email;
$$;

GRANT EXECUTE ON FUNCTION get_all_users() TO authenticated;
/*
  # Create AI Chatbot Settings Table

  1. New Tables
    - `ai_chatbot_settings`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users, can be null for org-wide settings)
      - `organization_id` (text, for multi-tenant support)
      - `instructions` (text, custom instructions for the AI)
      - `knowledge_base` (text, custom knowledge base content)
      - `temperature` (numeric, controls AI creativity, default 0.7)
      - `max_tokens` (integer, max response length, default 1000)
      - `is_active` (boolean, whether these settings are active)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `ai_chatbot_settings` table
    - Add policies for authenticated users to manage their own settings
    - Add policy for reading organization-wide settings
*/

CREATE TABLE IF NOT EXISTS ai_chatbot_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id text,
  instructions text DEFAULT 'You are a helpful logistics and procurement analyst. Provide clear, actionable insights based on the shipment data.',
  knowledge_base text DEFAULT '',
  temperature numeric DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 2),
  max_tokens integer DEFAULT 1000 CHECK (max_tokens > 0 AND max_tokens <= 4000),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE ai_chatbot_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own settings
CREATE POLICY "Users can read own AI settings"
  ON ai_chatbot_settings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own settings
CREATE POLICY "Users can insert own AI settings"
  ON ai_chatbot_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own settings
CREATE POLICY "Users can update own AI settings"
  ON ai_chatbot_settings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own settings
CREATE POLICY "Users can delete own AI settings"
  ON ai_chatbot_settings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can read organization-wide settings (where user_id is null)
CREATE POLICY "Users can read org-wide AI settings"
  ON ai_chatbot_settings
  FOR SELECT
  TO authenticated
  USING (user_id IS NULL);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_ai_chatbot_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ai_chatbot_settings_updated_at
  BEFORE UPDATE ON ai_chatbot_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_chatbot_settings_updated_at();

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ai_chatbot_settings_user_id ON ai_chatbot_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chatbot_settings_active ON ai_chatbot_settings(is_active) WHERE is_active = true;
/*
  # Create CSP Event Interaction Auto-Logging

  ## Overview
  This migration creates triggers that automatically log CSP events as interactions
  for customers and carriers whenever CSP events are created or updated.

  ## Changes
  
  1. Functions Created
    - `log_csp_event_as_interaction()` - Logs new CSP events as customer/carrier interactions
    - `log_csp_event_update_as_interaction()` - Logs CSP event updates as interactions
  
  2. Triggers Created
    - Automatically create interaction when CSP event is inserted
    - Automatically create interaction when CSP event customer/carrier changes
  
  3. Backfill
    - Creates interactions for all existing CSP events
  
  ## Security
    - Functions run with proper user context
    - Maintains existing RLS policies
*/

-- Function to log CSP event creation as interaction
CREATE OR REPLACE FUNCTION log_csp_event_as_interaction()
RETURNS TRIGGER AS $$
BEGIN
  -- Log interaction for customer if customer_id exists
  IF NEW.customer_id IS NOT NULL THEN
    INSERT INTO interactions (
      entity_type,
      entity_id,
      interaction_type,
      summary,
      details,
      metadata,
      created_date,
      user_id
    ) VALUES (
      'customer',
      NEW.customer_id,
      'csp_event',
      'CSP Event Created: ' || NEW.title,
      'A new CSP event titled "' || NEW.title || '" was created with status: ' || COALESCE(NEW.status, 'unknown') || ' and stage: ' || COALESCE(NEW.stage, 'unknown'),
      jsonb_build_object(
        'csp_event_id', NEW.id,
        'csp_event_title', NEW.title,
        'status', NEW.status,
        'stage', NEW.stage,
        'due_date', NEW.due_date,
        'target_savings', NEW.target_savings,
        'mode', NEW.mode
      ),
      NEW.created_date,
      NEW.user_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log CSP event updates as interaction
CREATE OR REPLACE FUNCTION log_csp_event_update_as_interaction()
RETURNS TRIGGER AS $$
DECLARE
  change_summary TEXT := '';
  changes_detected BOOLEAN := FALSE;
BEGIN
  -- Check if customer_id changed (entity association changed)
  IF OLD.customer_id IS DISTINCT FROM NEW.customer_id THEN
    changes_detected := TRUE;
    
    -- Remove from old customer if there was one
    IF OLD.customer_id IS NOT NULL THEN
      INSERT INTO interactions (
        entity_type,
        entity_id,
        interaction_type,
        summary,
        details,
        metadata,
        created_date,
        user_id
      ) VALUES (
        'customer',
        OLD.customer_id,
        'csp_event',
        'CSP Event Removed: ' || NEW.title,
        'The CSP event "' || NEW.title || '" was disassociated from this customer.',
        jsonb_build_object(
          'csp_event_id', NEW.id,
          'csp_event_title', NEW.title,
          'action', 'removed'
        ),
        NOW(),
        NEW.user_id
      );
    END IF;
    
    -- Add to new customer if there is one
    IF NEW.customer_id IS NOT NULL THEN
      INSERT INTO interactions (
        entity_type,
        entity_id,
        interaction_type,
        summary,
        details,
        metadata,
        created_date,
        user_id
      ) VALUES (
        'customer',
        NEW.customer_id,
        'csp_event',
        'CSP Event Associated: ' || NEW.title,
        'The CSP event "' || NEW.title || '" was associated with this customer with status: ' || COALESCE(NEW.status, 'unknown'),
        jsonb_build_object(
          'csp_event_id', NEW.id,
          'csp_event_title', NEW.title,
          'status', NEW.status,
          'stage', NEW.stage,
          'action', 'associated'
        ),
        NOW(),
        NEW.user_id
      );
    END IF;
  -- If customer didn't change but status or stage changed, log update for existing customer
  ELSIF NEW.customer_id IS NOT NULL AND (
    OLD.status IS DISTINCT FROM NEW.status OR 
    OLD.stage IS DISTINCT FROM NEW.stage
  ) THEN
    changes_detected := TRUE;
    
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      change_summary := 'Status changed from "' || COALESCE(OLD.status, 'none') || '" to "' || COALESCE(NEW.status, 'none') || '"';
    END IF;
    
    IF OLD.stage IS DISTINCT FROM NEW.stage THEN
      IF change_summary != '' THEN
        change_summary := change_summary || '; ';
      END IF;
      change_summary := change_summary || 'Stage changed from "' || COALESCE(OLD.stage, 'none') || '" to "' || COALESCE(NEW.stage, 'none') || '"';
    END IF;
    
    INSERT INTO interactions (
      entity_type,
      entity_id,
      interaction_type,
      summary,
      details,
      metadata,
      created_date,
      user_id
    ) VALUES (
      'customer',
      NEW.customer_id,
      'csp_event',
      'CSP Event Updated: ' || NEW.title,
      change_summary,
      jsonb_build_object(
        'csp_event_id', NEW.id,
        'csp_event_title', NEW.title,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'old_stage', OLD.stage,
        'new_stage', NEW.stage,
        'action', 'updated'
      ),
      NOW(),
      NEW.user_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new CSP events
DROP TRIGGER IF EXISTS trigger_log_csp_event_creation ON csp_events;
CREATE TRIGGER trigger_log_csp_event_creation
  AFTER INSERT ON csp_events
  FOR EACH ROW
  EXECUTE FUNCTION log_csp_event_as_interaction();

-- Create trigger for CSP event updates
DROP TRIGGER IF EXISTS trigger_log_csp_event_update ON csp_events;
CREATE TRIGGER trigger_log_csp_event_update
  AFTER UPDATE ON csp_events
  FOR EACH ROW
  EXECUTE FUNCTION log_csp_event_update_as_interaction();

-- Backfill: Create interactions for all existing CSP events
INSERT INTO interactions (
  entity_type,
  entity_id,
  interaction_type,
  summary,
  details,
  metadata,
  created_date,
  user_id
)
SELECT 
  'customer',
  ce.customer_id,
  'csp_event',
  'CSP Event: ' || ce.title,
  'CSP event "' || ce.title || '" with status: ' || COALESCE(ce.status, 'unknown') || ' and stage: ' || COALESCE(ce.stage, 'unknown'),
  jsonb_build_object(
    'csp_event_id', ce.id,
    'csp_event_title', ce.title,
    'status', ce.status,
    'stage', ce.stage,
    'due_date', ce.due_date,
    'backfilled', true
  ),
  ce.created_date,
  ce.user_id
FROM csp_events ce
WHERE ce.customer_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM interactions i
    WHERE i.entity_type = 'customer'
      AND i.entity_id = ce.customer_id
      AND i.interaction_type = 'csp_event'
      AND i.metadata->>'csp_event_id' = ce.id::text
  );
/*
  # Create Tariff Interaction Auto-Logging (Fixed)

  ## Overview
  This migration creates triggers that automatically log tariffs as interactions
  for customers and carriers whenever tariffs are created or updated.

  ## Changes
  
  1. Functions Created
    - `log_tariff_as_interaction()` - Logs new tariffs as customer/carrier interactions
    - `log_tariff_update_as_interaction()` - Logs tariff updates as interactions
  
  2. Triggers Created
    - Automatically create interaction when tariff is inserted
    - Automatically create interaction when tariff customer/carrier changes
  
  3. Backfill
    - Creates interactions for all existing tariffs
  
  ## Security
    - Functions run with proper user context
    - Maintains existing RLS policies
*/

-- Function to log tariff creation as interaction
CREATE OR REPLACE FUNCTION log_tariff_as_interaction()
RETURNS TRIGGER AS $$
DECLARE
  customer_name_val TEXT;
  carrier_names_val TEXT[];
BEGIN
  -- Get customer name if customer_id exists
  IF NEW.customer_id IS NOT NULL THEN
    SELECT name INTO customer_name_val 
    FROM customers 
    WHERE id = NEW.customer_id;
    
    INSERT INTO interactions (
      entity_type,
      entity_id,
      interaction_type,
      summary,
      details,
      metadata,
      created_date,
      user_id
    ) VALUES (
      'customer',
      NEW.customer_id,
      'tariff',
      'Tariff Created',
      'A new tariff was created, effective from ' || COALESCE(NEW.effective_date::text, 'TBD') || ' to ' || COALESCE(NEW.expiry_date::text, 'TBD'),
      jsonb_build_object(
        'tariff_id', NEW.id,
        'effective_date', NEW.effective_date,
        'expiry_date', NEW.expiry_date,
        'status', NEW.status,
        'version', NEW.version
      ),
      NEW.created_date,
      NEW.user_id
    );
  END IF;

  -- Log interaction for each carrier in carrier_ids array
  IF NEW.carrier_ids IS NOT NULL AND array_length(NEW.carrier_ids, 1) > 0 THEN
    INSERT INTO interactions (
      entity_type,
      entity_id,
      interaction_type,
      summary,
      details,
      metadata,
      created_date,
      user_id
    )
    SELECT
      'carrier',
      carrier_id,
      'tariff',
      'Tariff Created',
      'A new tariff was created' || CASE WHEN customer_name_val IS NOT NULL THEN ' with ' || customer_name_val ELSE '' END || ', effective from ' || COALESCE(NEW.effective_date::text, 'TBD'),
      jsonb_build_object(
        'tariff_id', NEW.id,
        'customer_name', customer_name_val,
        'effective_date', NEW.effective_date,
        'expiry_date', NEW.expiry_date,
        'status', NEW.status,
        'version', NEW.version
      ),
      NEW.created_date,
      NEW.user_id
    FROM unnest(NEW.carrier_ids) AS carrier_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log tariff updates as interaction
CREATE OR REPLACE FUNCTION log_tariff_update_as_interaction()
RETURNS TRIGGER AS $$
DECLARE
  customer_name_val TEXT;
  change_summary TEXT := '';
BEGIN
  -- Check if customer_id changed
  IF OLD.customer_id IS DISTINCT FROM NEW.customer_id THEN
    -- Remove from old customer
    IF OLD.customer_id IS NOT NULL THEN
      INSERT INTO interactions (
        entity_type,
        entity_id,
        interaction_type,
        summary,
        details,
        metadata,
        created_date,
        user_id
      ) VALUES (
        'customer',
        OLD.customer_id,
        'tariff',
        'Tariff Disassociated',
        'A tariff was removed from this customer.',
        jsonb_build_object(
          'tariff_id', NEW.id,
          'action', 'removed'
        ),
        NOW(),
        NEW.user_id
      );
    END IF;
    
    -- Add to new customer
    IF NEW.customer_id IS NOT NULL THEN
      INSERT INTO interactions (
        entity_type,
        entity_id,
        interaction_type,
        summary,
        details,
        metadata,
        created_date,
        user_id
      ) VALUES (
        'customer',
        NEW.customer_id,
        'tariff',
        'Tariff Associated',
        'A tariff was associated with this customer.',
        jsonb_build_object(
          'tariff_id', NEW.id,
          'status', NEW.status,
          'action', 'associated'
        ),
        NOW(),
        NEW.user_id
      );
    END IF;
  -- If customer didn't change but status changed
  ELSIF NEW.customer_id IS NOT NULL AND OLD.status IS DISTINCT FROM NEW.status THEN
    change_summary := 'Status changed from "' || COALESCE(OLD.status, 'none') || '" to "' || COALESCE(NEW.status, 'none') || '"';
    
    INSERT INTO interactions (
      entity_type,
      entity_id,
      interaction_type,
      summary,
      details,
      metadata,
      created_date,
      user_id
    ) VALUES (
      'customer',
      NEW.customer_id,
      'tariff',
      'Tariff Updated',
      change_summary,
      jsonb_build_object(
        'tariff_id', NEW.id,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'action', 'updated'
      ),
      NOW(),
      NEW.user_id
    );
  END IF;

  -- Handle carrier_ids array changes for carriers that were removed
  IF OLD.carrier_ids IS NOT NULL AND array_length(OLD.carrier_ids, 1) > 0 THEN
    INSERT INTO interactions (
      entity_type,
      entity_id,
      interaction_type,
      summary,
      details,
      metadata,
      created_date,
      user_id
    )
    SELECT
      'carrier',
      carrier_id,
      'tariff',
      'Tariff Removed',
      'A tariff was removed or modified for this carrier.',
      jsonb_build_object(
        'tariff_id', NEW.id,
        'action', 'removed'
      ),
      NOW(),
      NEW.user_id
    FROM unnest(OLD.carrier_ids) AS carrier_id
    WHERE NOT (carrier_id = ANY(COALESCE(NEW.carrier_ids, ARRAY[]::uuid[])));
  END IF;
  
  -- Handle carrier_ids array changes for carriers that were added
  IF NEW.carrier_ids IS NOT NULL AND array_length(NEW.carrier_ids, 1) > 0 THEN
    SELECT name INTO customer_name_val FROM customers WHERE id = NEW.customer_id;
    
    INSERT INTO interactions (
      entity_type,
      entity_id,
      interaction_type,
      summary,
      details,
      metadata,
      created_date,
      user_id
    )
    SELECT
      'carrier',
      carrier_id,
      'tariff',
      'Tariff Added',
      'A tariff was added for this carrier' || CASE WHEN customer_name_val IS NOT NULL THEN ' with ' || customer_name_val ELSE '' END,
      jsonb_build_object(
        'tariff_id', NEW.id,
        'customer_name', customer_name_val,
        'status', NEW.status,
        'action', 'added'
      ),
      NOW(),
      NEW.user_id
    FROM unnest(NEW.carrier_ids) AS carrier_id
    WHERE NOT (carrier_id = ANY(COALESCE(OLD.carrier_ids, ARRAY[]::uuid[])));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop old triggers if they exist
DROP TRIGGER IF EXISTS trigger_log_tariff_creation ON tariffs;
DROP TRIGGER IF EXISTS trigger_log_tariff_update ON tariffs;

-- Create trigger for new tariffs
CREATE TRIGGER trigger_log_tariff_creation
  AFTER INSERT ON tariffs
  FOR EACH ROW
  EXECUTE FUNCTION log_tariff_as_interaction();

-- Create trigger for tariff updates
CREATE TRIGGER trigger_log_tariff_update
  AFTER UPDATE ON tariffs
  FOR EACH ROW
  EXECUTE FUNCTION log_tariff_update_as_interaction();

-- Backfill: Create interactions for all existing tariffs (customers)
INSERT INTO interactions (
  entity_type,
  entity_id,
  interaction_type,
  summary,
  details,
  metadata,
  created_date,
  user_id
)
SELECT 
  'customer',
  t.customer_id,
  'tariff',
  'Tariff',
  'Tariff effective from ' || COALESCE(t.effective_date::text, 'TBD') || ' to ' || COALESCE(t.expiry_date::text, 'TBD') || ', status: ' || COALESCE(t.status, 'unknown'),
  jsonb_build_object(
    'tariff_id', t.id,
    'effective_date', t.effective_date,
    'expiry_date', t.expiry_date,
    'status', t.status,
    'version', t.version,
    'backfilled', true
  ),
  t.created_date,
  t.user_id
FROM tariffs t
WHERE t.customer_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM interactions i
    WHERE i.entity_type = 'customer'
      AND i.entity_id = t.customer_id
      AND i.interaction_type = 'tariff'
      AND i.metadata->>'tariff_id' = t.id::text
  );

-- Backfill: Create interactions for all existing tariffs (carriers)
INSERT INTO interactions (
  entity_type,
  entity_id,
  interaction_type,
  summary,
  details,
  metadata,
  created_date,
  user_id
)
SELECT 
  'carrier',
  carrier_id,
  'tariff',
  'Tariff with ' || COALESCE(c.name, 'Customer'),
  'Tariff effective from ' || COALESCE(t.effective_date::text, 'TBD') || ', status: ' || COALESCE(t.status, 'unknown'),
  jsonb_build_object(
    'tariff_id', t.id,
    'customer_name', c.name,
    'effective_date', t.effective_date,
    'expiry_date', t.expiry_date,
    'status', t.status,
    'version', t.version,
    'backfilled', true
  ),
  t.created_date,
  t.user_id
FROM tariffs t
CROSS JOIN unnest(t.carrier_ids) AS carrier_id
LEFT JOIN customers c ON c.id = t.customer_id
WHERE t.carrier_ids IS NOT NULL 
  AND array_length(t.carrier_ids, 1) > 0
  AND NOT EXISTS (
    SELECT 1 FROM interactions i
    WHERE i.entity_type = 'carrier'
      AND i.entity_id = carrier_id
      AND i.interaction_type = 'tariff'
      AND i.metadata->>'tariff_id' = t.id::text
  );
/*
  # Create Knowledge Base Documents Table

  1. New Tables
    - `knowledge_base_documents`
      - `id` (uuid, primary key)
      - `title` (text) - Document title/name
      - `content` (text) - Full document content
      - `file_type` (text) - File extension (pdf, docx, txt, etc.)
      - `file_size` (integer) - Size in bytes
      - `uploaded_by` (uuid) - User who uploaded it
      - `is_active` (boolean) - Whether to use this doc in AI responses
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `metadata` (jsonb) - Additional file metadata

  2. Security
    - Enable RLS on `knowledge_base_documents` table
    - Only authenticated users can read knowledge base documents
    - Only authenticated users can create/update/delete documents
*/

CREATE TABLE IF NOT EXISTS knowledge_base_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  file_type text,
  file_size integer,
  uploaded_by uuid REFERENCES auth.users(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE knowledge_base_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read knowledge base documents"
  ON knowledge_base_documents
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create knowledge base documents"
  ON knowledge_base_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Authenticated users can update knowledge base documents"
  ON knowledge_base_documents
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete knowledge base documents"
  ON knowledge_base_documents
  FOR DELETE
  TO authenticated
  USING (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_knowledge_base_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_knowledge_base_documents_updated_at
  BEFORE UPDATE ON knowledge_base_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_base_documents_updated_at();/*
  # Create Field Mappings Table

  1. New Tables
    - `field_mappings`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `document_type` (text) - e.g., 'transaction_detail', 'low_cost_opportunity'
      - `mapping` (jsonb) - stores the field mapping configuration
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on `field_mappings` table
    - Add policy for users to manage their own mappings
*/

CREATE TABLE IF NOT EXISTS field_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  mapping jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE field_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own field mappings"
  ON field_mappings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own field mappings"
  ON field_mappings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own field mappings"
  ON field_mappings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own field mappings"
  ON field_mappings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE UNIQUE INDEX IF NOT EXISTS field_mappings_user_doc_type_idx 
  ON field_mappings(user_id, document_type);
/*
  # Create CSP Event Carrier Assignments and Carrier Contacts

  1. New Tables
    - `csp_event_carriers`
      - Junction table for many-to-many relationship between CSP events and carriers
      - `id` (uuid, primary key)
      - `csp_event_id` (uuid, foreign key to csp_events)
      - `carrier_id` (uuid, foreign key to carriers)
      - `status` (text) - invited, responded, awarded, declined
      - `invited_date` (timestamptz)
      - `response_date` (timestamptz)
      - `notes` (text)
      - `created_date` (timestamptz)
      - `updated_date` (timestamptz)
      - `user_id` (uuid)

    - `carrier_contacts`
      - Multiple contacts per carrier
      - `id` (uuid, primary key)
      - `carrier_id` (uuid, foreign key to carriers)
      - `contact_type` (text) - primary, sales, billing, operations
      - `name` (text)
      - `email` (text)
      - `phone` (text)
      - `title` (text)
      - `is_primary` (boolean)
      - `notes` (text)
      - `created_date` (timestamptz)
      - `updated_date` (timestamptz)
      - `user_id` (uuid)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

-- Create csp_event_carriers junction table
CREATE TABLE IF NOT EXISTS csp_event_carriers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  csp_event_id uuid REFERENCES csp_events(id) ON DELETE CASCADE NOT NULL,
  carrier_id uuid REFERENCES carriers(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'invited',
  invited_date timestamptz DEFAULT now(),
  response_date timestamptz,
  notes text,
  created_date timestamptz DEFAULT now(),
  updated_date timestamptz DEFAULT now(),
  user_id uuid,
  UNIQUE(csp_event_id, carrier_id)
);

ALTER TABLE csp_event_carriers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view csp event carriers"
  ON csp_event_carriers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert csp event carriers"
  ON csp_event_carriers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update csp event carriers"
  ON csp_event_carriers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete csp event carriers"
  ON csp_event_carriers FOR DELETE
  TO authenticated
  USING (true);

-- Create carrier_contacts table
CREATE TABLE IF NOT EXISTS carrier_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id uuid REFERENCES carriers(id) ON DELETE CASCADE NOT NULL,
  contact_type text DEFAULT 'primary',
  name text NOT NULL,
  email text,
  phone text,
  title text,
  is_primary boolean DEFAULT false,
  notes text,
  created_date timestamptz DEFAULT now(),
  updated_date timestamptz DEFAULT now(),
  user_id uuid
);

ALTER TABLE carrier_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view carrier contacts"
  ON carrier_contacts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert carrier contacts"
  ON carrier_contacts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update carrier contacts"
  ON carrier_contacts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete carrier contacts"
  ON carrier_contacts FOR DELETE
  TO authenticated
  USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_csp_event_carriers_csp_event ON csp_event_carriers(csp_event_id);
CREATE INDEX IF NOT EXISTS idx_csp_event_carriers_carrier ON csp_event_carriers(carrier_id);
CREATE INDEX IF NOT EXISTS idx_carrier_contacts_carrier ON carrier_contacts(carrier_id);
CREATE INDEX IF NOT EXISTS idx_carrier_contacts_primary ON carrier_contacts(carrier_id, is_primary) WHERE is_primary = true;

-- Create trigger to update updated_date
CREATE OR REPLACE FUNCTION update_csp_event_carriers_updated_date()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_date = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER csp_event_carriers_updated_date
  BEFORE UPDATE ON csp_event_carriers
  FOR EACH ROW
  EXECUTE FUNCTION update_csp_event_carriers_updated_date();

CREATE OR REPLACE FUNCTION update_carrier_contacts_updated_date()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_date = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER carrier_contacts_updated_date
  BEFORE UPDATE ON carrier_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_carrier_contacts_updated_date();/*
  # Update Tariff Ownership Types

  1. Changes
    - Update existing tariffs to have proper ownership types
    - Add index for ownership_type filtering
    - Ensure ownership_type has proper constraint for valid values
  
  2. Valid ownership types:
    - customer_direct: Customer-specific tariffs (not Rocket managed)
    - rocket_csp: Rocket-managed customer-specific tariffs
    - rocket_blanket: Rocket's blanket tariffs
    - priority1_blanket: Priority 1's blanket tariffs
*/

-- Update existing tariffs with proper ownership types first
UPDATE tariffs 
SET ownership_type = CASE
  WHEN is_blanket_tariff = true THEN 'rocket_blanket'
  WHEN is_blanket_tariff = false AND customer_id IS NOT NULL THEN 'rocket_csp'
  ELSE 'rocket_csp'
END
WHERE ownership_type IS NULL OR ownership_type NOT IN ('customer_direct', 'rocket_csp', 'rocket_blanket', 'priority1_blanket');

-- Add constraint for valid ownership types (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE constraint_name = 'tariffs_ownership_type_check'
  ) THEN
    ALTER TABLE tariffs ADD CONSTRAINT tariffs_ownership_type_check 
      CHECK (ownership_type IN ('customer_direct', 'rocket_csp', 'rocket_blanket', 'priority1_blanket'));
  END IF;
END $$;

-- Create indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_tariffs_ownership_type ON tariffs(ownership_type);
CREATE INDEX IF NOT EXISTS idx_tariffs_status ON tariffs(status);
CREATE INDEX IF NOT EXISTS idx_tariffs_expiry_date ON tariffs(expiry_date);
CREATE INDEX IF NOT EXISTS idx_tariffs_effective_date ON tariffs(effective_date);
CREATE INDEX IF NOT EXISTS idx_tariffs_customer_id ON tariffs(customer_id) WHERE customer_id IS NOT NULL;/*
  # Fix Report Snapshots RLS for Mock Users

  1. Changes
    - Add permissive policy for mock user to create and read report snapshots
    - This allows the system to work during development/demo mode
  
  2. Security
    - Policy checks for mock user ID specifically
    - Allows both authenticated users and mock user access
*/

-- Drop existing policies if they exist and recreate
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Mock user can insert report_snapshots" ON report_snapshots;
  DROP POLICY IF EXISTS "Mock user can view report_snapshots" ON report_snapshots;
  DROP POLICY IF EXISTS "Mock user can update report_snapshots" ON report_snapshots;
  DROP POLICY IF EXISTS "Mock user can delete report_snapshots" ON report_snapshots;
END $$;

-- Add policy to allow mock user to insert snapshots
CREATE POLICY "Mock user can insert report_snapshots"
  ON report_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000');

-- Add policy to allow mock user to view snapshots
CREATE POLICY "Mock user can view report_snapshots"
  ON report_snapshots FOR SELECT
  TO authenticated
  USING (user_id = '00000000-0000-0000-0000-000000000000');

-- Add policy to allow mock user to update snapshots
CREATE POLICY "Mock user can update report_snapshots"
  ON report_snapshots FOR UPDATE
  TO authenticated
  USING (user_id = '00000000-0000-0000-0000-000000000000')
  WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000');

-- Add policy to allow mock user to delete snapshots
CREATE POLICY "Mock user can delete report_snapshots"
  ON report_snapshots FOR DELETE
  TO authenticated
  USING (user_id = '00000000-0000-0000-0000-000000000000');/*
  # Add Permissions System
  
  This creates the permissions infrastructure without modifying the user_role enum yet.
  We'll handle the enum in a separate step.
*/

-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text NOT NULL,
  resource text NOT NULL,
  action text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read permissions"
  ON permissions FOR SELECT TO authenticated USING (true);

-- Create role_permissions junction
CREATE TABLE IF NOT EXISTS role_permissions (
  role text NOT NULL,
  permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role, permission_id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read role permissions"
  ON role_permissions FOR SELECT TO authenticated USING (true);

-- Insert all permissions
INSERT INTO permissions (name, description, resource, action) VALUES
  ('dashboard.view', 'View dashboard and metrics', 'dashboard', 'read'),
  ('customers.view', 'View customer list and details', 'customers', 'read'),
  ('customers.create', 'Create new customers', 'customers', 'write'),
  ('customers.edit', 'Edit customer information', 'customers', 'write'),
  ('customers.delete', 'Delete customers', 'customers', 'delete'),
  ('carriers.view', 'View carrier list and details', 'carriers', 'read'),
  ('carriers.create', 'Create new carriers', 'carriers', 'write'),
  ('carriers.edit', 'Edit carrier information', 'carriers', 'write'),
  ('carriers.delete', 'Delete carriers', 'carriers', 'delete'),
  ('tariffs.view', 'View tariff list and details', 'tariffs', 'read'),
  ('tariffs.create', 'Create new tariffs', 'tariffs', 'write'),
  ('tariffs.edit', 'Edit tariff information', 'tariffs', 'write'),
  ('tariffs.delete', 'Delete tariffs', 'tariffs', 'delete'),
  ('tariffs.upload', 'Upload tariff files', 'tariffs', 'write'),
  ('tariffs.notes', 'Add and edit tariff notes', 'tariffs', 'write'),
  ('csp_events.view', 'View CSP events', 'csp_events', 'read'),
  ('csp_events.create', 'Create CSP events', 'csp_events', 'write'),
  ('csp_events.edit', 'Edit CSP events', 'csp_events', 'write'),
  ('csp_events.delete', 'Delete CSP events', 'csp_events', 'delete'),
  ('documents.view', 'View documents', 'documents', 'read'),
  ('documents.upload', 'Upload documents', 'documents', 'write'),
  ('documents.delete', 'Delete documents', 'documents', 'delete'),
  ('calendar.view', 'View calendar events', 'calendar', 'read'),
  ('calendar.edit', 'Edit calendar events', 'calendar', 'write'),
  ('tasks.view', 'View tasks', 'tasks', 'read'),
  ('tasks.create', 'Create tasks', 'tasks', 'write'),
  ('tasks.edit', 'Edit tasks', 'tasks', 'write'),
  ('reports.view', 'View reports', 'reports', 'read'),
  ('reports.generate', 'Generate reports', 'reports', 'write'),
  ('settings.view', 'View settings', 'settings', 'read'),
  ('settings.edit', 'Edit personal settings', 'settings', 'write'),
  ('settings.ai', 'Configure AI settings', 'settings', 'write'),
  ('settings.integrations', 'Manage integrations', 'settings', 'write'),
  ('users.view', 'View user list', 'users', 'read'),
  ('users.create', 'Create and invite users', 'users', 'write'),
  ('users.edit', 'Edit user roles and permissions', 'users', 'write'),
  ('users.delete', 'Delete users', 'users', 'delete'),
  ('system.settings', 'Manage system-wide settings', 'system', 'admin'),
  ('system.database', 'Database management tools', 'system', 'admin'),
  ('system.security', 'View security and audit logs', 'system', 'admin')
ON CONFLICT (name) DO NOTHING;

-- Assign permissions for existing 'admin' role
INSERT INTO role_permissions (role, permission_id)
SELECT 'admin', id FROM permissions
ON CONFLICT DO NOTHING;

-- Assign basic view permissions for 'viewer' role if it exists
INSERT INTO role_permissions (role, permission_id)
SELECT 'viewer', id FROM permissions WHERE name IN (
  'dashboard.view', 'customers.view', 'carriers.view', 'tariffs.view',
  'csp_events.view', 'documents.view', 'calendar.view', 'tasks.view',
  'reports.view', 'settings.view'
)
ON CONFLICT DO NOTHING;

-- Assign permissions for 'editor' role if it exists
INSERT INTO role_permissions (role, permission_id)
SELECT 'editor', id FROM permissions WHERE action IN ('read', 'write')
ON CONFLICT DO NOTHING;

-- New roles that will be added
-- BASIC (view only)
INSERT INTO role_permissions (role, permission_id)
SELECT 'basic', id FROM permissions WHERE name IN (
  'dashboard.view', 'customers.view', 'carriers.view', 'tariffs.view',
  'csp_events.view', 'documents.view', 'calendar.view', 'tasks.view',
  'reports.view', 'settings.view'
)
ON CONFLICT DO NOTHING;

-- TARIFF_MASTER (basic + full tariff management)
INSERT INTO role_permissions (role, permission_id)
SELECT 'tariff_master', id FROM permissions WHERE name IN (
  'dashboard.view', 'customers.view', 'carriers.view',
  'tariffs.view', 'tariffs.create', 'tariffs.edit', 'tariffs.delete', 
  'tariffs.upload', 'tariffs.notes',
  'csp_events.view', 'documents.view', 'documents.upload',
  'calendar.view', 'calendar.edit',
  'tasks.view', 'tasks.create', 'tasks.edit',
  'reports.view', 'reports.generate',
  'settings.view', 'settings.edit'
)
ON CONFLICT DO NOTHING;

-- ELITE (everything except system admin)
INSERT INTO role_permissions (role, permission_id)
SELECT 'elite', id FROM permissions WHERE action != 'admin'
ON CONFLICT DO NOTHING;

-- Helper functions
CREATE OR REPLACE FUNCTION user_has_permission(permission_name text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_profiles up
    JOIN role_permissions rp ON rp.role = up.role::text
    JOIN permissions p ON p.id = rp.permission_id
    WHERE up.user_id = auth.uid()
    AND p.name = permission_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text AS $$
BEGIN
  RETURN (
    SELECT role::text
    FROM user_profiles
    WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_permissions()
RETURNS SETOF text AS $$
BEGIN
  RETURN QUERY
  SELECT p.name
  FROM user_profiles up
  JOIN role_permissions rp ON rp.role = up.role::text
  JOIN permissions p ON p.id = rp.permission_id
  WHERE up.user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
/*
  # Fix user_profiles RLS Policies
  
  Update policies to use correct column name 'id' instead of 'user_id'
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins view all" ON user_profiles;
DROP POLICY IF EXISTS "Users update own" ON user_profiles;
DROP POLICY IF EXISTS "Admins update any" ON user_profiles;
DROP POLICY IF EXISTS "Trigger creates" ON user_profiles;
DROP POLICY IF EXISTS "Admins delete" ON user_profiles;

-- Recreate with correct column references
CREATE POLICY "Users view own profile"
  ON user_profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admins view all"
  ON user_profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles p
      WHERE p.id = auth.uid() AND p.role::text IN ('admin', 'elite')
    )
  );

CREATE POLICY "Users update own"
  ON user_profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Admins update any"
  ON user_profiles FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles p WHERE p.id = auth.uid() AND p.role::text = 'admin')
  );

CREATE POLICY "Trigger creates"
  ON user_profiles FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins delete"
  ON user_profiles FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles p WHERE p.id = auth.uid() AND p.role::text = 'admin')
  );

-- Update helper functions to use correct column
CREATE OR REPLACE FUNCTION user_has_permission(permission_name text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_profiles up
    JOIN role_permissions rp ON rp.role = up.role::text
    JOIN permissions p ON p.id = rp.permission_id
    WHERE up.id = auth.uid()
    AND p.name = permission_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text AS $$
BEGIN
  RETURN (
    SELECT role::text
    FROM user_profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_permissions()
RETURNS SETOF text AS $$
BEGIN
  RETURN QUERY
  SELECT p.name
  FROM user_profiles up
  JOIN role_permissions rp ON rp.role = up.role::text
  JOIN permissions p ON p.id = rp.permission_id
  WHERE up.id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
/*
  # Clean Up User Profiles RLS Policies
  
  Remove all duplicate and conflicting policies, create clean simple policies
*/

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Admins can create user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can delete user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins delete" ON user_profiles;
DROP POLICY IF EXISTS "Admins update any" ON user_profiles;
DROP POLICY IF EXISTS "Admins view all" ON user_profiles;
DROP POLICY IF EXISTS "Allow trigger to create user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Trigger creates" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile metadata" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users update own" ON user_profiles;
DROP POLICY IF EXISTS "Users view own profile" ON user_profiles;

-- Create clean, simple policies that will work
CREATE POLICY "allow_select_own_profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "allow_select_all_for_admin_elite"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role IN ('admin', 'elite')
    )
  );

CREATE POLICY "allow_insert_from_trigger"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "allow_update_own"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "allow_update_all_for_admin"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "allow_delete_for_admin"
  ON user_profiles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
/*
  # Fix Infinite Recursion in User Profiles Policies
  
  The issue: policies were checking role by querying the same table, causing infinite recursion.
  Solution: Allow all authenticated users to read all profiles (we'll handle visibility in app layer).
*/

-- Drop the problematic recursive policies
DROP POLICY IF EXISTS "allow_select_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "allow_select_all_for_admin_elite" ON user_profiles;
DROP POLICY IF EXISTS "allow_insert_from_trigger" ON user_profiles;
DROP POLICY IF EXISTS "allow_update_own" ON user_profiles;
DROP POLICY IF EXISTS "allow_update_all_for_admin" ON user_profiles;
DROP POLICY IF EXISTS "allow_delete_for_admin" ON user_profiles;

-- Simple, non-recursive policies
-- SELECT: All authenticated users can read all profiles
CREATE POLICY "authenticated_users_can_read_profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: Allow trigger to create profiles
CREATE POLICY "allow_profile_creation"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- UPDATE: Users can update their own profile
CREATE POLICY "users_update_own_profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- DELETE: Only allow from service role (no user can delete profiles)
-- Admin deletes would be handled through a service function if needed
/*
  # Remove Editor Role
  
  1. Changes
    - Remove all role_permissions entries for 'editor' role
    - Update any existing users with 'editor' role to 'basic'
  
  2. Notes
    - Editor role is being consolidated into Basic user role
    - Basic users now have create/edit capabilities
*/

-- Update any users with editor role to basic
UPDATE user_profiles 
SET role = 'basic' 
WHERE role = 'editor';

-- Remove all editor role permissions
DELETE FROM role_permissions 
WHERE role = 'editor';
/*
  # Add Gmail App Password Credentials Table

  1. New Tables
    - `user_gmail_credentials`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `email_address` (text, Gmail address)
      - `app_password` (text, encrypted app password)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `user_gmail_credentials` table
    - Add policies for users to manage their own credentials
    - Encrypt app_password column

  3. Changes
    - Replace OAuth token storage with simple app password approach
    - Simpler authentication flow using Gmail SMTP
*/

-- Create table for Gmail app password credentials
CREATE TABLE IF NOT EXISTS user_gmail_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_address text NOT NULL,
  app_password text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE user_gmail_credentials ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only access their own credentials
CREATE POLICY "Users can view own Gmail credentials"
  ON user_gmail_credentials
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own Gmail credentials"
  ON user_gmail_credentials
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own Gmail credentials"
  ON user_gmail_credentials
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own Gmail credentials"
  ON user_gmail_credentials
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_gmail_credentials_user_id
  ON user_gmail_credentials(user_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_user_gmail_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_gmail_credentials_updated_at
  BEFORE UPDATE ON user_gmail_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_user_gmail_credentials_updated_at();
/*
  # Fix email_activities message_id constraint

  ## Changes
  - Make `message_id` column nullable for outbound emails
  - Outbound emails don't have a Gmail message_id until after they're sent
  - Keep it unique but allow NULL values

  ## Security
  - No changes to RLS policies
*/

-- Make message_id nullable
ALTER TABLE email_activities 
  ALTER COLUMN message_id DROP NOT NULL;
/*
  # Create Email Templates Table

  1. New Tables
    - `email_templates`
      - `id` (uuid, primary key)
      - `name` (text) - Template name/label
      - `template_key` (text, unique) - Key used in code (e.g., 'new_csp_request')
      - `subject_template` (text) - Subject line template with variables
      - `body_template` (text) - Email body template with variables
      - `description` (text) - Description of when to use this template
      - `is_system` (boolean) - Whether this is a system template (can't be deleted)
      - `created_by` (uuid) - User who created the template
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `email_templates` table
    - Add policies for authenticated users to read all templates
    - Add policies for admin and elite roles to manage templates
*/

CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  template_key text UNIQUE NOT NULL,
  subject_template text NOT NULL,
  body_template text NOT NULL,
  description text,
  is_system boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all email templates"
  ON email_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin and elite can insert email templates"
  ON email_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'elite')
    )
  );

CREATE POLICY "Admin and elite can update email templates"
  ON email_templates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'elite')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'elite')
    )
  );

CREATE POLICY "Admin and elite can delete non-system templates"
  ON email_templates FOR DELETE
  TO authenticated
  USING (
    is_system = false
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'elite')
    )
  );

-- Insert default email templates
INSERT INTO email_templates (template_key, name, subject_template, body_template, description, is_system) VALUES
('new_csp_request', 'New CSP Request', 'Carrier Service Provider Review - {{customerName}}', 'Hi {{recipientName}},

I hope this message finds you well.

We''re conducting a Carrier Service Provider review for {{customerName}} and would like to invite you to participate in our RFP process.

{{cspDescription}}

Please let me know if you''re interested in submitting a proposal.

Best regards', 'Use when inviting carriers to participate in a new CSP/RFP process', true),

('follow_up', 'Follow Up', 'Re: {{contextTitle}}', 'Hi {{recipientName}},

I wanted to follow up on our previous discussion regarding {{contextTitle}}.

{{notes}}

Looking forward to hearing from you.

Best regards', 'Use for general follow-up communications', true),

('rate_request', 'Rate Request', 'Rate Request - {{customerName}} - {{mode}}', 'Hi {{recipientName}},

We''re seeking competitive rate proposals for {{customerName}}.

Service Details:
- Mode: {{mode}}
- Customer: {{customerName}}
{{additionalDetails}}

Please provide your best rates at your earliest convenience.

Best regards', 'Use when requesting rate proposals from carriers', true),

('status_update', 'Status Update', 'Update: {{contextTitle}}', 'Hi {{recipientName}},

I wanted to provide you with an update on {{contextTitle}}.

{{updateDetails}}

Let me know if you have any questions.

Best regards', 'Use for providing status updates on projects or negotiations', true),

('general', 'General Message', 'Re: {{context}}', 'Hi {{recipientName}},

{{message}}

Best regards', 'Use for general communications', true)
ON CONFLICT (template_key) DO NOTHING;
/*
  # Add Recipient Type to Email Templates

  1. Changes
    - Add `recipient_type` column to `email_templates` table (customer/carrier/general)
    - Add `category` column for better organization (csp_loa, csp_progress, bid_invite, etc.)
    - Update existing templates with proper recipient types
    - Add new customer and carrier templates

  2. New Templates
    - Customer Templates (4): CSP Authorization Request, LOA Follow-Up, CSP Progress Update, CSP Results & Awards
    - Carrier Templates (3): Bid Participation Invite, Bid Reminder, Award Notification
*/

-- Add new columns to email_templates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_templates' AND column_name = 'recipient_type'
  ) THEN
    ALTER TABLE email_templates ADD COLUMN recipient_type text DEFAULT 'general';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_templates' AND column_name = 'category'
  ) THEN
    ALTER TABLE email_templates ADD COLUMN category text;
  END IF;
END $$;

-- Update existing templates
UPDATE email_templates 
SET recipient_type = 'general', category = 'general'
WHERE recipient_type IS NULL;

-- Delete old templates to replace with new ones
DELETE FROM email_templates WHERE is_system = true;

-- Insert new customer templates
INSERT INTO email_templates (template_key, name, recipient_type, category, subject_template, body_template, description, is_system) VALUES

-- Customer Templates
('csp_loa_request', 'CSP Authorization Request (LOA)', 'customer', 'csp_loa', 
'Rocketshipping | Authorization Request to Run Your CSP Bid', 
'Hi {{customerName}},

We''d like to run a CSP (Carrier Service Procurement) bid on your behalf to analyze your current LTL and Full-Mile Home Delivery network.
Before we can access lane and spend data, we''ll need your signed Letter of Authorization (LOA).

Please review and return the attached LOA. Once received, we''ll begin pulling carrier data and preparing your opportunity summary.

Thank you for partnering with Rocketshipping — this process typically identifies new savings and improved coverage.

Best regards,
{{senderName}}
Customer Pricing | Rocketshipping',
'Request LOA from customer to begin CSP bid process', true),

('csp_loa_followup', 'LOA Follow-Up', 'customer', 'csp_loa',
'Rocketshipping | Quick Follow-Up: CSP Authorization Still Needed',
'Hi {{customerName}},

Just checking in — we''re ready to begin your CSP bid but still need your signed LOA to proceed.
If you''ve already sent it, thank you! If not, I''ve re-attached the form for convenience.

Once received, we''ll start data collection and confirm next steps.

Thanks again,
{{senderName}}',
'Follow up with customer for pending LOA', true),

('csp_progress_update', 'CSP Progress Update', 'customer', 'csp_progress',
'Rocketshipping | CSP Bid Progress Update – {{customerName}}',
'Hi {{customerName}},

Here''s a quick status update on your CSP bid:

• Participating Carriers: {{carrierCount}}
• Bid Phase: {{bidPhase}}
• Expected Completion: {{completionDate}}

We''ll share final recommendations as soon as carrier responses are complete.

Best,
{{senderName}}',
'Provide status update to customer on CSP bid progress', true),

('csp_results_awards', 'CSP Results & Awards', 'customer', 'csp_awards',
'Rocketshipping | CSP Results & Award Summary – {{customerName}}',
'Hi {{customerName}},

We''ve completed your CSP bid and are pleased to share the results:

• Awarded Carriers: {{awardedCarriers}}
• Estimated Savings: {{estimatedSavings}}
• Effective Date: {{effectiveDate}}

Your awarded tariffs are attached for review. Once approved, we''ll proceed with carrier activation and implementation.

Thank you for trusting Rocketshipping with your carrier strategy,
{{senderName}}',
'Share final CSP bid results and awards with customer', true),

-- Carrier Templates
('bid_participation_invite', 'Bid Participation Invite', 'carrier', 'bid_invite',
'Rocketshipping | Invitation to Participate – {{customerName}} CSP Bid',
'Hi {{carrierName}},

Rocketshipping is running a CSP bid for {{customerName}}''s {{mode}} network and we''d like to invite your team to participate.

Key Details:
• Bid Opens: {{bidOpenDate}}
• Bid Closes: {{bidCloseDate}}
• Mode: {{mode}}
• Contact: {{senderName}} / {{senderEmail}}

Attached are bid instructions and data files.
Please confirm participation by replying to this email or uploading your file in the FreightOps portal.

Thank you,
{{senderName}}
Carrier Relations | Rocketshipping',
'Invite carrier to participate in CSP bid', true),

('bid_reminder', 'Bid Reminder', 'carrier', 'bid_reminder',
'Rocketshipping | Reminder – {{customerName}} CSP Bid Due {{dueDate}}',
'Hi {{carrierName}},

A quick reminder that the CSP bid for {{customerName}} closes on {{dueDate}}.
If you''ve already submitted, thank you! If not, please ensure your file is uploaded before the deadline.

Let us know if you need clarification on any lanes or service requirements.

Best,
{{senderName}}',
'Remind carrier of upcoming CSP bid deadline', true),

('award_notification', 'Award Notification & Tariff Publication', 'carrier', 'bid_award',
'Rocketshipping | Award Notification – {{customerName}} CSP Results',
'Hi {{carrierName}},

Congratulations — your bid for {{customerName}} has been awarded for the following lanes:

{{awardedLanes}}

The awarded tariff is now published in the Rocketshipping FreightOps portal.
Please review and confirm receipt; implementation begins on {{startDate}}.

Thank you for your continued partnership,
{{senderName}}',
'Notify carrier of CSP bid award', true),

-- General Templates
('general_followup', 'General Follow Up', 'general', 'general',
'Rocketshipping | Re: {{contextTitle}}',
'Hi {{recipientName}},

I wanted to follow up on our previous discussion regarding {{contextTitle}}.

{{notes}}

Looking forward to hearing from you.

Best regards,
{{senderName}}',
'Use for general follow-up communications', true),

('general_message', 'General Message', 'general', 'general',
'Rocketshipping | {{context}}',
'Hi {{recipientName}},

{{message}}

Best regards,
{{senderName}}',
'Use for general communications', true)

ON CONFLICT (template_key) DO NOTHING;
/*
  # Add User Profile Fields for Email Signatures

  1. Changes
    - Add profile fields to `user_profiles` table
      - `first_name` - User's first name
      - `last_name` - User's last name
      - `phone` - Contact phone number
      - `title` - Job title (e.g., "Customer Pricing Manager")
      - `company` - Company name (defaults to "Rocketshipping")
      - `email_signature` - Custom email signature (optional override)
    
  2. Purpose
    - Enable personalized email signatures
    - Provide contact info for carriers/customers
    - Distinguish app-sent emails from personal Gmail
*/

-- Add profile fields to user_profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'first_name'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN first_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'last_name'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN last_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'phone'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN phone text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'title'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN title text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'company'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN company text DEFAULT 'Rocketshipping';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'email_signature'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN email_signature text;
  END IF;
END $$;
/*
  # Comprehensive Customer & Carrier Activity Tracking (HubSpot-style)

  ## Overview
  This migration creates a comprehensive activity tracking system that automatically logs
  ALL customer and carrier-related activities to their timelines, mimicking HubSpot's CRM behavior.

  ## Changes

  1. Enhanced CSP Event Tracking
    - Logs CSP stage changes to BOTH customer AND all assigned carriers
    - Logs CSP status changes to customer and carriers
    - Logs carrier assignments/removals to CSP events

  2. Document Activity Tracking
    - Logs document uploads to customer/carrier timelines
    - Tracks document type and metadata

  3. Tariff Activity Tracking
    - Logs tariff uploads to customer timelines
    - Logs tariff updates and expirations
    - Logs rate changes

  4. Carrier Assignment Tracking
    - Logs when carriers are added to CSP events
    - Logs when carriers are removed from CSP events
    - Shows on both customer and carrier timelines

  ## Functions Created
  - `log_carrier_to_csp_assignment()` - Logs carrier assignments to CSP events
  - `log_document_activity()` - Logs document uploads
  - `log_csp_stage_to_carriers()` - Logs CSP stage changes to all carriers in the event
  - `log_tariff_activity()` - Logs tariff-related activities

  ## Security
  - All functions run with SECURITY DEFINER
  - Maintains existing RLS policies
*/

-- ========================================
-- Enhanced CSP Event Triggers (Customer + Carriers)
-- ========================================

-- Function to log CSP stage changes to ALL assigned carriers
CREATE OR REPLACE FUNCTION log_csp_stage_to_carriers()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if stage changed
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    -- Log to customer timeline
    IF NEW.customer_id IS NOT NULL THEN
      INSERT INTO interactions (
        entity_type,
        entity_id,
        interaction_type,
        summary,
        details,
        metadata,
        created_date,
        user_id
      ) VALUES (
        'customer',
        NEW.customer_id,
        'csp_stage_update',
        'CSP Stage Changed: ' || NEW.title,
        'Stage moved from "' || COALESCE(OLD.stage, 'none') || '" to "' || COALESCE(NEW.stage, 'none') || '"',
        jsonb_build_object(
          'csp_event_id', NEW.id,
          'csp_event_title', NEW.title,
          'old_stage', OLD.stage,
          'new_stage', NEW.stage,
          'status', NEW.status
        ),
        NOW(),
        NEW.user_id
      );
    END IF;

    -- Log to ALL assigned carriers
    INSERT INTO interactions (
      entity_type,
      entity_id,
      interaction_type,
      summary,
      details,
      metadata,
      created_date,
      user_id
    )
    SELECT 
      'carrier',
      cec.carrier_id,
      'csp_stage_update',
      'CSP Stage Changed: ' || NEW.title,
      'Stage moved from "' || COALESCE(OLD.stage, 'none') || '" to "' || COALESCE(NEW.stage, 'none') || '" for customer: ' || COALESCE((SELECT name FROM customers WHERE id = NEW.customer_id), 'Unknown'),
      jsonb_build_object(
        'csp_event_id', NEW.id,
        'csp_event_title', NEW.title,
        'old_stage', OLD.stage,
        'new_stage', NEW.stage,
        'status', NEW.status,
        'customer_id', NEW.customer_id
      ),
      NOW(),
      NEW.user_id
    FROM csp_event_carriers cec
    WHERE cec.csp_event_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for CSP stage changes
DROP TRIGGER IF EXISTS trigger_log_csp_stage_to_carriers ON csp_events;
CREATE TRIGGER trigger_log_csp_stage_to_carriers
  AFTER UPDATE ON csp_events
  FOR EACH ROW
  WHEN (OLD.stage IS DISTINCT FROM NEW.stage)
  EXECUTE FUNCTION log_csp_stage_to_carriers();

-- ========================================
-- Carrier Assignment Tracking
-- ========================================

-- Function to log carrier assignments to CSP events
CREATE OR REPLACE FUNCTION log_carrier_to_csp_assignment()
RETURNS TRIGGER AS $$
DECLARE
  csp_title TEXT;
  customer_name TEXT;
  carrier_name TEXT;
  customer_id_val uuid;
BEGIN
  -- Get CSP event details
  SELECT ce.title, c.name, ce.customer_id
  INTO csp_title, customer_name, customer_id_val
  FROM csp_events ce
  LEFT JOIN customers c ON c.id = ce.customer_id
  WHERE ce.id = NEW.csp_event_id;

  -- Get carrier name
  SELECT name INTO carrier_name
  FROM carriers
  WHERE id = NEW.carrier_id;

  -- Log to carrier timeline
  INSERT INTO interactions (
    entity_type,
    entity_id,
    interaction_type,
    summary,
    details,
    metadata,
    created_date,
    user_id
  ) VALUES (
    'carrier',
    NEW.carrier_id,
    'csp_event',
    'Added to CSP Event: ' || COALESCE(csp_title, 'Unknown'),
    'You were added to the CSP event "' || COALESCE(csp_title, 'Unknown') || '" for customer: ' || COALESCE(customer_name, 'Unknown'),
    jsonb_build_object(
      'csp_event_id', NEW.csp_event_id,
      'action', 'carrier_assigned',
      'invited_date', NEW.invited_date,
      'status', NEW.status
    ),
    NEW.created_date,
    NEW.user_id
  );

  -- Log to customer timeline if customer exists
  IF customer_id_val IS NOT NULL THEN
    INSERT INTO interactions (
      entity_type,
      entity_id,
      interaction_type,
      summary,
      details,
      metadata,
      created_date,
      user_id
    ) VALUES (
      'customer',
      customer_id_val,
      'csp_event',
      'Carrier Added to CSP: ' || COALESCE(carrier_name, 'Unknown'),
      'Carrier "' || COALESCE(carrier_name, 'Unknown') || '" was added to CSP event: ' || COALESCE(csp_title, 'Unknown'),
      jsonb_build_object(
        'csp_event_id', NEW.csp_event_id,
        'carrier_id', NEW.carrier_id,
        'carrier_name', carrier_name,
        'action', 'carrier_assigned'
      ),
      NEW.created_date,
      NEW.user_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for carrier assignments
DROP TRIGGER IF EXISTS trigger_log_carrier_assignment ON csp_event_carriers;
CREATE TRIGGER trigger_log_carrier_assignment
  AFTER INSERT ON csp_event_carriers
  FOR EACH ROW
  EXECUTE FUNCTION log_carrier_to_csp_assignment();

-- ========================================
-- Document Upload Tracking
-- ========================================

-- Function to log document uploads
CREATE OR REPLACE FUNCTION log_document_activity()
RETURNS TRIGGER AS $$
DECLARE
  related_name TEXT;
BEGIN
  -- Log to customer if document is for a customer
  IF NEW.entity_type = 'customer' AND NEW.entity_id IS NOT NULL THEN
    SELECT name INTO related_name FROM customers WHERE id = NEW.entity_id;
    
    INSERT INTO interactions (
      entity_type,
      entity_id,
      interaction_type,
      summary,
      details,
      metadata,
      created_date,
      user_id
    ) VALUES (
      'customer',
      NEW.entity_id,
      'document_upload',
      'Document Uploaded: ' || COALESCE(NEW.file_name, 'Unknown'),
      'A new document was uploaded: ' || COALESCE(NEW.file_name, 'Unknown') || ' (' || COALESCE(NEW.document_type, 'general') || ')',
      jsonb_build_object(
        'document_id', NEW.id,
        'file_name', NEW.file_name,
        'document_type', NEW.document_type,
        'file_size', NEW.file_size,
        'mime_type', NEW.mime_type
      ),
      NEW.created_at,
      NEW.uploaded_by
    );
  END IF;

  -- Log to carrier if document is for a carrier
  IF NEW.entity_type = 'carrier' AND NEW.entity_id IS NOT NULL THEN
    SELECT name INTO related_name FROM carriers WHERE id = NEW.entity_id;
    
    INSERT INTO interactions (
      entity_type,
      entity_id,
      interaction_type,
      summary,
      details,
      metadata,
      created_date,
      user_id
    ) VALUES (
      'carrier',
      NEW.entity_id,
      'document_upload',
      'Document Uploaded: ' || COALESCE(NEW.file_name, 'Unknown'),
      'A new document was uploaded: ' || COALESCE(NEW.file_name, 'Unknown') || ' (' || COALESCE(NEW.document_type, 'general') || ')',
      jsonb_build_object(
        'document_id', NEW.id,
        'file_name', NEW.file_name,
        'document_type', NEW.document_type,
        'file_size', NEW.file_size,
        'mime_type', NEW.mime_type
      ),
      NEW.created_at,
      NEW.uploaded_by
    );
  END IF;

  -- Log to CSP event if document is for a CSP event
  IF NEW.entity_type = 'csp_event' AND NEW.entity_id IS NOT NULL THEN
    -- Also log to the customer associated with the CSP event
    INSERT INTO interactions (
      entity_type,
      entity_id,
      interaction_type,
      summary,
      details,
      metadata,
      created_date,
      user_id
    )
    SELECT 
      'customer',
      ce.customer_id,
      'document_upload',
      'CSP Document Uploaded: ' || COALESCE(NEW.file_name, 'Unknown'),
      'A document was uploaded to CSP event "' || ce.title || '": ' || COALESCE(NEW.file_name, 'Unknown'),
      jsonb_build_object(
        'document_id', NEW.id,
        'file_name', NEW.file_name,
        'document_type', NEW.document_type,
        'csp_event_id', NEW.entity_id
      ),
      NEW.created_at,
      NEW.uploaded_by
    FROM csp_events ce
    WHERE ce.id = NEW.entity_id AND ce.customer_id IS NOT NULL;

    -- Also log to all carriers in the CSP event
    INSERT INTO interactions (
      entity_type,
      entity_id,
      interaction_type,
      summary,
      details,
      metadata,
      created_date,
      user_id
    )
    SELECT 
      'carrier',
      cec.carrier_id,
      'document_upload',
      'CSP Document Uploaded: ' || COALESCE(NEW.file_name, 'Unknown'),
      'A document was uploaded to CSP event "' || ce.title || '": ' || COALESCE(NEW.file_name, 'Unknown'),
      jsonb_build_object(
        'document_id', NEW.id,
        'file_name', NEW.file_name,
        'document_type', NEW.document_type,
        'csp_event_id', NEW.entity_id
      ),
      NEW.created_at,
      NEW.uploaded_by
    FROM csp_events ce
    JOIN csp_event_carriers cec ON cec.csp_event_id = ce.id
    WHERE ce.id = NEW.entity_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for document uploads
DROP TRIGGER IF EXISTS trigger_log_document_upload ON documents;
CREATE TRIGGER trigger_log_document_upload
  AFTER INSERT ON documents
  FOR EACH ROW
  EXECUTE FUNCTION log_document_activity();

-- ========================================
-- Tariff Activity Tracking
-- ========================================

-- Function to log tariff activities
CREATE OR REPLACE FUNCTION log_tariff_activity()
RETURNS TRIGGER AS $$
DECLARE
  carrier_name TEXT;
  tariff_display_name TEXT;
BEGIN
  -- Create a display name for the tariff
  tariff_display_name := COALESCE(NEW.version, 'Tariff #' || NEW.id::text);

  -- Get carrier name (handle array of carrier_ids)
  IF NEW.carrier_ids IS NOT NULL AND array_length(NEW.carrier_ids, 1) > 0 THEN
    SELECT name INTO carrier_name FROM carriers WHERE id = NEW.carrier_ids[1];
  END IF;

  -- Log to carrier timeline for each carrier
  IF NEW.carrier_ids IS NOT NULL THEN
    INSERT INTO interactions (
      entity_type,
      entity_id,
      interaction_type,
      summary,
      details,
      metadata,
      created_date,
      user_id
    )
    SELECT 
      'carrier',
      carrier_id,
      'tariff',
      'Tariff ' || (CASE WHEN TG_OP = 'INSERT' THEN 'Uploaded' ELSE 'Updated' END) || ': ' || tariff_display_name,
      'Tariff effective from ' || COALESCE(NEW.effective_date::text, 'unknown') || ' to ' || COALESCE(NEW.expiry_date::text, 'unknown'),
      jsonb_build_object(
        'tariff_id', NEW.id,
        'tariff_version', NEW.version,
        'effective_date', NEW.effective_date,
        'expiry_date', NEW.expiry_date,
        'ownership_type', NEW.ownership_type,
        'action', LOWER(TG_OP)
      ),
      COALESCE(NEW.created_date, NOW()),
      NEW.user_id
    FROM unnest(NEW.carrier_ids) AS carrier_id;
  END IF;

  -- Log to customer timeline
  IF NEW.customer_id IS NOT NULL THEN
    INSERT INTO interactions (
      entity_type,
      entity_id,
      interaction_type,
      summary,
      details,
      metadata,
      created_date,
      user_id
    ) VALUES (
      'customer',
      NEW.customer_id,
      'tariff',
      'Tariff ' || (CASE WHEN TG_OP = 'INSERT' THEN 'Received' ELSE 'Updated' END) || ' from ' || COALESCE(carrier_name, 'carrier'),
      'New tariff from carrier "' || COALESCE(carrier_name, 'Unknown') || '" effective: ' || COALESCE(NEW.effective_date::text, 'unknown'),
      jsonb_build_object(
        'tariff_id', NEW.id,
        'tariff_version', NEW.version,
        'carrier_name', carrier_name,
        'effective_date', NEW.effective_date,
        'expiry_date', NEW.expiry_date,
        'ownership_type', NEW.ownership_type,
        'action', LOWER(TG_OP)
      ),
      COALESCE(NEW.created_date, NOW()),
      NEW.user_id
    );
  END IF;

  -- Log to all additional customers in customer_ids array
  IF NEW.customer_ids IS NOT NULL AND array_length(NEW.customer_ids, 1) > 0 THEN
    INSERT INTO interactions (
      entity_type,
      entity_id,
      interaction_type,
      summary,
      details,
      metadata,
      created_date,
      user_id
    )
    SELECT 
      'customer',
      customer_id,
      'tariff',
      'Tariff ' || (CASE WHEN TG_OP = 'INSERT' THEN 'Received' ELSE 'Updated' END) || ' from ' || COALESCE(carrier_name, 'carrier'),
      'New tariff from carrier "' || COALESCE(carrier_name, 'Unknown') || '" effective: ' || COALESCE(NEW.effective_date::text, 'unknown'),
      jsonb_build_object(
        'tariff_id', NEW.id,
        'tariff_version', NEW.version,
        'carrier_name', carrier_name,
        'effective_date', NEW.effective_date,
        'expiry_date', NEW.expiry_date,
        'ownership_type', NEW.ownership_type,
        'action', LOWER(TG_OP)
      ),
      COALESCE(NEW.created_date, NOW()),
      NEW.user_id
    FROM unnest(NEW.customer_ids) AS customer_id
    WHERE customer_id != NEW.customer_id OR NEW.customer_id IS NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for tariff activities
DROP TRIGGER IF EXISTS trigger_log_tariff_insert ON tariffs;
CREATE TRIGGER trigger_log_tariff_insert
  AFTER INSERT ON tariffs
  FOR EACH ROW
  EXECUTE FUNCTION log_tariff_activity();

DROP TRIGGER IF EXISTS trigger_log_tariff_update ON tariffs;
CREATE TRIGGER trigger_log_tariff_update
  AFTER UPDATE ON tariffs
  FOR EACH ROW
  WHEN (
    OLD.effective_date IS DISTINCT FROM NEW.effective_date OR
    OLD.expiry_date IS DISTINCT FROM NEW.expiry_date OR
    OLD.customer_ids IS DISTINCT FROM NEW.customer_ids OR
    OLD.carrier_ids IS DISTINCT FROM NEW.carrier_ids
  )
  EXECUTE FUNCTION log_tariff_activity();
/*
  # Add Email Threading and Reply Tracking (HubSpot-style)

  ## Overview
  This migration adds email threading capabilities and reply tracking to create
  HubSpot-style conversation views and "awaiting reply" alerts.

  ## Changes

  1. Email Threading Fields
    - `thread_id` - Groups emails into conversations
    - `in_reply_to_message_id` - Links to parent email
    - `email_references` - Full email reference chain

  2. Reply Tracking
    - `awaiting_reply` - Boolean flag for emails needing response
    - `awaiting_reply_since` - When email started waiting
    - `reply_by_date` - Expected reply deadline

  3. Thread Metadata
    - `thread_participants` - All email addresses in thread
    - `thread_message_count` - Number of messages in thread
    - `is_thread_starter` - Identifies first message in thread

  ## Security
  - Maintains existing RLS policies
  - All functions run with SECURITY DEFINER
*/

-- Add threading and reply tracking fields to email_activities
DO $$
BEGIN
  -- Thread identification
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_activities' AND column_name = 'thread_id'
  ) THEN
    ALTER TABLE email_activities ADD COLUMN thread_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_activities' AND column_name = 'in_reply_to_message_id'
  ) THEN
    ALTER TABLE email_activities ADD COLUMN in_reply_to_message_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_activities' AND column_name = 'email_references'
  ) THEN
    ALTER TABLE email_activities ADD COLUMN email_references text[];
  END IF;

  -- Reply tracking
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_activities' AND column_name = 'awaiting_reply'
  ) THEN
    ALTER TABLE email_activities ADD COLUMN awaiting_reply boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_activities' AND column_name = 'awaiting_reply_since'
  ) THEN
    ALTER TABLE email_activities ADD COLUMN awaiting_reply_since timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_activities' AND column_name = 'reply_by_date'
  ) THEN
    ALTER TABLE email_activities ADD COLUMN reply_by_date timestamptz;
  END IF;

  -- Thread metadata
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_activities' AND column_name = 'thread_participants'
  ) THEN
    ALTER TABLE email_activities ADD COLUMN thread_participants text[];
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_activities' AND column_name = 'thread_message_count'
  ) THEN
    ALTER TABLE email_activities ADD COLUMN thread_message_count integer DEFAULT 1;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_activities' AND column_name = 'is_thread_starter'
  ) THEN
    ALTER TABLE email_activities ADD COLUMN is_thread_starter boolean DEFAULT true;
  END IF;
END $$;

-- Create index for thread lookups
CREATE INDEX IF NOT EXISTS idx_email_activities_thread_id ON email_activities(thread_id);
CREATE INDEX IF NOT EXISTS idx_email_activities_awaiting_reply ON email_activities(awaiting_reply) WHERE awaiting_reply = true;
CREATE INDEX IF NOT EXISTS idx_email_activities_message_id ON email_activities(message_id);

-- Function to generate thread ID from subject
CREATE OR REPLACE FUNCTION generate_thread_id(subject_text text)
RETURNS text AS $$
BEGIN
  -- Remove common reply prefixes and normalize
  RETURN lower(regexp_replace(
    regexp_replace(subject_text, '^(re:|fwd?:|fw:)\s*', '', 'gi'),
    '[^a-z0-9]+', '-', 'g'
  ));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to check and update awaiting reply status (BEFORE INSERT/UPDATE)
CREATE OR REPLACE FUNCTION check_awaiting_reply()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate thread_id if not set
  IF NEW.thread_id IS NULL AND NEW.subject IS NOT NULL THEN
    NEW.thread_id := generate_thread_id(NEW.subject);
  END IF;

  -- For outbound emails, mark as awaiting reply
  IF NEW.direction = 'outbound' AND NEW.thread_id IS NOT NULL THEN
    NEW.awaiting_reply := true;
    NEW.awaiting_reply_since := COALESCE(NEW.sent_at, NOW());
    NEW.reply_by_date := COALESCE(NEW.sent_at, NOW()) + INTERVAL '3 days';
  END IF;

  -- For inbound emails, mark parent thread as replied (after insert in separate trigger)
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle inbound replies (AFTER INSERT)
CREATE OR REPLACE FUNCTION handle_inbound_reply()
RETURNS TRIGGER AS $$
BEGIN
  -- For inbound emails, mark parent thread as replied
  IF NEW.direction = 'inbound' AND NEW.thread_id IS NOT NULL THEN
    UPDATE email_activities
    SET 
      awaiting_reply = false,
      awaiting_reply_since = NULL
    WHERE thread_id = NEW.thread_id
      AND id != NEW.id
      AND direction = 'outbound'
      AND awaiting_reply = true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to check awaiting reply status (BEFORE)
DROP TRIGGER IF EXISTS trigger_check_awaiting_reply ON email_activities;
CREATE TRIGGER trigger_check_awaiting_reply
  BEFORE INSERT OR UPDATE ON email_activities
  FOR EACH ROW
  EXECUTE FUNCTION check_awaiting_reply();

-- Trigger to handle inbound replies (AFTER)
DROP TRIGGER IF EXISTS trigger_handle_inbound_reply ON email_activities;
CREATE TRIGGER trigger_handle_inbound_reply
  AFTER INSERT ON email_activities
  FOR EACH ROW
  WHEN (NEW.direction = 'inbound')
  EXECUTE FUNCTION handle_inbound_reply();

-- Update existing emails to set thread_id based on subject
UPDATE email_activities
SET thread_id = generate_thread_id(subject)
WHERE thread_id IS NULL AND subject IS NOT NULL;

-- Mark first message in each thread as thread starter
WITH first_messages AS (
  SELECT DISTINCT ON (thread_id) id
  FROM email_activities
  WHERE thread_id IS NOT NULL
  ORDER BY thread_id, COALESCE(sent_at, created_at) ASC
)
UPDATE email_activities
SET is_thread_starter = true
WHERE id IN (SELECT id FROM first_messages);

-- Mark other messages as not thread starters
UPDATE email_activities
SET is_thread_starter = false
WHERE thread_id IS NOT NULL AND NOT is_thread_starter;

-- Set awaiting reply for recent outbound emails without responses
UPDATE email_activities e1
SET 
  awaiting_reply = true,
  awaiting_reply_since = COALESCE(e1.sent_at, e1.created_at),
  reply_by_date = COALESCE(e1.sent_at, e1.created_at) + INTERVAL '3 days'
WHERE e1.direction = 'outbound'
  AND e1.thread_id IS NOT NULL
  AND COALESCE(e1.sent_at, e1.created_at) > NOW() - INTERVAL '30 days'
  AND NOT EXISTS (
    SELECT 1 FROM email_activities e2
    WHERE e2.thread_id = e1.thread_id
      AND e2.direction = 'inbound'
      AND COALESCE(e2.sent_at, e2.created_at) > COALESCE(e1.sent_at, e1.created_at)
  );

-- Update thread message counts
UPDATE email_activities e
SET thread_message_count = (
  SELECT COUNT(*)
  FROM email_activities
  WHERE thread_id = e.thread_id
)
WHERE thread_id IS NOT NULL;

-- Update thread participants
UPDATE email_activities e
SET thread_participants = (
  SELECT array_agg(DISTINCT participant)
  FROM (
    SELECT unnest(array_cat(to_emails, COALESCE(cc_emails, ARRAY[]::text[]))) as participant
    FROM email_activities
    WHERE thread_id = e.thread_id
    UNION
    SELECT from_email as participant
    FROM email_activities
    WHERE thread_id = e.thread_id
  ) participants
)
WHERE thread_id IS NOT NULL;
/*
  # Create Email Notification Settings (Admin/Elite Only)

  ## Overview
  This migration creates a user-specific email notification settings table
  where admins and elite users can customize their email alert preferences.

  ## Changes

  1. New Table: user_email_notification_settings
    - `user_id` (uuid, primary key) - One setting per user
    - `awaiting_reply_days` - Days before marking email as awaiting reply (default 3)
    - `critical_reply_days` - Days before marking as critical (default 7)
    - `auto_alert_enabled` - Enable/disable auto alerts (default true)
    - `alert_frequency` - How often to check (hourly, daily, weekly)
    - `include_weekends` - Count weekends in day calculations (default true)
    - `quiet_hours_start` - Start of quiet hours (e.g., '18:00')
    - `quiet_hours_end` - End of quiet hours (e.g., '08:00')
    - `alert_channels` - JSONB array of channels (email, in_app, etc.)
    - `custom_rules` - JSONB for custom alert rules

  2. Default Settings
    - Creates default settings for all users on first access
    - Falls back to system defaults if not set

  3. Security
    - RLS enabled
    - Only admin and elite roles can modify settings
    - Users can only view/edit their own settings

  ## Functions Created
  - `get_user_email_settings()` - Get settings with defaults
  - `is_email_awaiting_reply()` - Check if email needs response based on user settings
*/

-- Create user email notification settings table
CREATE TABLE IF NOT EXISTS user_email_notification_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Reply timing settings
  awaiting_reply_days integer DEFAULT 3 CHECK (awaiting_reply_days >= 1 AND awaiting_reply_days <= 30),
  critical_reply_days integer DEFAULT 7 CHECK (critical_reply_days >= 1 AND critical_reply_days <= 60),
  
  -- Alert preferences
  auto_alert_enabled boolean DEFAULT true,
  alert_frequency text DEFAULT 'daily' CHECK (alert_frequency IN ('hourly', 'daily', 'weekly')),
  include_weekends boolean DEFAULT true,
  
  -- Quiet hours
  quiet_hours_start time,
  quiet_hours_end time,
  
  -- Alert channels
  alert_channels jsonb DEFAULT '["in_app"]'::jsonb,
  
  -- Custom rules (extensible)
  custom_rules jsonb DEFAULT '{}'::jsonb,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_email_notification_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own settings
CREATE POLICY "Users can view own email settings"
  ON user_email_notification_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Only admin and elite can insert/update settings
CREATE POLICY "Admin and elite can modify email settings"
  ON user_email_notification_settings FOR ALL
  TO authenticated
  USING (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'elite')
    )
  )
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'elite')
    )
  );

-- Function to get user email settings with defaults
CREATE OR REPLACE FUNCTION get_user_email_settings(p_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  awaiting_reply_days integer,
  critical_reply_days integer,
  auto_alert_enabled boolean,
  alert_frequency text,
  include_weekends boolean,
  quiet_hours_start time,
  quiet_hours_end time,
  alert_channels jsonb,
  custom_rules jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(uens.user_id, p_user_id) as user_id,
    COALESCE(uens.awaiting_reply_days, 3) as awaiting_reply_days,
    COALESCE(uens.critical_reply_days, 7) as critical_reply_days,
    COALESCE(uens.auto_alert_enabled, true) as auto_alert_enabled,
    COALESCE(uens.alert_frequency, 'daily') as alert_frequency,
    COALESCE(uens.include_weekends, true) as include_weekends,
    uens.quiet_hours_start,
    uens.quiet_hours_end,
    COALESCE(uens.alert_channels, '["in_app"]'::jsonb) as alert_channels,
    COALESCE(uens.custom_rules, '{}'::jsonb) as custom_rules
  FROM user_email_notification_settings uens
  WHERE uens.user_id = p_user_id
  UNION ALL
  SELECT 
    p_user_id,
    3,
    7,
    true,
    'daily',
    true,
    NULL::time,
    NULL::time,
    '["in_app"]'::jsonb,
    '{}'::jsonb
  WHERE NOT EXISTS (
    SELECT 1 FROM user_email_notification_settings
    WHERE user_id = p_user_id
  )
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if email is awaiting reply based on user settings
CREATE OR REPLACE FUNCTION is_email_awaiting_reply(
  p_email_id uuid,
  p_user_id uuid
)
RETURNS boolean AS $$
DECLARE
  email_sent_at timestamptz;
  email_direction text;
  email_thread_id text;
  has_reply boolean;
  days_threshold integer;
  include_weekends boolean;
  days_elapsed numeric;
BEGIN
  -- Get email details
  SELECT sent_at, direction, thread_id
  INTO email_sent_at, email_direction, email_thread_id
  FROM email_activities
  WHERE id = p_email_id;
  
  -- Only check outbound emails
  IF email_direction != 'outbound' THEN
    RETURN false;
  END IF;
  
  -- Get user settings
  SELECT s.awaiting_reply_days, s.include_weekends
  INTO days_threshold, include_weekends
  FROM get_user_email_settings(p_user_id) s;
  
  -- Check if there's a reply in the thread
  SELECT EXISTS (
    SELECT 1 FROM email_activities
    WHERE thread_id = email_thread_id
      AND direction = 'inbound'
      AND COALESCE(sent_at, created_at) > email_sent_at
  ) INTO has_reply;
  
  IF has_reply THEN
    RETURN false;
  END IF;
  
  -- Calculate days elapsed
  IF include_weekends THEN
    days_elapsed := EXTRACT(EPOCH FROM (NOW() - email_sent_at)) / 86400;
  ELSE
    -- Calculate business days (excluding weekends)
    days_elapsed := (
      SELECT COUNT(*)
      FROM generate_series(email_sent_at::date, CURRENT_DATE, '1 day'::interval) d
      WHERE EXTRACT(DOW FROM d) NOT IN (0, 6)
    );
  END IF;
  
  RETURN days_elapsed >= days_threshold;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_email_settings_user_id 
  ON user_email_notification_settings(user_id);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_email_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_email_settings_updated_at 
  ON user_email_notification_settings;
CREATE TRIGGER trigger_update_email_settings_updated_at
  BEFORE UPDATE ON user_email_notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_email_settings_updated_at();
/*
  # Fix Email Threading Logic

  ## Overview
  This migration fixes the email threading logic to properly handle replies
  by prioritizing message_id linkage over subject matching.

  ## Changes

  1. Update check_awaiting_reply function
    - Use in_reply_to_message_id to find parent thread
    - Preserve thread_id from parent email when replying
    - Fall back to subject matching only if no parent found

  2. Add helper function to find thread by message_id
    - Looks up thread_id from parent email
    - Ensures replies stay in same thread

  3. Update thread_id generation
    - First checks for parent via in_reply_to_message_id
    - Then checks subject matching
    - Finally generates new thread for new conversations

  ## Security
  - Maintains existing RLS policies
  - Functions run with appropriate privileges
*/

-- Function to find parent thread by message_id
CREATE OR REPLACE FUNCTION find_parent_thread(p_in_reply_to text)
RETURNS text AS $$
DECLARE
  parent_thread text;
BEGIN
  IF p_in_reply_to IS NULL THEN
    RETURN NULL;
  END IF;
  
  SELECT thread_id INTO parent_thread
  FROM email_activities
  WHERE message_id = p_in_reply_to
  LIMIT 1;
  
  RETURN parent_thread;
END;
$$ LANGUAGE plpgsql STABLE;

-- Update check_awaiting_reply to properly set thread_id
CREATE OR REPLACE FUNCTION check_awaiting_reply()
RETURNS TRIGGER AS $$
DECLARE
  parent_thread text;
BEGIN
  -- First, try to find thread from in_reply_to_message_id
  IF NEW.in_reply_to_message_id IS NOT NULL THEN
    parent_thread := find_parent_thread(NEW.in_reply_to_message_id);
    
    IF parent_thread IS NOT NULL THEN
      NEW.thread_id := parent_thread;
    END IF;
  END IF;
  
  -- If no thread found via message_id, generate from subject
  IF NEW.thread_id IS NULL AND NEW.subject IS NOT NULL THEN
    NEW.thread_id := generate_thread_id(NEW.subject);
  END IF;

  -- For outbound emails, mark as awaiting reply
  IF NEW.direction = 'outbound' AND NEW.thread_id IS NOT NULL THEN
    NEW.awaiting_reply := true;
    NEW.awaiting_reply_since := COALESCE(NEW.sent_at, NOW());
    NEW.reply_by_date := COALESCE(NEW.sent_at, NOW()) + INTERVAL '3 days';
  END IF;

  -- Set is_thread_starter based on whether this is a reply
  IF NEW.in_reply_to_message_id IS NOT NULL THEN
    NEW.is_thread_starter := false;
  ELSIF NEW.thread_id IS NOT NULL THEN
    -- Check if this is the first message in thread
    NEW.is_thread_starter := NOT EXISTS (
      SELECT 1 FROM email_activities
      WHERE thread_id = NEW.thread_id
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to merge threads (for manual correction)
CREATE OR REPLACE FUNCTION merge_email_threads(
  p_source_thread_id text,
  p_target_thread_id text
)
RETURNS void AS $$
BEGIN
  -- Update all emails in source thread to target thread
  UPDATE email_activities
  SET thread_id = p_target_thread_id
  WHERE thread_id = p_source_thread_id;
  
  -- Recalculate thread metadata for target thread
  UPDATE email_activities e
  SET 
    thread_message_count = (
      SELECT COUNT(*)
      FROM email_activities
      WHERE thread_id = p_target_thread_id
    ),
    thread_participants = (
      SELECT array_agg(DISTINCT participant)
      FROM (
        SELECT unnest(array_cat(to_emails, COALESCE(cc_emails, ARRAY[]::text[]))) as participant
        FROM email_activities
        WHERE thread_id = p_target_thread_id
        UNION
        SELECT from_email as participant
        FROM email_activities
        WHERE thread_id = p_target_thread_id
      ) participants
    )
  WHERE thread_id = p_target_thread_id;
  
  -- Mark first message as thread starter
  UPDATE email_activities
  SET is_thread_starter = false
  WHERE thread_id = p_target_thread_id;
  
  UPDATE email_activities
  SET is_thread_starter = true
  WHERE id = (
    SELECT id
    FROM email_activities
    WHERE thread_id = p_target_thread_id
    ORDER BY COALESCE(sent_at, created_at) ASC
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix existing emails that should be in same thread based on subject
DO $$
DECLARE
  thread_record RECORD;
  first_id uuid;
BEGIN
  -- For each unique normalized subject with multiple emails
  FOR thread_record IN (
    SELECT generate_thread_id(subject) as normalized_thread
    FROM email_activities
    WHERE subject IS NOT NULL
    GROUP BY generate_thread_id(subject)
    HAVING COUNT(*) > 1
  )
  LOOP
    -- Get the first email in this thread (by date)
    SELECT id INTO first_id
    FROM email_activities
    WHERE generate_thread_id(subject) = thread_record.normalized_thread
    ORDER BY COALESCE(sent_at, created_at) ASC
    LIMIT 1;
    
    -- Update all emails with this normalized subject
    UPDATE email_activities
    SET 
      thread_id = thread_record.normalized_thread,
      is_thread_starter = (id = first_id)
    WHERE generate_thread_id(subject) = thread_record.normalized_thread;
  END LOOP;
END $$;

-- Update thread metadata for all threads
UPDATE email_activities e
SET 
  thread_message_count = (
    SELECT COUNT(*)
    FROM email_activities
    WHERE thread_id = e.thread_id
  ),
  thread_participants = (
    SELECT array_agg(DISTINCT participant)
    FROM (
      SELECT unnest(array_cat(to_emails, COALESCE(cc_emails, ARRAY[]::text[]))) as participant
      FROM email_activities
      WHERE thread_id = e.thread_id
      UNION
      SELECT from_email as participant
      FROM email_activities
      WHERE thread_id = e.thread_id
    ) participants
  )
WHERE thread_id IS NOT NULL;
/*
  # Create User Alert Preferences System

  1. New Tables
    - `user_alert_preferences`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `alert_type` (text) - Type of alert
      - `enabled` (boolean) - Whether this alert type is enabled
      - `threshold_days` (integer) - Number of days before alert triggers
      - `threshold_hours` (integer) - Number of hours before alert triggers (for calendar events)
      - `severity_level` (text) - low, medium, high, critical
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `user_alert_preferences` table
    - Add policies for users to manage their own preferences

  3. Alert Types Supported
    - email_awaiting_reply: Email hasn't received reply
    - email_critical_reply: Email overdue for reply
    - csp_stage_stuck: CSP event stuck in stage too long
    - tariff_expiring: Tariff expiring soon
    - tariff_expired: Tariff has expired
    - calendar_reminder: Upcoming calendar event
    - idle_negotiation: No activity on negotiation
    - document_update_needed: Document needs review/update
    - follow_up_reminder: General follow-up reminder
    - contract_renewal: Contract renewal approaching
*/

-- Create user_alert_preferences table
CREATE TABLE IF NOT EXISTS user_alert_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  alert_type text NOT NULL,
  enabled boolean DEFAULT true,
  threshold_days integer,
  threshold_hours integer,
  severity_level text DEFAULT 'medium',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, alert_type)
);

-- Enable RLS
ALTER TABLE user_alert_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own alert preferences"
  ON user_alert_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own alert preferences"
  ON user_alert_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own alert preferences"
  ON user_alert_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own alert preferences"
  ON user_alert_preferences FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_alert_preferences_user_id 
  ON user_alert_preferences(user_id);

CREATE INDEX IF NOT EXISTS idx_user_alert_preferences_alert_type 
  ON user_alert_preferences(alert_type);

-- Create function to get default alert preferences
CREATE OR REPLACE FUNCTION get_default_alert_preferences()
RETURNS TABLE (
  alert_type text,
  enabled boolean,
  threshold_days integer,
  threshold_hours integer,
  severity_level text,
  display_name text,
  description text
) AS $$
BEGIN
  RETURN QUERY SELECT 
    'email_awaiting_reply'::text, true, 3, NULL::integer, 'medium'::text,
    'Email Awaiting Reply'::text, 'Alert when an email hasn''t received a reply'::text
  UNION ALL SELECT 
    'email_critical_reply'::text, true, 7, NULL::integer, 'high'::text,
    'Email Critical Reply'::text, 'Escalate when email is overdue for reply'::text
  UNION ALL SELECT 
    'csp_stage_stuck'::text, true, 5, NULL::integer, 'medium'::text,
    'CSP Event Stuck in Stage'::text, 'Alert when CSP event hasn''t progressed'::text
  UNION ALL SELECT 
    'tariff_expiring'::text, true, 30, NULL::integer, 'high'::text,
    'Tariff Expiring Soon'::text, 'Alert before tariff expiration date'::text
  UNION ALL SELECT 
    'tariff_expired'::text, true, 0, NULL::integer, 'critical'::text,
    'Tariff Expired'::text, 'Alert when tariff has expired'::text
  UNION ALL SELECT 
    'calendar_reminder'::text, true, 1, NULL::integer, 'medium'::text,
    'Calendar Event Reminder'::text, 'Remind before upcoming calendar events'::text
  UNION ALL SELECT 
    'idle_negotiation'::text, true, 7, NULL::integer, 'medium'::text,
    'Idle Negotiation'::text, 'Alert when negotiation has no recent activity'::text
  UNION ALL SELECT 
    'document_update_needed'::text, true, 14, NULL::integer, 'low'::text,
    'Document Update Needed'::text, 'Alert when documents need review'::text
  UNION ALL SELECT 
    'follow_up_reminder'::text, true, 3, NULL::integer, 'medium'::text,
    'Follow-up Reminder'::text, 'General follow-up task reminders'::text
  UNION ALL SELECT 
    'contract_renewal'::text, true, 60, NULL::integer, 'high'::text,
    'Contract Renewal'::text, 'Alert before contract renewal date'::text;
END;
$$ LANGUAGE plpgsql;
/*
  # Add Alert Resolution Tracking

  1. Changes to `alerts` table
    - Add `resolved_by` field to track who resolved the alert
    - Add `resolution_notes` field for resolution context
    - Add `last_seen_at` field to track when alert was last viewed
    - Add `action_taken` field to track what action resolved it
  
  2. Updates
    - Update default status to 'active' instead of 'pending'
    - Add check constraint for valid statuses
  
  3. Security
    - Maintain existing RLS policies
*/

-- Add new columns to alerts table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'alerts' AND column_name = 'resolved_by'
  ) THEN
    ALTER TABLE alerts ADD COLUMN resolved_by uuid REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'alerts' AND column_name = 'resolution_notes'
  ) THEN
    ALTER TABLE alerts ADD COLUMN resolution_notes text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'alerts' AND column_name = 'last_seen_at'
  ) THEN
    ALTER TABLE alerts ADD COLUMN last_seen_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'alerts' AND column_name = 'action_taken'
  ) THEN
    ALTER TABLE alerts ADD COLUMN action_taken text;
  END IF;
END $$;

-- Update existing null statuses to 'active'
UPDATE alerts 
SET status = 'active' 
WHERE status IS NULL OR status = 'pending';

-- Add check constraint for valid statuses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'alerts_status_check'
  ) THEN
    ALTER TABLE alerts 
    ADD CONSTRAINT alerts_status_check 
    CHECK (status IN ('active', 'acknowledged', 'resolved', 'dismissed'));
  END IF;
END $$;

-- Set default status to 'active'
ALTER TABLE alerts ALTER COLUMN status SET DEFAULT 'active';

-- Create index for faster queries on active alerts
CREATE INDEX IF NOT EXISTS idx_alerts_status_created 
ON alerts(status, created_date DESC) 
WHERE status IN ('active', 'acknowledged');

-- Create index for assigned alerts
CREATE INDEX IF NOT EXISTS idx_alerts_assigned_status 
ON alerts(assigned_to, status) 
WHERE status IN ('active', 'acknowledged');
/*
  # Tariff Versioning and Activity System

  ## Overview
  Implements a comprehensive tariff family/version system with full activity tracking.
  Each tariff "family" represents a long-term relationship (customer + carrier + ownership),
  with multiple versions over time.

  ## Changes

  1. **Enhanced Tariffs Table**
    - Add `tariff_family_id` - groups related versions
    - Add `version_number` - sequential version within family
    - Add `superseded_by_id` - links to newer version
    - Add `created_by` - user who created this version (nullable)
    - Add `source` - how it was created (manual_upload, csp_event, system)
    - Add `finalized_date` - when it became active
    - Expand status to include: proposed, active, expiring, expired, superseded

  2. **Tariff Activities Table**
    - Tracks all changes and events for each tariff version
    - Auto-populated by triggers on status changes
    - Links to users, files, notes

  3. **Functions**
    - Auto-generate tariff_family_id based on customer + carrier + ownership
    - Log all status transitions to activities

  ## Security
    - RLS enabled on all new tables
    - Authenticated users can view tariffs they have access to

  ## Notes
    - Maintains backward compatibility with existing tariffs
    - All existing tariffs get migrated to version 1.0
*/

-- Enable uuid-ossp extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add new columns to tariffs table
DO $$
BEGIN
  -- tariff_family_id: logical grouping of all versions for same customer+carrier+ownership
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tariffs' AND column_name = 'tariff_family_id'
  ) THEN
    ALTER TABLE tariffs ADD COLUMN tariff_family_id uuid;
  END IF;

  -- version_number: semantic version within family (e.g., 2024.1, 2025.1)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tariffs' AND column_name = 'version_number'
  ) THEN
    ALTER TABLE tariffs ADD COLUMN version_number text DEFAULT '1.0';
  END IF;

  -- superseded_by_id: points to the tariff that replaced this one
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tariffs' AND column_name = 'superseded_by_id'
  ) THEN
    ALTER TABLE tariffs ADD COLUMN superseded_by_id uuid REFERENCES tariffs(id);
  END IF;

  -- created_by: user who created this tariff version (nullable for backwards compat)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tariffs' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE tariffs ADD COLUMN created_by uuid REFERENCES auth.users(id);
  END IF;

  -- source: how was this tariff created
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tariffs' AND column_name = 'source'
  ) THEN
    ALTER TABLE tariffs ADD COLUMN source text DEFAULT 'manual_upload' CHECK (source IN ('manual_upload', 'csp_event', 'system', 'renewal'));
  END IF;

  -- finalized_date: when tariff became active
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tariffs' AND column_name = 'finalized_date'
  ) THEN
    ALTER TABLE tariffs ADD COLUMN finalized_date timestamptz;
  END IF;

  -- carrier_name: denormalized for easier display
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tariffs' AND column_name = 'carrier_name'
  ) THEN
    ALTER TABLE tariffs ADD COLUMN carrier_name text;
  END IF;

  -- customer_name: denormalized for easier display
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tariffs' AND column_name = 'customer_name'
  ) THEN
    ALTER TABLE tariffs ADD COLUMN customer_name text;
  END IF;
END $$;

-- Create tariff_activities table
CREATE TABLE IF NOT EXISTS tariff_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tariff_id uuid NOT NULL REFERENCES tariffs(id) ON DELETE CASCADE,
  activity_type text NOT NULL CHECK (activity_type IN ('status_change', 'note', 'file_upload', 'system', 'ai')),
  description text NOT NULL,
  old_status text,
  new_status text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE tariff_activities ENABLE ROW LEVEL SECURITY;

-- RLS policies for tariff_activities
CREATE POLICY "Users can view tariff activities"
  ON tariff_activities FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create tariff activities"
  ON tariff_activities FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tariff_activities_tariff_id ON tariff_activities(tariff_id);
CREATE INDEX IF NOT EXISTS idx_tariff_activities_created_at ON tariff_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tariffs_family_id ON tariffs(tariff_family_id);
CREATE INDEX IF NOT EXISTS idx_tariffs_status ON tariffs(status);
CREATE INDEX IF NOT EXISTS idx_tariffs_expiry_date ON tariffs(expiry_date);

-- Function to generate tariff_family_id based on customer + carrier + ownership
CREATE OR REPLACE FUNCTION generate_tariff_family_id(
  p_customer_id uuid,
  p_carrier_ids uuid[],
  p_ownership_type text
)
RETURNS uuid AS $$
DECLARE
  v_carrier_id uuid;
  v_family_id uuid;
BEGIN
  -- Use first carrier_id for family grouping
  IF array_length(p_carrier_ids, 1) > 0 THEN
    v_carrier_id := p_carrier_ids[1];
  END IF;

  -- Generate deterministic UUID based on customer + carrier + ownership
  v_family_id := uuid_generate_v5(
    '00000000-0000-0000-0000-000000000000'::uuid,
    COALESCE(p_customer_id::text, '') || 
    COALESCE(v_carrier_id::text, '') || 
    COALESCE(p_ownership_type, '')
  );

  RETURN v_family_id;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to log tariff activity
CREATE OR REPLACE FUNCTION log_tariff_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Log status changes
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO tariff_activities (
      tariff_id,
      activity_type,
      description,
      old_status,
      new_status,
      created_by,
      metadata
    ) VALUES (
      NEW.id,
      'status_change',
      format('Status changed from %s to %s', OLD.status, NEW.status),
      OLD.status,
      NEW.status,
      NEW.created_by,
      jsonb_build_object(
        'previous_status', OLD.status,
        'new_status', NEW.status,
        'finalized_date', NEW.finalized_date
      )
    );
  END IF;

  -- Log creation (only for new inserts, not during migration)
  IF TG_OP = 'INSERT' AND NEW.created_date > now() - INTERVAL '1 minute' THEN
    INSERT INTO tariff_activities (
      tariff_id,
      activity_type,
      description,
      created_by,
      metadata
    ) VALUES (
      NEW.id,
      'system',
      format('Tariff version %s created via %s', COALESCE(NEW.version_number, '1.0'), NEW.source),
      NEW.created_by,
      jsonb_build_object(
        'source', NEW.source,
        'version', NEW.version_number,
        'csp_event_id', NEW.csp_event_id
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic activity logging
DROP TRIGGER IF EXISTS trigger_log_tariff_activity ON tariffs;
CREATE TRIGGER trigger_log_tariff_activity
  AFTER INSERT OR UPDATE ON tariffs
  FOR EACH ROW
  EXECUTE FUNCTION log_tariff_activity();

-- Function to auto-update expiring status
CREATE OR REPLACE FUNCTION update_tariff_expiring_status()
RETURNS void AS $$
BEGIN
  -- Mark as expiring if < 90 days and currently active
  UPDATE tariffs
  SET status = 'expiring'
  WHERE status = 'active'
    AND expiry_date <= CURRENT_DATE + INTERVAL '90 days'
    AND expiry_date > CURRENT_DATE;

  -- Mark as expired if past expiry date
  UPDATE tariffs
  SET status = 'expired'
  WHERE status IN ('active', 'expiring')
    AND expiry_date <= CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backfill tariff_family_id for existing tariffs
UPDATE tariffs
SET tariff_family_id = generate_tariff_family_id(customer_id, carrier_ids, ownership_type)
WHERE tariff_family_id IS NULL;
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
9. renewal_watch - Active monitoring before expiry (60-90 days)';/*
  # Create Tariff SOP (Standard Operating Procedures) System

  1. Overview
    - Enables documentation and collaboration space for tariff families
    - Supports both document uploads and rich-text notes
    - Tracks revision history and visibility settings
    - Integrates with activity tracking

  2. New Tables
    
    ### `tariff_sops`
    - `id` (uuid, primary key) - Unique identifier
    - `tariff_id` (uuid, foreign key) - References tariffs table (can be family or version)
    - `tariff_family_id` (uuid, nullable) - Direct reference to family for family-wide SOPs
    - `title` (text) - SOP title/name
    - `type` (text) - 'document' or 'note'
    - `content` (text, nullable) - Rich text content for notes
    - `document_url` (text, nullable) - URL to uploaded document
    - `document_type` (text, nullable) - File extension (pdf, docx, xlsx, etc)
    - `visibility` (text) - 'internal' or 'shared'
    - `version` (integer) - Version number for tracking revisions
    - `created_by` (uuid, foreign key) - User who created the SOP
    - `created_at` (timestamptz) - Creation timestamp
    - `updated_at` (timestamptz) - Last update timestamp
    - `user_id` (uuid, foreign key) - Owner/tenant
    - `metadata` (jsonb) - Additional context (carrier contacts, etc)

    ### `tariff_sop_revisions`
    - `id` (uuid, primary key) - Unique identifier
    - `sop_id` (uuid, foreign key) - References tariff_sops
    - `version` (integer) - Version number
    - `title` (text) - Title at this version
    - `content` (text, nullable) - Content at this version
    - `document_url` (text, nullable) - Document URL at this version
    - `changed_by` (uuid, foreign key) - User who made the change
    - `changed_at` (timestamptz) - When the change occurred
    - `change_notes` (text) - Description of changes

  3. Activity Tracking
    - Add new activity types: sop_added, sop_updated, sop_deleted
    - Automatically log SOP changes to tariff activity timeline

  4. Security
    - Enable RLS on all tables
    - Users can view SOPs for tariffs they have access to
    - Only creators and admins can update/delete SOPs
    - Shared SOPs visible to carrier contacts (future portal integration)
*/

-- Create tariff_sops table
CREATE TABLE IF NOT EXISTS tariff_sops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tariff_id uuid REFERENCES tariffs(id) ON DELETE CASCADE,
  tariff_family_id text,
  title text NOT NULL,
  type text NOT NULL CHECK (type IN ('document', 'note')),
  content text,
  document_url text,
  document_type text,
  visibility text NOT NULL DEFAULT 'internal' CHECK (visibility IN ('internal', 'shared')),
  version integer NOT NULL DEFAULT 1,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create tariff_sop_revisions table
CREATE TABLE IF NOT EXISTS tariff_sop_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sop_id uuid NOT NULL REFERENCES tariff_sops(id) ON DELETE CASCADE,
  version integer NOT NULL,
  title text NOT NULL,
  content text,
  document_url text,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  change_notes text DEFAULT ''
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tariff_sops_tariff ON tariff_sops(tariff_id);
CREATE INDEX IF NOT EXISTS idx_tariff_sops_family ON tariff_sops(tariff_family_id);
CREATE INDEX IF NOT EXISTS idx_tariff_sops_user ON tariff_sops(user_id);
CREATE INDEX IF NOT EXISTS idx_tariff_sops_created ON tariff_sops(created_at);
CREATE INDEX IF NOT EXISTS idx_tariff_sop_revisions_sop ON tariff_sop_revisions(sop_id);
CREATE INDEX IF NOT EXISTS idx_tariff_sop_revisions_version ON tariff_sop_revisions(sop_id, version);

-- Enable RLS
ALTER TABLE tariff_sops ENABLE ROW LEVEL SECURITY;
ALTER TABLE tariff_sop_revisions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tariff_sops

-- Users can view SOPs for their tariffs
CREATE POLICY "Users can view their SOPs"
  ON tariff_sops
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Mock user can view mock SOPs
CREATE POLICY "Mock user can view mock SOPs"
  ON tariff_sops
  FOR SELECT
  USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

-- Users can create SOPs
CREATE POLICY "Users can create SOPs"
  ON tariff_sops
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Mock user can create SOPs
CREATE POLICY "Mock user can create mock SOPs"
  ON tariff_sops
  FOR INSERT
  WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

-- Users can update their own SOPs
CREATE POLICY "Users can update their SOPs"
  ON tariff_sops
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Mock user can update mock SOPs
CREATE POLICY "Mock user can update mock SOPs"
  ON tariff_sops
  FOR UPDATE
  USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid)
  WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

-- Users can delete their own SOPs
CREATE POLICY "Users can delete their SOPs"
  ON tariff_sops
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Mock user can delete mock SOPs
CREATE POLICY "Mock user can delete mock SOPs"
  ON tariff_sops
  FOR DELETE
  USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

-- RLS Policies for tariff_sop_revisions

-- Users can view revisions for SOPs they can access
CREATE POLICY "Users can view SOP revisions"
  ON tariff_sop_revisions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tariff_sops
      WHERE tariff_sops.id = tariff_sop_revisions.sop_id
      AND tariff_sops.user_id = auth.uid()
    )
  );

-- Mock user can view mock revisions
CREATE POLICY "Mock user can view mock SOP revisions"
  ON tariff_sop_revisions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tariff_sops
      WHERE tariff_sops.id = tariff_sop_revisions.sop_id
      AND tariff_sops.user_id = '00000000-0000-0000-0000-000000000000'::uuid
    )
  );

-- System creates revisions (via trigger)
CREATE POLICY "System can create revisions"
  ON tariff_sop_revisions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to create revision on SOP update
CREATE OR REPLACE FUNCTION create_sop_revision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only create revision if content actually changed
  IF (OLD.title IS DISTINCT FROM NEW.title) OR
     (OLD.content IS DISTINCT FROM NEW.content) OR
     (OLD.document_url IS DISTINCT FROM NEW.document_url) THEN
    
    -- Increment version
    NEW.version := OLD.version + 1;
    NEW.updated_at := now();
    
    -- Create revision record
    INSERT INTO tariff_sop_revisions (
      sop_id,
      version,
      title,
      content,
      document_url,
      changed_by,
      changed_at
    ) VALUES (
      OLD.id,
      OLD.version,
      OLD.title,
      OLD.content,
      OLD.document_url,
      auth.uid(),
      now()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to create revisions
DROP TRIGGER IF EXISTS on_tariff_sop_update ON tariff_sops;
CREATE TRIGGER on_tariff_sop_update
  BEFORE UPDATE ON tariff_sops
  FOR EACH ROW
  EXECUTE FUNCTION create_sop_revision();

-- Function to log SOP activity
CREATE OR REPLACE FUNCTION log_sop_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  activity_type text;
  activity_description text;
  tariff_record record;
BEGIN
  -- Determine activity type
  IF TG_OP = 'INSERT' THEN
    activity_type := 'sop_added';
    activity_description := 'SOP "' || NEW.title || '" added';
  ELSIF TG_OP = 'UPDATE' THEN
    activity_type := 'sop_updated';
    activity_description := 'SOP "' || NEW.title || '" updated to v' || NEW.version::text;
  ELSIF TG_OP = 'DELETE' THEN
    activity_type := 'sop_deleted';
    activity_description := 'SOP "' || OLD.title || '" deleted';
  END IF;
  
  -- Get tariff details for activity log
  IF TG_OP = 'DELETE' THEN
    SELECT * INTO tariff_record FROM tariffs WHERE id = OLD.tariff_id;
  ELSE
    SELECT * INTO tariff_record FROM tariffs WHERE id = NEW.tariff_id;
  END IF;
  
  -- Log to tariff_activity if tariff exists
  IF tariff_record.id IS NOT NULL THEN
    INSERT INTO tariff_activity (
      tariff_id,
      activity_type,
      description,
      user_id,
      metadata
    ) VALUES (
      tariff_record.id,
      activity_type,
      activity_description,
      COALESCE(auth.uid(), (CASE WHEN TG_OP = 'DELETE' THEN OLD.user_id ELSE NEW.user_id END)),
      jsonb_build_object(
        'sop_id', CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
        'sop_type', CASE WHEN TG_OP = 'DELETE' THEN OLD.type ELSE NEW.type END,
        'visibility', CASE WHEN TG_OP = 'DELETE' THEN OLD.visibility ELSE NEW.visibility END
      )
    );
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Triggers to log SOP activity
DROP TRIGGER IF EXISTS on_tariff_sop_activity ON tariff_sops;
CREATE TRIGGER on_tariff_sop_activity
  AFTER INSERT OR UPDATE OR DELETE ON tariff_sops
  FOR EACH ROW
  EXECUTE FUNCTION log_sop_activity();/*
  # Create Storage Bucket for SOP Documents

  1. Overview
    - Creates a storage bucket for SOP document uploads
    - Enables secure file storage for PDFs, Word docs, Excel files
    - Sets up RLS policies for file access

  2. Storage Setup
    - Bucket name: 'sop-documents'
    - Allowed file types: PDF, DOC, DOCX, XLS, XLSX
    - Size limit: 50MB per file

  3. Security
    - Users can upload files to their own folders
    - Users can view files they have access to
    - Files are organized by user_id/tariff_id/filename
*/

-- Create storage bucket for SOP documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('sop-documents', 'sop-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files
CREATE POLICY "Users can upload SOP documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'sop-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to view their own SOP documents
CREATE POLICY "Users can view their SOP documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'sop-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow mock user to upload files
CREATE POLICY "Mock user can upload SOP documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'sop-documents' AND
  (storage.foldername(name))[1] = '00000000-0000-0000-0000-000000000000'
);

-- Allow mock user to view their documents
CREATE POLICY "Mock user can view their SOP documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'sop-documents' AND
  (storage.foldername(name))[1] = '00000000-0000-0000-0000-000000000000'
);

-- Allow users to delete their own documents
CREATE POLICY "Users can delete their SOP documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'sop-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow mock user to delete their documents
CREATE POLICY "Mock user can delete their SOP documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'sop-documents' AND
  (storage.foldername(name))[1] = '00000000-0000-0000-0000-000000000000'
);/*
  # Add mode column to tariffs

  1. Changes
    - Add `mode` column to tariffs table to store service type (LTL, Home Delivery, TL, etc.)
    - This allows filtering tariffs by service type in the UI

  2. Notes
    - Column is nullable for backward compatibility with existing tariffs
    - Common values: LTL, Home Delivery, TL, Parcel, Ocean, Air
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tariffs' AND column_name = 'mode'
  ) THEN
    ALTER TABLE tariffs ADD COLUMN mode text;
  END IF;
END $$;
/*
  # Add mode column to tariffs

  1. Changes
    - Add `mode` column to tariffs table to store service type (LTL, Home Delivery, TL, etc.)
    - This allows filtering tariffs by service type in the UI

  2. Notes
    - Column is nullable for backward compatibility with existing tariffs
    - Common values: LTL, Home Delivery, TL, Parcel, Ocean, Air
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tariffs' AND column_name = 'mode'
  ) THEN
    ALTER TABLE tariffs ADD COLUMN mode text;
  END IF;
END $$;
/*
  # Create Notifications System

  1. New Tables
    - `notifications`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users) - User receiving the notification
      - `type` (text) - Type of notification (csp_assignment, tariff_expiring, etc.)
      - `title` (text) - Notification title
      - `message` (text) - Notification message
      - `read` (boolean) - Whether notification has been read
      - `link` (text) - Optional link to relevant page
      - `metadata` (jsonb) - Additional data (entity_id, entity_type, etc.)
      - `created_at` (timestamptz)
      - `read_at` (timestamptz) - When notification was read

  2. Security
    - Enable RLS on `notifications` table
    - Add policy for users to read their own notifications
    - Add policy for users to update their own notifications
    - Add policy for authenticated users to create notifications

  3. Indexes
    - Add index on user_id for faster queries
    - Add index on read status for unread notifications queries
*/

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  read boolean DEFAULT false,
  link text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  read_at timestamptz
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can create notifications"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);/*
  # Create CSP Event Assignment Notification Trigger

  1. Function
    - Creates a notification when a CSP event is assigned to a user
    - Triggers on INSERT or UPDATE of csp_events table
    - Only creates notification if assigned_to has changed
    - Includes link to the CSP event detail page

  2. Trigger
    - Fires after INSERT or UPDATE on csp_events
    - Calls the notification creation function
*/

CREATE OR REPLACE FUNCTION notify_csp_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify if assigned_to has changed and is not null
  IF (TG_OP = 'INSERT' AND NEW.assigned_to IS NOT NULL) OR
     (TG_OP = 'UPDATE' AND NEW.assigned_to IS NOT NULL AND 
      (OLD.assigned_to IS NULL OR OLD.assigned_to != NEW.assigned_to)) THEN
    
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      link,
      metadata
    ) VALUES (
      NEW.assigned_to,
      'csp_assignment',
      'New CSP Event Assigned',
      'You have been assigned to CSP event: ' || COALESCE(NEW.name, 'Untitled Event'),
      '/pipeline?event=' || NEW.id::text,
      jsonb_build_object(
        'csp_event_id', NEW.id,
        'csp_event_name', NEW.name,
        'customer_id', NEW.customer_id,
        'stage', NEW.stage
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_csp_assignment ON csp_events;

CREATE TRIGGER trigger_notify_csp_assignment
  AFTER INSERT OR UPDATE ON csp_events
  FOR EACH ROW
  EXECUTE FUNCTION notify_csp_assignment();/*
  # Fix User Invitations Role Constraint

  1. Changes
    - Drop the existing check constraint on user_invitations.role
    - Add new constraint that includes all system roles: admin, elite, tariff_master, basic, viewer
    
  2. Notes
    - This aligns the invitation roles with the actual roles used in user_profiles
    - Ensures users can be invited with any valid system role
*/

ALTER TABLE user_invitations 
  DROP CONSTRAINT IF EXISTS user_invitations_role_check;

ALTER TABLE user_invitations
  ADD CONSTRAINT user_invitations_role_check 
  CHECK (role IN ('admin', 'elite', 'tariff_master', 'basic', 'viewer'));/*
  # Fix User Profiles Role Constraint

  1. Changes
    - Drop the existing check constraint on user_profiles.role
    - Add new constraint that includes all system roles: admin, elite, tariff_master, basic, viewer
    
  2. Notes
    - This aligns the user_profiles roles with the roles used throughout the system
    - Allows users to be assigned any valid role when their profile is created
*/

ALTER TABLE user_profiles 
  DROP CONSTRAINT IF EXISTS user_profiles_role_check;

ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_role_check 
  CHECK (role IN ('admin', 'elite', 'tariff_master', 'basic', 'viewer'));/*
  # User Onboarding State

  ## Overview
  Tracks whether users have completed the onboarding tour and which step they're on.

  ## Tables
  1. New Table: `user_onboarding_state`
    - `id` (uuid, primary key) - Unique identifier
    - `user_id` (uuid, foreign key) - References auth.users
    - `onboarding_completed` (boolean) - Whether user completed tour
    - `current_step` (integer) - Current step in tour (0-based)
    - `skipped` (boolean) - Whether user skipped the tour
    - `completed_at` (timestamptz, nullable) - When tour was completed
    - `created_at` (timestamptz) - When record was created
    - `updated_at` (timestamptz) - Last update time

  ## Security
  - Enable RLS on user_onboarding_state table
  - Users can read and update their own onboarding state
  - Automatic creation via trigger when user profile is created

  ## Indexes
  - `user_id` for quick lookup
*/

-- Create user_onboarding_state table
CREATE TABLE IF NOT EXISTS user_onboarding_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  onboarding_completed boolean DEFAULT false NOT NULL,
  current_step integer DEFAULT 0 NOT NULL,
  skipped boolean DEFAULT false NOT NULL,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_user_onboarding_state_user_id ON user_onboarding_state(user_id);

-- Enable RLS
ALTER TABLE user_onboarding_state ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own onboarding state"
  ON user_onboarding_state
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own onboarding state"
  ON user_onboarding_state
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can insert own onboarding state"
  ON user_onboarding_state
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Function to create onboarding state for new users
CREATE OR REPLACE FUNCTION create_user_onboarding_state()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_onboarding_state (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger to create onboarding state when user profile is created
DROP TRIGGER IF EXISTS on_user_profile_created_onboarding ON user_profiles;
CREATE TRIGGER on_user_profile_created_onboarding
  AFTER INSERT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_user_onboarding_state();

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_onboarding_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS update_onboarding_timestamp ON user_onboarding_state;
CREATE TRIGGER update_onboarding_timestamp
  BEFORE UPDATE ON user_onboarding_state
  FOR EACH ROW
  EXECUTE FUNCTION update_onboarding_updated_at();/*
  # User Feedback and Feature Request System

  ## Overview
  Allows users to submit feedback, bug reports, and feature requests with automatic context detection.

  ## Tables
  1. New Table: `user_feedback`
    - `id` (uuid, primary key) - Unique identifier
    - `user_id` (uuid, foreign key) - References auth.users
    - `feedback_type` (text) - Type: 'bug', 'feature_request', 'improvement', 'question', 'other'
    - `title` (text) - Brief title of the feedback
    - `description` (text) - Detailed description
    - `current_page` (text) - Page/location where feedback originated
    - `priority` (text) - User-indicated priority: 'low', 'medium', 'high', 'critical'
    - `status` (text) - Status: 'submitted', 'reviewing', 'planned', 'in_progress', 'completed', 'declined'
    - `admin_notes` (text, nullable) - Notes from admin review
    - `bolt_prompt_suggestion` (text, nullable) - AI-generated prompt suggestion
    - `created_at` (timestamptz) - When feedback was submitted
    - `updated_at` (timestamptz) - Last update time
    - `completed_at` (timestamptz, nullable) - When resolved

  ## Security
  - Enable RLS on user_feedback table
  - Users can create and view their own feedback
  - Admins can view and update all feedback

  ## Indexes
  - `user_id` for quick lookup
  - `feedback_type` for filtering
  - `status` for filtering
  - `created_at` for sorting
*/

-- Create user_feedback table
CREATE TABLE IF NOT EXISTS user_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  feedback_type text NOT NULL CHECK (feedback_type IN ('bug', 'feature_request', 'improvement', 'question', 'other')),
  title text NOT NULL,
  description text NOT NULL,
  current_page text NOT NULL,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'reviewing', 'planned', 'in_progress', 'completed', 'declined')),
  admin_notes text,
  bolt_prompt_suggestion text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  completed_at timestamptz
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON user_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_type ON user_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_user_feedback_status ON user_feedback(status);
CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON user_feedback(created_at DESC);

-- Enable RLS
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own feedback"
  ON user_feedback
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all feedback"
  ON user_feedback
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
      AND is_active = true
    )
  );

CREATE POLICY "Users can insert own feedback"
  ON user_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update all feedback"
  ON user_feedback
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
      AND is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
      AND is_active = true
    )
  );

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_feedback_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.status IN ('completed', 'declined') AND OLD.status NOT IN ('completed', 'declined') THEN
    NEW.completed_at = now();
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS update_feedback_timestamp ON user_feedback;
CREATE TRIGGER update_feedback_timestamp
  BEFORE UPDATE ON user_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_feedback_updated_at();/*
  # Fix User Invitations Unique Constraint
  
  ## Problem
  The UNIQUE(email, status) constraint prevents multiple cancelled invitations
  for the same email, which causes errors when trying to cancel invitations.
  
  ## Solution
  1. Drop the problematic UNIQUE(email, status) constraint
  2. Create a partial unique index that only applies to 'pending' invitations
  3. This allows only one pending invitation per email, but unlimited cancelled/expired/accepted invitations
  
  ## Changes
  - Drop `user_invitations_email_status_key` constraint
  - Create partial unique index on (email) WHERE status = 'pending'
*/

-- Drop the existing unique constraint
ALTER TABLE user_invitations 
  DROP CONSTRAINT IF EXISTS user_invitations_email_status_key;

-- Create a partial unique index that only applies to pending invitations
-- This allows only one pending invitation per email, but multiple cancelled/expired/accepted
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_invitations_email_pending 
  ON user_invitations(email) 
  WHERE status = 'pending';/*
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
/*
  # Optimize RLS Policies - Part 3a
  
  Optimizes RLS policies by wrapping auth.uid() calls in SELECT subqueries
  to prevent per-row re-evaluation, improving query performance at scale.
  
  This part covers: customers, csp_events, tasks, interactions, shipments
*/

-- CUSTOMERS
DROP POLICY IF EXISTS "Users can view own customers" ON public.customers;
DROP POLICY IF EXISTS "Users can insert own customers" ON public.customers;
DROP POLICY IF EXISTS "Users can update own customers" ON public.customers;
DROP POLICY IF EXISTS "Users can delete own customers" ON public.customers;

CREATE POLICY "Users can view own customers"
  ON public.customers FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own customers"
  ON public.customers FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own customers"
  ON public.customers FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own customers"
  ON public.customers FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- CSP_EVENTS
DROP POLICY IF EXISTS "Users can view own csp_events" ON public.csp_events;
DROP POLICY IF EXISTS "Users can insert own csp_events" ON public.csp_events;
DROP POLICY IF EXISTS "Users can update own csp_events" ON public.csp_events;
DROP POLICY IF EXISTS "Users can delete own csp_events" ON public.csp_events;

CREATE POLICY "Users can view own csp_events"
  ON public.csp_events FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own csp_events"
  ON public.csp_events FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own csp_events"
  ON public.csp_events FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own csp_events"
  ON public.csp_events FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- TASKS
DROP POLICY IF EXISTS "Users can view own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can insert own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;

CREATE POLICY "Users can view own tasks"
  ON public.tasks FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own tasks"
  ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own tasks"
  ON public.tasks FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own tasks"
  ON public.tasks FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- INTERACTIONS
DROP POLICY IF EXISTS "Users can view own interactions" ON public.interactions;
DROP POLICY IF EXISTS "Users can insert own interactions" ON public.interactions;
DROP POLICY IF EXISTS "Users can update own interactions" ON public.interactions;
DROP POLICY IF EXISTS "Users can delete own interactions" ON public.interactions;

CREATE POLICY "Users can view own interactions"
  ON public.interactions FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own interactions"
  ON public.interactions FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own interactions"
  ON public.interactions FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own interactions"
  ON public.interactions FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- SHIPMENTS
DROP POLICY IF EXISTS "Users can view own shipments" ON public.shipments;
DROP POLICY IF EXISTS "Users can insert own shipments" ON public.shipments;
DROP POLICY IF EXISTS "Users can update own shipments" ON public.shipments;
DROP POLICY IF EXISTS "Users can delete own shipments" ON public.shipments;

CREATE POLICY "Users can view own shipments"
  ON public.shipments FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own shipments"
  ON public.shipments FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own shipments"
  ON public.shipments FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own shipments"
  ON public.shipments FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));
/*
  # Optimize RLS Policies - Part 3b
  
  Optimizes RLS policies by wrapping auth.uid() calls in SELECT subqueries.
  
  This part covers: alerts, lost_opportunities, report_snapshots, carriers, calendar_events
*/

-- ALERTS
DROP POLICY IF EXISTS "Users can view own alerts" ON public.alerts;
DROP POLICY IF EXISTS "Users can insert own alerts" ON public.alerts;
DROP POLICY IF EXISTS "Users can update own alerts" ON public.alerts;
DROP POLICY IF EXISTS "Users can delete own alerts" ON public.alerts;

CREATE POLICY "Users can view own alerts"
  ON public.alerts FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR assigned_to = (SELECT auth.uid()));

CREATE POLICY "Users can insert own alerts"
  ON public.alerts FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own alerts"
  ON public.alerts FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()) OR assigned_to = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()) OR assigned_to = (SELECT auth.uid()));

CREATE POLICY "Users can delete own alerts"
  ON public.alerts FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- LOST_OPPORTUNITIES
DROP POLICY IF EXISTS "Users can view own lost_opportunities" ON public.lost_opportunities;
DROP POLICY IF EXISTS "Users can insert own lost_opportunities" ON public.lost_opportunities;
DROP POLICY IF EXISTS "Users can update own lost_opportunities" ON public.lost_opportunities;
DROP POLICY IF EXISTS "Users can delete own lost_opportunities" ON public.lost_opportunities;

CREATE POLICY "Users can view own lost_opportunities"
  ON public.lost_opportunities FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own lost_opportunities"
  ON public.lost_opportunities FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own lost_opportunities"
  ON public.lost_opportunities FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own lost_opportunities"
  ON public.lost_opportunities FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- REPORT_SNAPSHOTS
DROP POLICY IF EXISTS "Users can view own report_snapshots" ON public.report_snapshots;
DROP POLICY IF EXISTS "Users can insert own report_snapshots" ON public.report_snapshots;
DROP POLICY IF EXISTS "Users can update own report_snapshots" ON public.report_snapshots;
DROP POLICY IF EXISTS "Users can delete own report_snapshots" ON public.report_snapshots;

CREATE POLICY "Users can view own report_snapshots"
  ON public.report_snapshots FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own report_snapshots"
  ON public.report_snapshots FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own report_snapshots"
  ON public.report_snapshots FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own report_snapshots"
  ON public.report_snapshots FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- CARRIERS
DROP POLICY IF EXISTS "Users can view own carriers" ON public.carriers;
DROP POLICY IF EXISTS "Users can insert own carriers" ON public.carriers;
DROP POLICY IF EXISTS "Users can update own carriers" ON public.carriers;
DROP POLICY IF EXISTS "Users can delete own carriers" ON public.carriers;

CREATE POLICY "Users can view own carriers"
  ON public.carriers FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own carriers"
  ON public.carriers FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own carriers"
  ON public.carriers FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own carriers"
  ON public.carriers FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- CALENDAR_EVENTS
DROP POLICY IF EXISTS "Users can view own calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can insert own calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can update own calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can delete own calendar events" ON public.calendar_events;

CREATE POLICY "Users can view own calendar events"
  ON public.calendar_events FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own calendar events"
  ON public.calendar_events FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own calendar events"
  ON public.calendar_events FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own calendar events"
  ON public.calendar_events FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));
/*
  # Optimize RLS Policies - Part 3c
  
  Optimizes RLS policies by wrapping auth.uid() calls in SELECT subqueries.
  
  This part covers: email_activities, gmail_watch_subscriptions, user_profiles, 
  user_gmail_tokens, csp_stage_history, documents
*/

-- EMAIL_ACTIVITIES
DROP POLICY IF EXISTS "Users can update their own email activities" ON public.email_activities;

CREATE POLICY "Users can update their own email activities"
  ON public.email_activities FOR UPDATE TO authenticated
  USING (created_by = (SELECT auth.uid()))
  WITH CHECK (created_by = (SELECT auth.uid()));

-- GMAIL_WATCH_SUBSCRIPTIONS
DROP POLICY IF EXISTS "Users can view own gmail subscriptions" ON public.gmail_watch_subscriptions;
DROP POLICY IF EXISTS "Users can create own gmail subscriptions" ON public.gmail_watch_subscriptions;
DROP POLICY IF EXISTS "Users can update own gmail subscriptions" ON public.gmail_watch_subscriptions;
DROP POLICY IF EXISTS "Users can delete own gmail subscriptions" ON public.gmail_watch_subscriptions;

CREATE POLICY "Users can view own gmail subscriptions"
  ON public.gmail_watch_subscriptions FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can create own gmail subscriptions"
  ON public.gmail_watch_subscriptions FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own gmail subscriptions"
  ON public.gmail_watch_subscriptions FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own gmail subscriptions"
  ON public.gmail_watch_subscriptions FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- USER_PROFILES
DROP POLICY IF EXISTS "allow_profile_creation" ON public.user_profiles;
DROP POLICY IF EXISTS "users_update_own_profile" ON public.user_profiles;

CREATE POLICY "allow_profile_creation"
  ON public.user_profiles FOR INSERT TO authenticated
  WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "users_update_own_profile"
  ON public.user_profiles FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- USER_GMAIL_TOKENS
DROP POLICY IF EXISTS "Users can view own gmail tokens" ON public.user_gmail_tokens;
DROP POLICY IF EXISTS "Users can insert own gmail tokens" ON public.user_gmail_tokens;
DROP POLICY IF EXISTS "Users can update own gmail tokens" ON public.user_gmail_tokens;
DROP POLICY IF EXISTS "Users can delete own gmail tokens" ON public.user_gmail_tokens;

CREATE POLICY "Users can view own gmail tokens"
  ON public.user_gmail_tokens FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own gmail tokens"
  ON public.user_gmail_tokens FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own gmail tokens"
  ON public.user_gmail_tokens FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own gmail tokens"
  ON public.user_gmail_tokens FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- CSP_STAGE_HISTORY
DROP POLICY IF EXISTS "Users can create stage history" ON public.csp_stage_history;

CREATE POLICY "Users can create stage history"
  ON public.csp_stage_history FOR INSERT TO authenticated
  WITH CHECK (changed_by = (SELECT auth.uid()));

-- DOCUMENTS
DROP POLICY IF EXISTS "Users can view their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can insert their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON public.documents;

CREATE POLICY "Users can view their own documents"
  ON public.documents FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert their own documents"
  ON public.documents FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete their own documents"
  ON public.documents FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));
/*
  # Optimize RLS Policies - Part 3d
  
  Optimizes RLS policies by wrapping auth.uid() calls in SELECT subqueries.
  
  This part covers: ai_chatbot_settings, knowledge_base_documents, field_mappings,
  user_gmail_credentials, email_templates
*/

-- AI_CHATBOT_SETTINGS
DROP POLICY IF EXISTS "Users can read own AI settings" ON public.ai_chatbot_settings;
DROP POLICY IF EXISTS "Users can insert own AI settings" ON public.ai_chatbot_settings;
DROP POLICY IF EXISTS "Users can update own AI settings" ON public.ai_chatbot_settings;
DROP POLICY IF EXISTS "Users can delete own AI settings" ON public.ai_chatbot_settings;

CREATE POLICY "Users can read own AI settings"
  ON public.ai_chatbot_settings FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own AI settings"
  ON public.ai_chatbot_settings FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own AI settings"
  ON public.ai_chatbot_settings FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own AI settings"
  ON public.ai_chatbot_settings FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- KNOWLEDGE_BASE_DOCUMENTS
DROP POLICY IF EXISTS "Authenticated users can create knowledge base documents" ON public.knowledge_base_documents;

CREATE POLICY "Authenticated users can create knowledge base documents"
  ON public.knowledge_base_documents FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = (SELECT auth.uid()));

-- FIELD_MAPPINGS
DROP POLICY IF EXISTS "Users can view own field mappings" ON public.field_mappings;
DROP POLICY IF EXISTS "Users can insert own field mappings" ON public.field_mappings;
DROP POLICY IF EXISTS "Users can update own field mappings" ON public.field_mappings;
DROP POLICY IF EXISTS "Users can delete own field mappings" ON public.field_mappings;

CREATE POLICY "Users can view own field mappings"
  ON public.field_mappings FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own field mappings"
  ON public.field_mappings FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own field mappings"
  ON public.field_mappings FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own field mappings"
  ON public.field_mappings FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- USER_GMAIL_CREDENTIALS
DROP POLICY IF EXISTS "Users can view own Gmail credentials" ON public.user_gmail_credentials;
DROP POLICY IF EXISTS "Users can insert own Gmail credentials" ON public.user_gmail_credentials;
DROP POLICY IF EXISTS "Users can update own Gmail credentials" ON public.user_gmail_credentials;
DROP POLICY IF EXISTS "Users can delete own Gmail credentials" ON public.user_gmail_credentials;

CREATE POLICY "Users can view own Gmail credentials"
  ON public.user_gmail_credentials FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own Gmail credentials"
  ON public.user_gmail_credentials FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own Gmail credentials"
  ON public.user_gmail_credentials FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own Gmail credentials"
  ON public.user_gmail_credentials FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- EMAIL_TEMPLATES
DROP POLICY IF EXISTS "Admin and elite can insert email templates" ON public.email_templates;
DROP POLICY IF EXISTS "Admin and elite can update email templates" ON public.email_templates;
DROP POLICY IF EXISTS "Admin and elite can delete non-system templates" ON public.email_templates;

CREATE POLICY "Admin and elite can insert email templates"
  ON public.email_templates FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'elite')
    )
  );

CREATE POLICY "Admin and elite can update email templates"
  ON public.email_templates FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'elite')
    )
  );

CREATE POLICY "Admin and elite can delete non-system templates"
  ON public.email_templates FOR DELETE TO authenticated
  USING (
    NOT is_system AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'elite')
    )
  );
/*
  # Optimize RLS Policies - Part 3e
  
  Optimizes RLS policies by wrapping auth.uid() calls in SELECT subqueries.
  
  This part covers: user_alert_preferences, user_email_notification_settings,
  user_feedback, tariff_sops, tariff_sop_revisions
*/

-- USER_ALERT_PREFERENCES
DROP POLICY IF EXISTS "Users can view own alert preferences" ON public.user_alert_preferences;
DROP POLICY IF EXISTS "Users can insert own alert preferences" ON public.user_alert_preferences;
DROP POLICY IF EXISTS "Users can update own alert preferences" ON public.user_alert_preferences;
DROP POLICY IF EXISTS "Users can delete own alert preferences" ON public.user_alert_preferences;

CREATE POLICY "Users can view own alert preferences"
  ON public.user_alert_preferences FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own alert preferences"
  ON public.user_alert_preferences FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own alert preferences"
  ON public.user_alert_preferences FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own alert preferences"
  ON public.user_alert_preferences FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- USER_EMAIL_NOTIFICATION_SETTINGS
DROP POLICY IF EXISTS "Users can view own email settings" ON public.user_email_notification_settings;
DROP POLICY IF EXISTS "Admin and elite can modify email settings" ON public.user_email_notification_settings;

CREATE POLICY "Users can view own email settings"
  ON public.user_email_notification_settings FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Admin and elite can modify email settings"
  ON public.user_email_notification_settings FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'elite')
    )
  );

-- USER_FEEDBACK
DROP POLICY IF EXISTS "Users can view own feedback" ON public.user_feedback;
DROP POLICY IF EXISTS "Users can insert own feedback" ON public.user_feedback;
DROP POLICY IF EXISTS "Admins can view all feedback" ON public.user_feedback;
DROP POLICY IF EXISTS "Admins can update all feedback" ON public.user_feedback;

CREATE POLICY "Users can view own feedback"
  ON public.user_feedback FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid()) OR EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  );

CREATE POLICY "Users can insert own feedback"
  ON public.user_feedback FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Admins can update all feedback"
  ON public.user_feedback FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  );

-- TARIFF_SOPS
DROP POLICY IF EXISTS "Users can view their SOPs" ON public.tariff_sops;
DROP POLICY IF EXISTS "Users can create SOPs" ON public.tariff_sops;
DROP POLICY IF EXISTS "Users can update their SOPs" ON public.tariff_sops;
DROP POLICY IF EXISTS "Users can delete their SOPs" ON public.tariff_sops;

CREATE POLICY "Users can view their SOPs"
  ON public.tariff_sops FOR SELECT TO authenticated
  USING (created_by = (SELECT auth.uid()));

CREATE POLICY "Users can create SOPs"
  ON public.tariff_sops FOR INSERT TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY "Users can update their SOPs"
  ON public.tariff_sops FOR UPDATE TO authenticated
  USING (created_by = (SELECT auth.uid()))
  WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY "Users can delete their SOPs"
  ON public.tariff_sops FOR DELETE TO authenticated
  USING (created_by = (SELECT auth.uid()));

-- TARIFF_SOP_REVISIONS
DROP POLICY IF EXISTS "Users can view SOP revisions" ON public.tariff_sop_revisions;

CREATE POLICY "Users can view SOP revisions"
  ON public.tariff_sop_revisions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tariff_sops
      WHERE tariff_sops.id = tariff_sop_revisions.sop_id
      AND tariff_sops.created_by = (SELECT auth.uid())
    )
  );
/*
  # Optimize RLS Policies - Part 3f
  
  Optimizes RLS policies by wrapping auth.uid() calls in SELECT subqueries.
  
  This part covers: tariffs, notifications, user_onboarding_state
*/

-- TARIFFS
DROP POLICY IF EXISTS "Users can view own tariffs" ON public.tariffs;
DROP POLICY IF EXISTS "Users can insert own tariffs" ON public.tariffs;
DROP POLICY IF EXISTS "Users can update own tariffs" ON public.tariffs;
DROP POLICY IF EXISTS "Users can delete own tariffs" ON public.tariffs;

CREATE POLICY "Users can view own tariffs"
  ON public.tariffs FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own tariffs"
  ON public.tariffs FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own tariffs"
  ON public.tariffs FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own tariffs"
  ON public.tariffs FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- NOTIFICATIONS
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;

CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- USER_ONBOARDING_STATE
DROP POLICY IF EXISTS "Users can view own onboarding state" ON public.user_onboarding_state;
DROP POLICY IF EXISTS "Users can insert own onboarding state" ON public.user_onboarding_state;
DROP POLICY IF EXISTS "Users can update own onboarding state" ON public.user_onboarding_state;

CREATE POLICY "Users can view own onboarding state"
  ON public.user_onboarding_state FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own onboarding state"
  ON public.user_onboarding_state FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own onboarding state"
  ON public.user_onboarding_state FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
