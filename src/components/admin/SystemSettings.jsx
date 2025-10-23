import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Separator } from '../ui/separator';
import { useToast } from '../ui/use-toast';
import { Save, RefreshCw } from 'lucide-react';

export const SystemSettings = () => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState({
    companyName: 'Your Company',
    defaultCurrency: 'USD',
    dateFormat: 'MM/DD/YYYY',
    timezone: 'America/New_York',
    enableNotifications: true,
    enableAutoBackup: true,
    sessionTimeout: 30,
    maxUploadSize: 50,
  });

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));

    toast({
      title: 'Settings Saved',
      description: 'System settings have been updated successfully.',
    });

    setIsSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Settings</CardTitle>
        <CardDescription>
          Configure system-wide preferences and defaults
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={settings.companyName}
                onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Default Currency</Label>
              <Input
                id="currency"
                value={settings.defaultCurrency}
                onChange={(e) => setSettings({ ...settings, defaultCurrency: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateFormat">Date Format</Label>
              <Input
                id="dateFormat"
                value={settings.dateFormat}
                onChange={(e) => setSettings({ ...settings, dateFormat: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Input
                id="timezone"
                value={settings.timezone}
                onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
              <Input
                id="sessionTimeout"
                type="number"
                value={settings.sessionTimeout}
                onChange={(e) => setSettings({ ...settings, sessionTimeout: parseInt(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxUploadSize">Max Upload Size (MB)</Label>
              <Input
                id="maxUploadSize"
                type="number"
                value={settings.maxUploadSize}
                onChange={(e) => setSettings({ ...settings, maxUploadSize: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="font-medium">System Features</h4>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notifications">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Send email notifications for important events
                </p>
              </div>
              <Switch
                id="notifications"
                checked={settings.enableNotifications}
                onCheckedChange={(checked) => setSettings({ ...settings, enableNotifications: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="autoBackup">Automatic Backups</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically backup database daily at 2 AM
                </p>
              </div>
              <Switch
                id="autoBackup"
                checked={settings.enableAutoBackup}
                onCheckedChange={(checked) => setSettings({ ...settings, enableAutoBackup: checked })}
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Settings
              </>
            )}
          </Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
