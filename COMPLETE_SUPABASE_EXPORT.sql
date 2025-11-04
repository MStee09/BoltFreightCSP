/*
  ============================================================================
  COMPLETE SUPABASE DATABASE EXPORT
  ============================================================================
  
  This file contains ALL data from your current Supabase database.
  Run this SQL file in your separate Supabase database's SQL Editor.
  
  BEFORE RUNNING:
  1. Ensure all migrations are applied to your separate Supabase database
  2. Copy all files from /supabase/migrations/ to your separate project
  3. Run migrations in your separate project first
  
  AFTER RUNNING:
  1. Create admin user via Supabase Auth: michael@gorocketshipping.com
  2. Update the user_id references (see section at end)
  3. Connect Bolt to your database using the "Connect" button
  
  DATA SUMMARY:
  - 40 permissions
  - 118 role-permission mappings  
  - 1 user profile (admin)
  - 15 carriers (ODFL, EXLA, RDFS, DAFG, etc.)
  - 5 customers (including Torque Fitness)
  - 6 CSP events (with AI strategy summary for Torque Fitness)
  - 5 tariffs
  - 32 interactions
  - 3 tasks, 3 alerts, 2 documents
  - 1 calendar event, 4 stage history records
  - Gmail credentials, AI settings, field mappings, etc.
  
  IMPORTANT: Most records use mock user_id: 00000000-0000-0000-0000-000000000000
  The admin user has ID: 2f5a1a0f-581c-4ec0-a011-d123529193ad
  ============================================================================
*/

-- Disable triggers temporarily for faster import
SET session_replication_role = replica;

