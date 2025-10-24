import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { GmailSetupSimple } from '@/components/email/GmailSetupSimple';
import { UserManagement } from '@/components/admin/UserManagement';
import { SystemSettings } from '@/components/admin/SystemSettings';
import { DatabaseManagement } from '@/components/admin/DatabaseManagement';
import { SecurityAudit } from '@/components/admin/SecurityAudit';
import { RoleDescriptions } from '@/components/admin/RoleDescriptions';
import { AISettings } from '@/components/settings/AISettings';
import { EmailTemplatesManagement } from '@/components/settings/EmailTemplatesManagement';
import { AlertSettings } from '@/components/settings/AlertSettings';
import { UserProfile } from '@/components/settings/UserProfile';
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
    description: 'Advanced access to all business features except deep system administration',
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    features: [
      'Full customer and carrier management',
      'Complete tariff and CSP operations',
      'Document management',
      'User invitation and management',
      'Advanced reporting and analytics',
      'AI and integration configuration'
    ]
  },
  tariff_master: {
    label: 'Tariff Master',
    description: 'Specialized role with complete control over tariff management',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    features: [
      'View all customers and carriers',
      'Full tariff CRUD operations',
      'Upload and manage tariff files',
      'Add and edit tariff notes',
      'Document uploads',
      'Calendar and task management',
      'Generate reports'
    ]
  },
  basic: {
    label: 'Basic User',
    description: 'Standard CRM access with ability to create and edit records',
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    features: [
      'Create and edit customers',
      'Create and edit carriers',
      'Manage assigned CSP events',
      'Upload documents',
      'Send emails',
      'View reports',
      'Calendar management'
    ]
  },
  viewer: {
    label: 'Viewer',
    description: 'Read-only access to all system information',
    color: 'bg-slate-100 text-slate-700 border-slate-200',
    features: [
      'View dashboard and metrics',
      'View customers and carriers (read-only)',
      'View tariffs (read-only)',
      'View CSP events and pipeline',
      'View documents',
      'View calendar and tasks',
      'View reports',
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

      <Tabs defaultValue="profile" className="w-full">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="ai">AI Assistant</TabsTrigger>
          <TabsTrigger value="knowledge">Knowledge Base</TabsTrigger>
          {(isAdmin || isElite) && <TabsTrigger value="email-templates">Email Templates</TabsTrigger>}
          {(isAdmin || isElite) && <TabsTrigger value="notifications">Notifications</TabsTrigger>}
          <TabsTrigger value="account">Account</TabsTrigger>
          {(isAdmin || isElite) && <TabsTrigger value="users">Users</TabsTrigger>}
          {isAdmin && <TabsTrigger value="admin">Admin</TabsTrigger>}
        </TabsList>

        <TabsContent value="profile" className="space-y-4 mt-6">
          <div className="max-w-2xl">
            <UserProfile />
          </div>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4 mt-6">
          <div className="max-w-2xl">
            <GmailSetupSimple />
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

        <TabsContent value="email-templates" className="space-y-4 mt-6">
          <div className="max-w-6xl">
            <EmailTemplatesManagement />
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4 mt-6">
          <div className="max-w-6xl">
            <AlertSettings />
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
