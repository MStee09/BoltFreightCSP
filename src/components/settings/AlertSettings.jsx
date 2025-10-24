import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Bell, Clock, Calendar, Mail, TrendingUp, FileText, CheckCircle, AlertTriangle, Activity } from 'lucide-react';
import { toast } from 'sonner';

const ALERT_CATEGORIES = [
  {
    category: 'Email Tracking',
    icon: Mail,
    alerts: [
      {
        type: 'email_awaiting_reply',
        name: 'Email Awaiting Reply',
        description: 'Alert when an email hasn\'t received a reply',
        defaultDays: 3,
        useDays: true,
        useHours: false
      },
      {
        type: 'email_critical_reply',
        name: 'Email Critical Reply',
        description: 'Escalate when email is overdue for reply',
        defaultDays: 7,
        useDays: true,
        useHours: false
      }
    ]
  },
  {
    category: 'CSP Events & Pipeline',
    icon: TrendingUp,
    alerts: [
      {
        type: 'csp_stage_stuck',
        name: 'CSP Event Stuck in Stage',
        description: 'Alert when CSP event hasn\'t progressed to next stage',
        defaultDays: 5,
        useDays: true,
        useHours: false
      },
      {
        type: 'idle_negotiation',
        name: 'Idle Negotiation',
        description: 'Alert when negotiation has no recent activity',
        defaultDays: 7,
        useDays: true,
        useHours: false
      }
    ]
  },
  {
    category: 'Tariffs & Contracts',
    icon: FileText,
    alerts: [
      {
        type: 'tariff_expiring',
        name: 'Tariff Expiring Soon',
        description: 'Alert before tariff expiration date',
        defaultDays: 30,
        useDays: true,
        useHours: false
      },
      {
        type: 'tariff_expired',
        name: 'Tariff Expired',
        description: 'Alert when tariff has expired',
        defaultDays: 0,
        useDays: true,
        useHours: false
      },
      {
        type: 'contract_renewal',
        name: 'Contract Renewal',
        description: 'Alert before contract renewal date',
        defaultDays: 60,
        useDays: true,
        useHours: false
      }
    ]
  },
  {
    category: 'Calendar & Reminders',
    icon: Calendar,
    alerts: [
      {
        type: 'calendar_reminder',
        name: 'Calendar Event Reminder',
        description: 'Remind before upcoming calendar events',
        defaultDays: 1,
        defaultHours: 24,
        useDays: true,
        useHours: true
      },
      {
        type: 'follow_up_reminder',
        name: 'Follow-up Reminder',
        description: 'General follow-up task reminders',
        defaultDays: 3,
        useDays: true,
        useHours: false
      }
    ]
  },
  {
    category: 'Documents & Reports',
    icon: CheckCircle,
    alerts: [
      {
        type: 'document_update_needed',
        name: 'Document Update Needed',
        description: 'Alert when documents need review or update',
        defaultDays: 14,
        useDays: true,
        useHours: false
      }
    ]
  }
];