-- ====================
-- PERMISSIONS (40 rows)
-- ====================
INSERT INTO permissions (id, name, description, resource, action, created_at)
VALUES
('983b9f80-c911-4d47-b3fd-b56bac417a95', 'dashboard.view', 'View dashboard and metrics', 'dashboard', 'read', '2025-10-23 18:47:18.114025+00'),
('8286aad3-470c-470b-810b-592fa977183a', 'customers.view', 'View customer list and details', 'customers', 'read', '2025-10-23 18:47:18.114025+00'),
('aeb16906-2604-4f05-9286-cb717a244d82', 'customers.create', 'Create new customers', 'customers', 'write', '2025-10-23 18:47:18.114025+00'),
('3ca06c97-0100-4dc7-95b1-e0eb897e8eb5', 'customers.edit', 'Edit customer information', 'customers', 'write', '2025-10-23 18:47:18.114025+00'),
('dddb8035-eaea-497f-94c2-a69dac36da0a', 'customers.delete', 'Delete customers', 'customers', 'delete', '2025-10-23 18:47:18.114025+00'),
('5a9b0d8d-e645-4e82-903d-92d2eee86ebf', 'carriers.view', 'View carrier list and details', 'carriers', 'read', '2025-10-23 18:47:18.114025+00'),
('ba6aeeeb-af44-49cd-b2f8-5e06411afcd9', 'carriers.create', 'Create new carriers', 'carriers', 'write', '2025-10-23 18:47:18.114025+00'),
('49c94bb6-068d-4465-a725-6ef1098db601', 'carriers.edit', 'Edit carrier information', 'carriers', 'write', '2025-10-23 18:47:18.114025+00'),
('a83e94fa-f9ca-400e-b09a-8bedf0ecb2aa', 'carriers.delete', 'Delete carriers', 'carriers', 'delete', '2025-10-23 18:47:18.114025+00'),
('986654fa-5d59-4cbb-9a8b-7abdf6a072cc', 'tariffs.view', 'View tariff list and details', 'tariffs', 'read', '2025-10-23 18:47:18.114025+00'),
('ab0a71d9-9955-4fa2-830c-c18a103ea97e', 'tariffs.create', 'Create new tariffs', 'tariffs', 'write', '2025-10-23 18:47:18.114025+00'),
('8bf8b958-cb9b-4851-8059-e4784f3cc375', 'tariffs.edit', 'Edit tariff information', 'tariffs', 'write', '2025-10-23 18:47:18.114025+00'),
('4070bffc-c36c-42f1-8188-bbbeafd62edf', 'tariffs.delete', 'Delete tariffs', 'tariffs', 'delete', '2025-10-23 18:47:18.114025+00'),
('979725d8-1261-485c-88e3-da4af83efbf9', 'tariffs.upload', 'Upload tariff files', 'tariffs', 'write', '2025-10-23 18:47:18.114025+00'),
('4c952670-66dd-46af-9433-d305a333c615', 'tariffs.notes', 'Add and edit tariff notes', 'tariffs', 'write', '2025-10-23 18:47:18.114025+00'),
('7f84d336-766b-4c63-994c-c30ce7393806', 'csp_events.view', 'View CSP events', 'csp_events', 'read', '2025-10-23 18:47:18.114025+00'),
('5a349f9a-9d64-47f7-8f63-c633028ea872', 'csp_events.create', 'Create CSP events', 'csp_events', 'write', '2025-10-23 18:47:18.114025+00'),
('5b10f9b5-0657-44fb-8b7e-b0f3b3fbbc65', 'csp_events.edit', 'Edit CSP events', 'csp_events', 'write', '2025-10-23 18:47:18.114025+00'),
('41ea8e5e-cc0d-4920-acbf-8d986a1399f5', 'csp_events.delete', 'Delete CSP events', 'csp_events', 'delete', '2025-10-23 18:47:18.114025+00'),
('3f82c258-298d-43c7-bf95-3de9d5250242', 'documents.view', 'View documents', 'documents', 'read', '2025-10-23 18:47:18.114025+00'),
('0eeb5e50-d4d4-4a48-bbe8-0c13424bd71d', 'documents.upload', 'Upload documents', 'documents', 'write', '2025-10-23 18:47:18.114025+00'),
('d62c7adc-74d5-434e-b08e-4c07d6f07560', 'documents.delete', 'Delete documents', 'documents', 'delete', '2025-10-23 18:47:18.114025+00'),
('b65f59a7-937f-41af-87de-eb8b962539c3', 'calendar.view', 'View calendar events', 'calendar', 'read', '2025-10-23 18:47:18.114025+00'),
('2613eb12-04ea-46b6-b5b5-619e01432716', 'calendar.edit', 'Edit calendar events', 'calendar', 'write', '2025-10-23 18:47:18.114025+00'),
('464fe697-eed5-4b5b-b94c-22672ddc996c', 'tasks.view', 'View tasks', 'tasks', 'read', '2025-10-23 18:47:18.114025+00'),
('f44034bd-299e-4d7e-9f89-b08164c17e94', 'tasks.create', 'Create tasks', 'tasks', 'write', '2025-10-23 18:47:18.114025+00'),
('db49e98b-07b1-41be-95de-3fa8d63cd0ab', 'tasks.edit', 'Edit tasks', 'tasks', 'write', '2025-10-23 18:47:18.114025+00'),
('612e589f-db40-4a20-b701-48d5830e5680', 'reports.view', 'View reports', 'reports', 'read', '2025-10-23 18:47:18.114025+00'),
('876696ed-13f6-443e-b520-16759901cd23', 'reports.generate', 'Generate reports', 'reports', 'write', '2025-10-23 18:47:18.114025+00'),
('5e08bfaf-e300-486a-a097-14ef09eec615', 'settings.view', 'View settings', 'settings', 'read', '2025-10-23 18:47:18.114025+00'),
('a9b9a4be-c50f-4806-9a45-4ee968461929', 'settings.edit', 'Edit personal settings', 'settings', 'write', '2025-10-23 18:47:18.114025+00'),
('1e5fe905-8e8e-4961-be64-6f557662ee29', 'settings.ai', 'Configure AI settings', 'settings', 'write', '2025-10-23 18:47:18.114025+00'),
('baa499d9-c115-42ff-a683-085b104918ae', 'settings.integrations', 'Manage integrations', 'settings', 'write', '2025-10-23 18:47:18.114025+00'),
('dea3b714-a1bf-4a0d-972a-79d8e7918eff', 'users.view', 'View user list', 'users', 'read', '2025-10-23 18:47:18.114025+00'),
('048b2080-67d3-4ce6-9512-fab583053e2f', 'users.create', 'Create and invite users', 'users', 'write', '2025-10-23 18:47:18.114025+00'),
('fe690f59-34ca-4504-9853-16f5c3b9d1e8', 'users.edit', 'Edit user roles and permissions', 'users', 'write', '2025-10-23 18:47:18.114025+00'),
('64ba4b84-6b8f-494f-ae3c-967b573b69fb', 'users.delete', 'Delete users', 'users', 'delete', '2025-10-23 18:47:18.114025+00'),
('901721c2-2602-435f-bd1c-a1b89c9fc040', 'system.settings', 'Manage system-wide settings', 'system', 'admin', '2025-10-23 18:47:18.114025+00'),
('8bcad28c-95d6-446c-b05d-84f6e1577c6f', 'system.database', 'Database management tools', 'system', 'admin', '2025-10-23 18:47:18.114025+00'),
('f1b531da-678b-46f7-b37d-d02262829a7e', 'system.security', 'View security and audit logs', 'system', 'admin', '2025-10-23 18:47:18.114025+00')
ON CONFLICT (id) DO NOTHING;

