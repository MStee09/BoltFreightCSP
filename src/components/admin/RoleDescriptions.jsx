import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Star, FileText, Eye, User } from 'lucide-react';

const roles = [
  {
    name: 'Administrator',
    value: 'admin',
    icon: Shield,
    color: 'bg-red-500',
    description: 'Full system access with complete control over all features and data.',
    permissions: [
      'Manage users and invitations',
      'Access all CRM features',
      'View and edit all records',
      'Configure system settings',
      'Manage roles and permissions',
      'Access security audit logs',
      'Database management',
    ],
  },
  {
    name: 'Elite User',
    value: 'elite',
    icon: Star,
    color: 'bg-purple-500',
    description: 'Advanced access to all business features except deep system administration.',
    permissions: [
      'Full customer and carrier management',
      'Complete tariff and CSP operations',
      'Document management',
      'User invitation and management',
      'Advanced reporting and analytics',
      'AI and integration configuration',
    ],
  },
  {
    name: 'Tariff Master',
    value: 'tariff_master',
    icon: FileText,
    color: 'bg-blue-500',
    description: 'Specialized role with complete control over tariff management.',
    permissions: [
      'View all customers and carriers',
      'Full tariff CRUD operations',
      'Upload and manage tariff files',
      'Add and edit tariff notes',
      'Document uploads',
      'Calendar and task management',
      'Generate reports',
    ],
  },
  {
    name: 'Basic User',
    value: 'basic',
    icon: User,
    color: 'bg-gray-500',
    description: 'Standard CRM access with ability to create and edit records.',
    permissions: [
      'Create and edit customers',
      'Create and edit carriers',
      'Manage assigned CSP events',
      'Upload documents',
      'Send emails',
      'View reports',
      'Calendar management',
    ],
  },
  {
    name: 'Viewer',
    value: 'viewer',
    icon: Eye,
    color: 'bg-slate-500',
    description: 'Read-only access to all system information.',
    permissions: [
      'View dashboard and metrics',
      'View customers and carriers (read-only)',
      'View tariffs (read-only)',
      'View CSP events and pipeline',
      'View documents',
      'View calendar and tasks',
      'View reports',
      'No edit or delete permissions',
    ],
  },
];

export function RoleDescriptions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>User Roles & Permissions</CardTitle>
        <CardDescription>
          Understanding access levels and what each role can do in the system
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <div
                key={role.value}
                className="border rounded-lg p-4 space-y-3 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`${role.color} p-2 rounded-lg`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-base">{role.name}</h4>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {role.description}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {role.value}
                  </Badge>
                </div>

                <div className="pl-12">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Key Permissions:
                  </p>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                    {role.permissions.map((permission, index) => (
                      <li
                        key={index}
                        className="text-sm flex items-center gap-2 text-muted-foreground"
                      >
                        <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                        {permission}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Note:</strong> Administrators can modify user
            roles at any time. Changes take effect immediately after the user refreshes their
            session. Contact your system administrator if you need additional permissions.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
