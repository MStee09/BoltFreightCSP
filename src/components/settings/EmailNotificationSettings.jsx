import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Bell, Clock, Calendar, Shield, Info } from 'lucide-react';
import { toast } from 'sonner';
import { IfHasRole } from '@/components/auth/PermissionGuard';

export function EmailNotificationSettings() {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState({
    awaiting_reply_days: 3,
    critical_reply_days: 7,
    auto_alert_enabled: true,
    alert_frequency: 'daily',
    include_weekends: true,
    quiet_hours_start: null,
    quiet_hours_end: null,
    alert_channels: ['in_app'],
  });

  const { data: userSettings, isLoading } = useQuery({
    queryKey: ['email-notification-settings'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('user_email_notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      return data || {
        awaiting_reply_days: 3,
        critical_reply_days: 7,
        auto_alert_enabled: true,
        alert_frequency: 'daily',
        include_weekends: true,
        quiet_hours_start: null,
        quiet_hours_end: null,
        alert_channels: ['in_app'],
      };
    },
  });

  useEffect(() => {
    if (userSettings) {
      setSettings({
        ...userSettings,
        alert_channels: Array.isArray(userSettings.alert_channels)
          ? userSettings.alert_channels
          : ['in_app'],
      });
    }
  }, [userSettings]);

  const saveMutation = useMutation({
    mutationFn: async (newSettings) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_email_notification_settings')
        .upsert({
          user_id: user.id,
          ...newSettings,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-notification-settings'] });
      toast.success('Email notification settings saved');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to save settings');
    },
  });

  const handleSave = () => {
    saveMutation.mutate(settings);
  };

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Email Notification Settings</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <IfHasRole roles={['admin', 'elite']}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Email Notification Settings
              </CardTitle>
              <CardDescription>
                Customize how and when you receive email response alerts
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-xs">
              <Shield className="w-3 h-3 mr-1" />
              Admin/Elite Only
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Auto Alerts Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-alert">Enable Auto Alerts</Label>
              <p className="text-sm text-slate-500">
                Automatically track emails awaiting replies
              </p>
            </div>
            <Switch
              id="auto-alert"
              checked={settings.auto_alert_enabled}
              onCheckedChange={(checked) => handleChange('auto_alert_enabled', checked)}
            />
          </div>

          <Separator />

          {/* Reply Timing */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              <h3 className="font-semibold">Reply Timing</h3>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="awaiting-reply-days">
                  Awaiting Reply After (days)
                </Label>
                <Input
                  id="awaiting-reply-days"
                  type="number"
                  min="1"
                  max="30"
                  value={settings.awaiting_reply_days}
                  onChange={(e) => handleChange('awaiting_reply_days', parseInt(e.target.value))}
                  disabled={!settings.auto_alert_enabled}
                />
                <p className="text-xs text-slate-500">
                  Show "Awaiting Reply" badge after this many days
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="critical-reply-days">
                  Critical Alert After (days)
                </Label>
                <Input
                  id="critical-reply-days"
                  type="number"
                  min="1"
                  max="60"
                  value={settings.critical_reply_days}
                  onChange={(e) => handleChange('critical_reply_days', parseInt(e.target.value))}
                  disabled={!settings.auto_alert_enabled}
                />
                <p className="text-xs text-slate-500">
                  Escalate to critical priority after this many days
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Business Days */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-500" />
              <h3 className="font-semibold">Business Days</h3>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="include-weekends">Include Weekends</Label>
                <p className="text-sm text-slate-500">
                  Count Saturdays and Sundays in day calculations
                </p>
              </div>
              <Switch
                id="include-weekends"
                checked={settings.include_weekends}
                onCheckedChange={(checked) => handleChange('include_weekends', checked)}
                disabled={!settings.auto_alert_enabled}
              />
            </div>

            {!settings.include_weekends && (
              <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-blue-900">
                  Only business days (Mon-Fri) will be counted. An email sent Friday will show
                  "Awaiting Reply" on the following Thursday if set to 3 days.
                </p>
              </div>
            )}
          </div>

          <Separator />

          {/* Alert Frequency */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-slate-500" />
              <h3 className="font-semibold">Alert Frequency</h3>
            </div>

            <div className="space-y-2">
              <Label htmlFor="alert-frequency">Check for Alerts</Label>
              <Select
                value={settings.alert_frequency}
                onValueChange={(value) => handleChange('alert_frequency', value)}
                disabled={!settings.auto_alert_enabled}
              >
                <SelectTrigger id="alert-frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Every Hour</SelectItem>
                  <SelectItem value="daily">Daily (9 AM)</SelectItem>
                  <SelectItem value="weekly">Weekly (Monday 9 AM)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                How often to scan emails and generate alerts
              </p>
            </div>
          </div>

          <Separator />

          {/* Quiet Hours */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              <h3 className="font-semibold">Quiet Hours (Optional)</h3>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="quiet-start">Start Time</Label>
                <Input
                  id="quiet-start"
                  type="time"
                  value={settings.quiet_hours_start || ''}
                  onChange={(e) => handleChange('quiet_hours_start', e.target.value || null)}
                  disabled={!settings.auto_alert_enabled}
                />
                <p className="text-xs text-slate-500">
                  E.g., 18:00 (6 PM)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quiet-end">End Time</Label>
                <Input
                  id="quiet-end"
                  type="time"
                  value={settings.quiet_hours_end || ''}
                  onChange={(e) => handleChange('quiet_hours_end', e.target.value || null)}
                  disabled={!settings.auto_alert_enabled}
                />
                <p className="text-xs text-slate-500">
                  E.g., 08:00 (8 AM)
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-500">
              No alerts will be generated during quiet hours. Leave blank to receive alerts 24/7.
            </p>
          </div>

          <Separator />

          {/* Save Button */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setSettings(userSettings)}
              disabled={saveMutation.isPending}
            >
              Reset
            </Button>
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </IfHasRole>
  );
}
