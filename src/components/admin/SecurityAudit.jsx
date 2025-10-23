import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Shield, Activity, AlertTriangle, User, Clock, Search, Download } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { format } from 'date-fns';

const AUDIT_EVENT_TYPES = {
  LOGIN: { label: 'User Login', color: 'bg-blue-100 text-blue-700', icon: User },
  LOGOUT: { label: 'User Logout', color: 'bg-slate-100 text-slate-700', icon: User },
  CREATE: { label: 'Record Created', color: 'bg-green-100 text-green-700', icon: Activity },
  UPDATE: { label: 'Record Updated', color: 'bg-yellow-100 text-yellow-700', icon: Activity },
  DELETE: { label: 'Record Deleted', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
  PERMISSION_CHANGE: { label: 'Permission Change', color: 'bg-purple-100 text-purple-700', icon: Shield },
  FAILED_LOGIN: { label: 'Failed Login', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
};

export const SecurityAudit = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('all');

  const { data: auditLogs, isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const logs = [
        {
          id: 1,
          event_type: 'LOGIN',
          user_email: 'admin@company.com',
          user_name: 'Admin User',
          description: 'Successful login from 192.168.1.1',
          timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
        {
          id: 2,
          event_type: 'CREATE',
          user_email: 'admin@company.com',
          user_name: 'Admin User',
          description: 'Created new customer: Acme Logistics',
          timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
          resource: 'customers',
          resource_id: '123',
        },
        {
          id: 3,
          event_type: 'PERMISSION_CHANGE',
          user_email: 'admin@company.com',
          user_name: 'Admin User',
          description: 'Changed role for user@company.com from viewer to editor',
          timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
          resource: 'user_profiles',
          resource_id: '456',
        },
        {
          id: 4,
          event_type: 'FAILED_LOGIN',
          user_email: 'unknown@example.com',
          user_name: 'Unknown',
          description: 'Failed login attempt - invalid credentials',
          timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
          ip_address: '203.0.113.42',
        },
        {
          id: 5,
          event_type: 'UPDATE',
          user_email: 'editor@company.com',
          user_name: 'Editor User',
          description: 'Updated tariff: FedEx Q4 2024',
          timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
          resource: 'tariffs',
          resource_id: '789',
        },
      ];

      return logs;
    },
  });

  const { data: securityMetrics } = useQuery({
    queryKey: ['security-metrics'],
    queryFn: async () => ({
      totalLogins: 1247,
      failedLogins: 23,
      activeUsers: 12,
      lastBackup: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    }),
  });

  const filteredLogs = auditLogs?.filter((log) => {
    const matchesSearch =
      searchTerm === '' ||
      log.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = eventTypeFilter === 'all' || log.event_type === eventTypeFilter;

    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Security Overview</CardTitle>
          <CardDescription>System security metrics and status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <div className="p-2 bg-blue-100 rounded-lg">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{securityMetrics?.totalLogins}</p>
                <p className="text-sm text-muted-foreground">Total Logins</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{securityMetrics?.failedLogins}</p>
                <p className="text-sm text-muted-foreground">Failed Attempts</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <div className="p-2 bg-green-100 rounded-lg">
                <Activity className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{securityMetrics?.activeUsers}</p>
                <p className="text-sm text-muted-foreground">Active Users</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Shield className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">Secure</p>
                <p className="text-sm text-muted-foreground">System Status</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Audit Logs</CardTitle>
              <CardDescription>View and filter system activity</CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by user or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="LOGIN">Logins</SelectItem>
                <SelectItem value="FAILED_LOGIN">Failed Logins</SelectItem>
                <SelectItem value="CREATE">Creates</SelectItem>
                <SelectItem value="UPDATE">Updates</SelectItem>
                <SelectItem value="DELETE">Deletes</SelectItem>
                <SelectItem value="PERMISSION_CHANGE">Permission Changes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            {isLoading ? (
              <div className="text-center p-8 text-muted-foreground">Loading audit logs...</div>
            ) : filteredLogs?.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">No logs found</div>
            ) : (
              filteredLogs?.map((log) => {
                const eventType = AUDIT_EVENT_TYPES[log.event_type];
                const EventIcon = eventType.icon;

                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className={`p-2 rounded-lg ${eventType.color}`}>
                      <EventIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {eventType.label}
                        </Badge>
                        <span className="text-sm font-medium">{log.user_name}</span>
                        <span className="text-xs text-muted-foreground">{log.user_email}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">{log.description}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(log.timestamp), 'MMM d, yyyy h:mm a')}
                        </div>
                        {log.ip_address && <span>IP: {log.ip_address}</span>}
                        {log.resource && (
                          <span>
                            {log.resource} #{log.resource_id}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
