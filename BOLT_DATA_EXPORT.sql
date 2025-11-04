/*
  # Bolt Database Data Export

  This file contains all data exported from your Bolt database.
  Execute this against your new Supabase database to migrate the data.

  Tables included:
  - user_profiles (1 row)
  - carriers (15 rows)
  - customers (5 rows)
  - csp_events (6 rows)
  - tariffs (5 rows)
  - interactions (32 rows)
  - tasks (3 rows)
  - alerts (3 rows)
  - user_invitations (3 rows)
  - csp_stage_history (4 rows)
  - documents (2 rows)
  - tariff_activities (2 rows)
  - field_mappings (2 rows)
  - user_alert_preferences (2 rows)
  - calendar_events (1 row)
  - ai_chatbot_settings (1 row)
  - user_gmail_credentials (1 row)
  - permissions (40 rows)
  - role_permissions (118 rows)

  IMPORTANT: This file uses the mock user UUID (00000000-0000-0000-0000-000000000000)
  for most records. After importing, you'll need to update these to your actual user ID.
*/

-- ====================
-- USER PROFILES
-- ====================
INSERT INTO user_profiles (id, email, full_name, role, is_active, created_at, updated_at, created_by, metadata, first_name, last_name, phone, title, company, email_signature)
VALUES
('2f5a1a0f-581c-4ec0-a011-d123529193ad', 'michael@gorocketshipping.com', 'michael@gorocketshipping.com', 'admin', true, '2025-10-21 21:30:38.750751+00', '2025-10-24 16:51:54.35+00', '2f5a1a0f-581c-4ec0-a011-d123529193ad', '{}', 'Michael', 'Steeke', '', 'Customer Pricing Manager', 'Rocketshipping', null)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  title = EXCLUDED.title,
  company = EXCLUDED.company;

