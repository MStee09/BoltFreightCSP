import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../api/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Skeleton } from '../ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Zap, Clock, TrendingUp, Mail, CheckCircle,
  RefreshCw, Play, Pause, Activity
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const RULE_ICONS = {
  auto_renewal_csp: TrendingUp,
  carrier_followup_reminder: Mail,
  validation_reminder: CheckCircle,
  daily_digest: Activity,
  custom: Zap,
};

export default function AutomationManagement() {
  const queryClient = useQueryClient();
  const [runningRule, setRunningRule] = useState(null);

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['automation-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('automation_rules')
        .select('*')
        .order('rule_type');

      if (error) throw error;
      return data || [];
    },
  });

  const { data: recentLogs = [] } = useQuery({
    queryKey: ['automation-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('automation_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
  });

  const toggleRuleMutation = useMutation({
    mutationFn: async ({ ruleId, isEnabled }) => {
      const { error } = await supabase
        .from('automation_rules')
        .update({ is_enabled: isEnabled })
        .eq('id', ruleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['automation-rules']);
      toast.success('Automation rule updated');
    },
    onError: (error) => {
      toast.error(`Failed to update rule: ${error.message}`);
    },
  });

  const runAutomationMutation = useMutation({
    mutationFn: async (ruleType) => {
      setRunningRule(ruleType);
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/run-automations`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ruleType }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to run automation');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast.success('Automation completed successfully');
      queryClient.invalidateQueries(['automation-logs']);
      queryClient.invalidateQueries(['automation-rules']);
      setRunningRule(null);
    },
    onError: (error) => {
      toast.error(`Failed to run automation: ${error.message}`);
      setRunningRule(null);
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-600" />
            <CardTitle>Automation Rules</CardTitle>
          </div>
          <CardDescription>
            Configure automated workflows to keep your pipeline moving
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {rules.map((rule) => {
              const Icon = RULE_ICONS[rule.rule_type] || Zap;
              const isRunning = runningRule === rule.rule_type;

              return (
                <div
                  key={rule.id}
                  className="flex items-start gap-4 p-4 border rounded-lg hover:border-purple-300 transition-colors"
                >
                  <div className={`p-2 rounded-lg ${rule.is_enabled ? 'bg-purple-100' : 'bg-slate-100'}`}>
                    <Icon className={`w-5 h-5 ${rule.is_enabled ? 'text-purple-600' : 'text-slate-400'}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm">{rule.name}</h3>
                      <Badge variant={rule.is_enabled ? 'default' : 'secondary'} className="text-xs">
                        {rule.is_enabled ? 'Active' : 'Paused'}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 mb-2">{rule.description}</p>

                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      {rule.last_run_at && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Last run: {format(new Date(rule.last_run_at), 'MMM d, h:mm a')}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        Runs: {rule.run_count || 0} ({rule.success_count || 0} success)
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Switch
                      checked={rule.is_enabled}
                      onCheckedChange={(checked) =>
                        toggleRuleMutation.mutate({ ruleId: rule.id, isEnabled: checked })
                      }
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => runAutomationMutation.mutate(rule.rule_type)}
                      disabled={isRunning || !rule.is_enabled}
                    >
                      {isRunning ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest automation executions</CardDescription>
        </CardHeader>
        <CardContent>
          {recentLogs.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No automation activity yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium text-sm">
                      {rules.find(r => r.id === log.rule_id)?.name || log.rule_type}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          log.status === 'success'
                            ? 'default'
                            : log.status === 'failed'
                            ? 'destructive'
                            : 'secondary'
                        }
                        className="text-xs"
                      >
                        {log.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {format(new Date(log.created_at), 'MMM d, h:mm a')}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {log.execution_time_ms ? `${log.execution_time_ms}ms` : '-'}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {log.result_data
                        ? Object.entries(log.result_data)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(', ')
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
