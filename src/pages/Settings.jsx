import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { GmailSetup } from '@/components/email/GmailSetup';
import { UserManagement } from '@/components/admin/UserManagement';
import { AISettings } from '@/components/settings/AISettings';
import KnowledgeBaseSettings from '@/components/settings/KnowledgeBase';
import { useUserRole } from '@/hooks/useUserRole';
import { Settings as SettingsIcon, Shield, AlertCircle } from 'lucide-react';

export default function Settings() {
  const { isAdmin, loading, userProfile } = useUserRole();

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
        {isAdmin && (
          <Badge variant="default" className="gap-1">
            <Shield className="h-3 w-3" />
            Administrator
          </Badge>
        )}
      </div>

      <Tabs defaultValue="integrations" className="w-full">
        <TabsList>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="ai">AI Assistant</TabsTrigger>
          <TabsTrigger value="knowledge">Knowledge Base</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
          {isAdmin && <TabsTrigger value="users">Users</TabsTrigger>}
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
                    <Badge variant={isAdmin ? 'default' : 'secondary'} className="mt-1">
                      {userProfile?.role}
                    </Badge>
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

        {isAdmin && (
          <TabsContent value="users" className="space-y-4 mt-6">
            <UserManagement />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="admin" className="space-y-4 mt-6">
            <div className="max-w-4xl space-y-4">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  You have administrator privileges. Use these settings carefully as they affect the entire system.
                </AlertDescription>
              </Alert>

              <Card>
                <CardHeader>
                  <CardTitle>System Settings</CardTitle>
                  <CardDescription>
                    Configure system-wide preferences
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Additional admin settings coming soon...
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Database Management</CardTitle>
                  <CardDescription>
                    Monitor and manage database resources
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Database tools coming soon...
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Security & Audit</CardTitle>
                  <CardDescription>
                    View security logs and audit trails
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Audit logs coming soon...
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