export function AlertSettings() {
  const queryClient = useQueryClient();
  const [preferences, setPreferences] = useState({});

  const { data: alertPreferences, isLoading } = useQuery({
    queryKey: ['alert-preferences'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('user_alert_preferences')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      const prefsMap = {};
      data?.forEach(pref => {
        prefsMap[pref.alert_type] = pref;
      });

      return prefsMap;
    },
  });

  useEffect(() => {
    if (alertPreferences) {
      setPreferences(alertPreferences);
    }
  }, [alertPreferences]);

  const saveMutation = useMutation({
    mutationFn: async (updates) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const upsertData = Object.entries(updates).map(([alertType, settings]) => ({
        user_id: user.id,
        alert_type: alertType,
        enabled: settings.enabled,
        threshold_days: settings.threshold_days,
        threshold_hours: settings.threshold_hours,
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('user_alert_preferences')
        .upsert(upsertData, { onConflict: 'user_id,alert_type' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-preferences'] });
      toast.success('Alert preferences saved');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to save preferences');
    },
  });

  const handleToggle = (alertType, enabled) => {
    setPreferences(prev => ({
      ...prev,
      [alertType]: {
        ...prev[alertType],
        alert_type: alertType,
        enabled
      }
    }));
  };

  const handleDaysChange = (alertType, days) => {
    setPreferences(prev => ({
      ...prev,
      [alertType]: {
        ...prev[alertType],
        alert_type: alertType,
        threshold_days: parseInt(days)
      }
    }));
  };

  const handleHoursChange = (alertType, hours) => {
    setPreferences(prev => ({
      ...prev,
      [alertType]: {
        ...prev[alertType],
        alert_type: alertType,
        threshold_hours: parseInt(hours)
      }
    }));
  };

  const handleSave = () => {
    saveMutation.mutate(preferences);
  };

  const handleResetDefaults = () => {
    const defaults = {};
    ALERT_CATEGORIES.forEach(category => {
      category.alerts.forEach(alert => {
        defaults[alert.type] = {
          alert_type: alert.type,
          enabled: true,
          threshold_days: alert.defaultDays,
          threshold_hours: alert.defaultHours || null
        };
      });
    });
    setPreferences(defaults);
  };

  const getPreference = (alertType, alert) => {
    return preferences[alertType] || {
      alert_type: alertType,
      enabled: true,
      threshold_days: alert.defaultDays,
      threshold_hours: alert.defaultHours || null
    };
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Alert Settings</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Alert & Notification Settings
            </CardTitle>
            <CardDescription>
              Customize when and how you receive alerts for all activities in the app
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        {ALERT_CATEGORIES.map((category, categoryIdx) => {
          const CategoryIcon = category.icon;
          return (
            <div key={categoryIdx} className="space-y-4">
              <div className="flex items-center gap-2">
                <CategoryIcon className="w-5 h-5 text-slate-600" />
                <h3 className="text-lg font-semibold text-slate-900">{category.category}</h3>
              </div>

              <div className="space-y-4 pl-7">
                {category.alerts.map((alert, alertIdx) => {
                  const pref = getPreference(alert.type, alert);
                  const isEnabled = pref.enabled ?? true;

                  return (
                    <div key={alertIdx} className="border rounded-lg p-4 space-y-4 bg-slate-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <Label className="text-base font-medium text-slate-900">
                              {alert.name}
                            </Label>
                            {!isEnabled && (
                              <Badge variant="secondary" className="text-xs">
                                Disabled
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-600">{alert.description}</p>
                        </div>
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={(checked) => handleToggle(alert.type, checked)}
                        />
                      </div>

                      {isEnabled && (
                        <div className="flex gap-4 items-end">
                          {alert.useDays && (
                            <div className="flex-1 space-y-2">
                              <Label htmlFor={`${alert.type}-days`} className="text-sm">
                                Alert after (days)
                              </Label>
                              <Input
                                id={`${alert.type}-days`}
                                type="number"
                                min="0"
                                max="365"
                                value={pref.threshold_days ?? alert.defaultDays}
                                onChange={(e) => handleDaysChange(alert.type, e.target.value)}
                                className="w-full"
                              />
                            </div>
                          )}
                          {alert.useHours && (
                            <div className="flex-1 space-y-2">
                              <Label htmlFor={`${alert.type}-hours`} className="text-sm">
                                Alert before (hours)
                              </Label>
                              <Input
                                id={`${alert.type}-hours`}
                                type="number"
                                min="0"
                                max="168"
                                value={pref.threshold_hours ?? alert.defaultHours ?? 0}
                                onChange={(e) => handleHoursChange(alert.type, e.target.value)}
                                className="w-full"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {categoryIdx < ALERT_CATEGORIES.length - 1 && <Separator className="mt-6" />}
            </div>
          );
        })}

        <Separator />

        <div className="flex justify-between gap-2">
          <Button
            variant="outline"
            onClick={handleResetDefaults}
            disabled={saveMutation.isPending}
          >
            Reset to Defaults
          </Button>
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? 'Saving...' : 'Save Alert Settings'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
