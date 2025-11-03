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
