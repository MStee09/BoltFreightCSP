/*
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