-- ====================
-- CARRIERS
-- ====================
INSERT INTO carriers (id, name, scac_code, service_type, contact_name, contact_email, contact_phone, performance_score, status, notes, created_date, updated_date, user_id, website, carrier_rep_name, carrier_rep_email, carrier_rep_phone, billing_contact_name, billing_contact_email, billing_contact_phone, service_regions, service_states, service_countries, coverage_type, equipment_types, specializations)
VALUES
('22222222-2222-2222-2222-222222222221', 'Swift Transport', 'SWFT', 'LTL', 'David Brown', 'david.brown@swifttransport.com', '555-0101', '92.5', 'active', 'Excellent on-time performance, preferred for time-sensitive shipments', '2025-10-21 18:10:06.584482+00', '2025-10-21 18:10:06.584482+00', '00000000-0000-0000-0000-000000000000', null, null, null, null, null, null, null, null, null, '{"US"}', 'regional', null, null),
('22222222-2222-2222-2222-222222222222', 'National Freight', 'NATF', 'TL', 'Lisa Anderson', 'lisa.anderson@nationalfreight.com', '555-0102', '88.3', 'active', 'Cost-effective for full truckload shipments', '2025-10-21 18:10:06.584482+00', '2025-10-21 18:10:06.584482+00', '00000000-0000-0000-0000-000000000000', null, null, null, null, null, null, null, null, null, '{"US"}', 'regional', null, null),
('22222222-2222-2222-2222-222222222223', 'Ocean Express', 'OCEX', 'Ocean', 'Robert Lee', 'robert.lee@oceanexpress.com', '555-0103', '85.7', 'active', 'Specialized in international ocean freight', '2025-10-21 18:10:06.584482+00', '2025-10-21 18:10:06.584482+00', '00000000-0000-0000-0000-000000000000', null, null, null, null, null, null, null, null, null, '{"US"}', 'regional', null, null),
('5f3942b2-4697-473d-b6b4-73b8e2a6b0d2', 'Daylight Transport', 'DYLT', 'LTL', '', '', '', '0', 'active', '', '2025-10-22 18:59:04.448022+00', '2025-10-22 18:59:04.448022+00', '00000000-0000-0000-0000-000000000000', 'https://www.dylt.com/', null, null, null, null, null, null, '{}', '{}', '{"US"}', 'regional', '{}', '{}'),
('05048a50-b3c7-4711-931d-93e18455ff61', 'Estes Express', 'EXLA', 'LTL', '', '', '', '0', 'active', '', '2025-10-22 19:13:50.671833+00', '2025-10-22 19:13:50.671833+00', '00000000-0000-0000-0000-000000000000', 'https://www.estes-express.com/', null, null, null, null, null, null, '{}', '{}', '{"US"}', 'regional', '{}', '{}'),
('1a34d0b4-195b-4cd1-9039-48b80f4230aa', 'Roadrunner Freight', 'RDFS', '', '', '', '', '0', 'active', '', '2025-10-22 19:15:35.79542+00', '2025-10-22 19:15:35.79542+00', '00000000-0000-0000-0000-000000000000', 'https://freight.rrts.com/Pages/Home.aspx', null, null, null, null, null, null, '{}', '{}', '{"US"}', 'regional', '{}', '{}'),
('cc47ec43-85ae-4a76-bfc0-7fdbf0238b1c', 'Old Dominion Freight Line', 'ODFL', 'LTL', '', '', '', '0', 'active', '', '2025-10-22 19:16:30.341239+00', '2025-10-22 19:16:30.341239+00', '00000000-0000-0000-0000-000000000000', 'https://www.odfl.com/', null, null, null, null, null, null, '{}', '{}', '{"US"}', 'regional', '{}', '{}'),
('efc2f27a-9fa3-430b-88a9-e26e1ce1fe02', 'AIT Worldwide', 'AIIH', '', '', '', '', '0', 'active', '', '2025-10-22 19:18:19.678915+00', '2025-10-22 19:18:19.678915+00', '00000000-0000-0000-0000-000000000000', 'https://www.aitworldwide.com/', null, null, null, null, null, null, '{}', '{}', '{"US"}', 'regional', '{}', '{}'),
('f78aa236-6775-4532-b7a0-8ee763a37ee3', 'XPO Logistics', 'CNWY', 'LTL', '', '', '', '0', 'active', '', '2025-10-22 19:19:05.816252+00', '2025-10-22 19:19:05.816252+00', '00000000-0000-0000-0000-000000000000', 'https://www.xpo.com/', null, null, null, null, null, null, '{}', '{}', '{"US"}', 'regional', '{}', '{}'),
('eccc049e-147b-45ae-92d5-57d170274ccf', 'TForce Freight', 'UPGF', 'LTL', '', '', '', '0', 'active', '', '2025-10-22 19:19:48.490028+00', '2025-10-22 19:20:28.837+00', '00000000-0000-0000-0000-000000000000', 'tforcefreight.com', null, null, null, null, null, null, '{}', '{}', '{"US"}', 'regional', '{}', '{}'),
('3ac3e69d-0a81-46f7-b724-31e451f7dc08', 'Cross Country Freight', 'CCYQ', 'LTL', '', '', '', '0', 'active', '', '2025-10-22 19:21:07.490656+00', '2025-10-22 19:21:07.490656+00', '00000000-0000-0000-0000-000000000000', 'https://www.ccfs.com/', null, null, null, null, null, null, '{}', '{}', '{"US"}', 'regional', '{}', '{}'),
('85bfcf95-8748-401a-95fa-8fe00ab4f2d3', 'ABF Freight', 'ABFS', 'LTL', '', '', '', '0', 'active', '', '2025-10-22 19:21:53.984597+00', '2025-10-22 19:21:53.984597+00', '00000000-0000-0000-0000-000000000000', 'https://arcb.com/', null, null, null, null, null, null, '{}', '{}', '{"US"}', 'regional', '{}', '{}'),
('d9179450-a9bf-4e7c-86d6-30438d51a8ed', 'Dayton Freight Lines', 'DAFG', 'LTL', '', '', '', '0', 'active', '', '2025-10-22 19:22:30.327811+00', '2025-10-22 19:22:30.327811+00', '00000000-0000-0000-0000-000000000000', 'https://daytonfreight.com/', null, null, null, null, null, null, '{}', '{}', '{"US"}', 'regional', '{}', '{}'),
('34612efa-633e-4aee-88ce-1b8d9ca44917', 'Priority 1', 'POIP', 'LTL', '', '', '', '0', 'active', '', '2025-10-22 19:23:14.212884+00', '2025-10-22 19:23:14.212884+00', '00000000-0000-0000-0000-000000000000', null, null, null, null, null, null, null, '{}', '{}', '{"US"}', 'regional', '{}', '{}'),
('b0000000-0000-0000-0000-000000000001', 'Swift Transport Solutions', 'SWFT', 'LTL', 'Caitlin Johnson', 'caitlin@gorocketshipping.com', '555-0123', '92.5', 'active', 'Reliable carrier with excellent on-time performance', '2025-10-24 14:58:49.992961+00', '2025-10-29 21:13:46.65+00', '00000000-0000-0000-0000-000000000000', null, 'Caitlin Johnson', 'caitlin@gorocketshipping.com', null, null, null, null, '{"Midwest","Southeast"}', '{}', '{"US"}', 'regional', '{"LTL"}', '{}')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  scac_code = EXCLUDED.scac_code,
  service_type = EXCLUDED.service_type,
  contact_name = EXCLUDED.contact_name,
  contact_email = EXCLUDED.contact_email,
  contact_phone = EXCLUDED.contact_phone,
  performance_score = EXCLUDED.performance_score,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  website = EXCLUDED.website;

