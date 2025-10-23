import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { GmailSetup } from '@/components/email/GmailSetup';
import { UserManagement } from '@/components/admin/UserManagement';
import { SystemSettings } from '@/components/admin/SystemSettings';
import { DatabaseManagement } from '@/components/admin/DatabaseManagement';
import { SecurityAudit } from '@/components/admin/SecurityAudit';
import { RoleDescriptions } from '@/components/admin/RoleDescriptions';
import { AISettings } from '@/components/settings/AISettings';
import KnowledgeBaseSettings from '@/components/settings/KnowledgeBase';
import { useUserRole } from '@/hooks/useUserRole';
import { Settings as SettingsIcon, Shield, AlertCircle } from 'lucide-react';

const ROLE_DESCRIPTIONS = {
  admin: {
    label: 'Administrator',
    description: 'Full system access including user management, system settings, and database administration',
    color: 'bg-red-100 text-red-700 border-red-200',
    features: [
      'All system permissions',
      'User management and role assignment',
      'System-wide settings configuration',
      'Database management and backups',
      'Security audit logs access'
    ]
  },
  elite: {
    label: 'Elite User',
    description: 'Advanced access with CSP management and comprehensive reporting capabilities',
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    features: [
      'Full CSP event management',
      'Advanced reporting and analytics',
      'Tariff management',
      'Customer and carrier management',
      'Email integration',
      'Document management'
    ]
  },
  tariff_master: {
    label: 'Tariff Master',
    description: 'Specialized role focused on tariff management, uploads, and pricing',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    features: [
      'Upload and manage tariffs',
      'Edit tariff details',
      'View all tariffs',
      'Access tariff reports',
      'Manage pricing data',
      'Document upload'
    ]
  },
  editor: {
    label: 'Editor',
    description: 'Can create and edit records with standard CRM access',
    color: 'bg-green-100 text-green-700 border-green-200',
    features: [
      'Create and edit customers',
      'Create and edit carriers',
      'Manage assigned CSP events',
      'Upload documents',
      'Send emails',
      'View reports'
    ]
  },
  basic: {
    label: 'Basic User',
    description: 'Standard user with access to view and manage assigned records',
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    features: [
      'View assigned customers',
      'View assigned carriers',
      'View assigned CSP events',
      'Basic reporting',
      'Email communication',
      'Document viewing'
    ]
  },
  viewer: {
    label: 'Viewer',
    description: 'Read-only access to view records and reports',
    color: 'bg-slate-100 text-slate-700 border-slate-200',
    features: [
      'View customers',
      'View carriers',
      'View CSP events',
      'View reports',
      'View documents',
      'No edit or delete permissions'
    ]
  }
};

export default function Settings() {
  const { isAdmin, isElite, role, loading, userProfile } = useUserRole();

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex items-center gap-3">
          <SettingsIcon className="h-8 w-8 text-slate-700 animate-pulse" />
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
            <p className="text-slate-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SettingsIcon className="h-8 w-8 text-slate-700" />
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
            <p className="text-slate-600">Manage your account and integrations</p>
          </div>
        </div>
        {role && ROLE_DESCRIPTIONS[role] && (
          <Badge variant="default" className={`gap-1 ${ROLE_DESCRIPTIONS[role].color} border`}>
            <Shield className="h-3 w-3" />
            {ROLE_DESCRIPTIONS[role].label}
          </Badge>
        )}
      </div>

      <Tabs defaultValue="integrations" className="w-full">
        <TabsList>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="ai">AI Assistant</TabsTrigger>
          <TabsTrigger value="knowledge">Knowledge Base</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
          {(isAdmin || isElite) && <TabsTrigger value="users">Users</TabsTrigger>}
          {isAdmin && <TabsTrigger value="admin">Admin</TabsTrigger>}
        </TabsList>

        <TabsContent value="integrations" className="space-y-4 mt-6">
          <div className="max-w-2xl">
            <GmailSetup />
          </div>
        </TabsContent>

        <TabsContent value="ai" className="space-y-4 mt-6">
          <div className="max-w-4xl">
            <AISettings />
          </div>
        </TabsContent>

        <TabsContent value="knowledge" className="space-y-4 mt-6">
          <div className="max-w-6xl">
            <KnowledgeBaseSettings />
          </div>
        </TabsContent>

        <TabsContent value="account" className="space-y-4 mt-6">
          <div className="max-w-2xl space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Your account details and role
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <p className="text-sm">{userProfile?.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                    <p className="text-sm">{userProfile?.full_name || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Role</p>
                    {role && ROLE_DESCRIPTIONS[role] && (
                      <Badge className={`mt-1 ${ROLE_DESCRIPTIONS[role].color} border`}>
                        {ROLE_DESCRIPTIONS[role].label}
                      </Badge>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                    <Badge variant={userProfile?.is_active ? 'default' : 'secondary'} className="mt-1">
                      {userProfile?.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {role && ROLE_DESCRIPTIONS[role] && (
              <Card>
                <CardHeader>
                  <CardTitle>Your Access Level</CardTitle>
                  <CardDescription>
                    {ROLE_DESCRIPTIONS[role].description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-900">Permissions:</p>
                    <ul className="space-y-1">
                      {ROLE_DESCRIPTIONS[role].features.map((feature, index) => (
                        <li key={index} className="text-sm text-slate-600 flex items-start gap-2">
                          <span className="text-green-600 mt-0.5">✓</span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Preferences</CardTitle>
                <CardDescription>
                  Customize your experience
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Additional preferences coming soon...
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {(isAdmin || isElite) && (
          <TabsContent value="users" className="space-y-4 mt-6">
            <UserManagement />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="admin" className="space-y-4 mt-6">
            <div className="max-w-6xl space-y-4">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  You have administrator privileges. Use these settings carefully as they affect the entire system.
                </AlertDescription>
              </Alert>

              <RoleDescriptions />

              <SystemSettings />

              <DatabaseManagement />

              <SecurityAudit />
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