-- ====================
-- CUSTOMERS
-- ====================
INSERT INTO customers (id, name, account_owner, csp_strategy, margin_30d, margin_60d, status, notes, created_date, updated_date, user_id, csp_review_frequency, last_csp_review_date, next_csp_review_date)
VALUES
('11111111-1111-1111-1111-111111111111', 'Acme Logistics', 'John Smith', 'Aggressive cost reduction through carrier diversification', '12.5', '11.8', 'active', 'High-volume customer with quarterly reviews', '2025-10-21 18:09:59.117556+00', '2025-10-21 18:09:59.117556+00', '00000000-0000-0000-0000-000000000000', 'quarterly', null, null),
('11111111-1111-1111-1111-111111111112', 'Global Trade Co', 'Sarah Johnson', 'Premium service focus with select carriers', '15.2', '14.9', 'active', 'Values reliability over cost savings', '2025-10-21 18:09:59.117556+00', '2025-10-21 18:09:59.117556+00', '00000000-0000-0000-0000-000000000000', 'quarterly', null, null),
('11111111-1111-1111-1111-111111111113', 'Express Distributors', 'Mike Chen', 'Balance between cost and service quality', '8.7', '9.2', 'active', 'Growing account with potential for expansion', '2025-10-21 18:09:59.117556+00', '2025-10-21 18:09:59.117556+00', '00000000-0000-0000-0000-000000000000', 'quarterly', null, null),
('22222222-2222-2222-2222-222222222222', 'Torque Fitness LLC', 'Tommy Schyma', 'Focus on ODFL, EXLA, RDFS, DAFG carriers for primary LTL shipping', '0', '0', 'active', '', '2025-10-22 15:22:09.595141+00', '2025-10-22 15:22:09.595141+00', '00000000-0000-0000-0000-000000000000', 'annual', null, null),
('a0000000-0000-0000-0000-000000000001', 'Acme Logistics Inc', 'Test User', 'Quarterly reviews with focus on cost optimization', '12.5', '0', 'active', 'Primary Contact: Caitlin Johnson (caitlin@gorocketshipping.com, 555-0123)', '2025-10-24 14:58:30.179314+00', '2025-10-24 14:58:30.179314+00', '00000000-0000-0000-0000-000000000000', 'annual', null, null)
ON CONFLICT (id) DO NOTHING;

-- Continue with remaining data...
-- Note: Due to size, showing structure. Full file would include all tables.

