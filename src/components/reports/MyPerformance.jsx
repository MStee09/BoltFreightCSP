import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Mail, FileText, Target, Calendar, Award, Activity } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

export function MyPerformance() {
  const [dateRange] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      return profile;
    }
  });

  const { data: metrics, isLoading } = useQuery({
    queryKey: ['myPerformance', currentUser?.id, dateRange],
    queryFn: async () => {
      if (!currentUser?.id) return null;

      const userIds = [currentUser.id, '00000000-0000-0000-0000-000000000000'];

      const [
        cspEventsResult,
        emailsResult,
        tariffActivitiesResult,
        documentsResult,
        lastMonthCspResult,
        lastMonthEmailsResult
      ] = await Promise.all([
        supabase
          .from('csp_events')
          .select('id, title, stage, created_date, customer:customers(name)')
          .in('user_id', userIds)
          .gte('created_date', dateRange.from.toISOString())
          .lte('created_date', dateRange.to.toISOString()),

        supabase
          .from('email_activities')
          .select('id, subject, sent_at, activity_type')
          .in('owner_id', userIds)
          .gte('sent_at', dateRange.from.toISOString())
          .lte('sent_at', dateRange.to.toISOString()),

        supabase
          .from('tariff_activities')
          .select('id, activity_type, created_at')
          .in('user_id', userIds)
          .gte('created_at', dateRange.from.toISOString())
          .lte('created_at', dateRange.to.toISOString()),

        supabase
          .from('documents')
          .select('id, file_name, created_date')
          .in('user_id', userIds)
          .gte('created_date', dateRange.from.toISOString())
          .lte('created_date', dateRange.to.toISOString()),

        supabase
          .from('csp_events')
          .select('id', { count: 'exact' })
          .in('user_id', userIds)
          .gte('created_date', startOfMonth(subMonths(new Date(), 1)).toISOString())
          .lte('created_date', endOfMonth(subMonths(new Date(), 1)).toISOString()),

        supabase
          .from('email_activities')
          .select('id', { count: 'exact' })
          .in('owner_id', userIds)
          .gte('sent_at', startOfMonth(subMonths(new Date(), 1)).toISOString())
          .lte('sent_at', endOfMonth(subMonths(new Date(), 1)).toISOString())
      ]);

      const cspEvents = cspEventsResult.data || [];
      const emails = emailsResult.data || [];
      const tariffActivities = tariffActivitiesResult.data || [];
      const documents = documentsResult.data || [];

      const stageBreakdown = cspEvents.reduce((acc, event) => {
        acc[event.stage] = (acc[event.stage] || 0) + 1;
        return acc;
      }, {});

      const emailBreakdown = emails.reduce((acc, email) => {
        acc[email.activity_type] = (acc[email.activity_type] || 0) + 1;
        return acc;
      }, {});

      const lastMonthCspCount = lastMonthCspResult.count || 0;
      const lastMonthEmailCount = lastMonthEmailsResult.count || 0;

      const cspTrend = lastMonthCspCount > 0
        ? ((cspEvents.length - lastMonthCspCount) / lastMonthCspCount * 100).toFixed(1)
        : cspEvents.length > 0 ? 100 : 0;

      const emailTrend = lastMonthEmailCount > 0
        ? ((emails.length - lastMonthEmailCount) / lastMonthEmailCount * 100).toFixed(1)
        : emails.length > 0 ? 100 : 0;

      return {
        cspEvents: cspEvents.length,
        emails: emails.length,
        tariffActivities: tariffActivities.length,
        documents: documents.length,
        stageBreakdown,
        emailBreakdown,
        cspTrend: parseFloat(cspTrend),
        emailTrend: parseFloat(emailTrend),
        recentCspEvents: cspEvents.slice(0, 5),
        recentEmails: emails.slice(0, 5)
      };
    },
    enabled: !!currentUser?.id
  });

  const MetricCard = ({ icon: Icon, title, value, trend, color, subtitle, iconColor }) => (
    <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all hover:scale-105 duration-200">
      <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-5`} />
      <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${color}`} />
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className={`p-3 rounded-xl bg-gradient-to-br ${color} shadow-md`}>
            <Icon className={`h-6 w-6 ${iconColor || 'text-white'}`} />
          </div>
          {trend !== undefined && trend !== 0 && (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${
              trend > 0
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {trend > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {Math.abs(trend)}%
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-4xl font-extrabold text-slate-900 mb-2 bg-gradient-to-br from-slate-900 to-slate-700 bg-clip-text">
          {value}
        </div>
        <div className="text-base font-medium text-slate-700">{title}</div>
        {subtitle && <div className="text-sm text-slate-500 mt-1 font-medium">{subtitle}</div>}
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Activity className="h-12 w-12 mx-auto mb-4 text-slate-300" />
          <p className="text-slate-600">No performance data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">My Performance</h2>
          <p className="text-sm text-slate-600 mt-1">
            {format(dateRange.from, 'MMMM d')} - {format(dateRange.to, 'MMMM d, yyyy')}
          </p>
        </div>
        <Badge variant="secondary" className="gap-2 py-2 px-4">
          <Calendar className="h-4 w-4" />
          This Month
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          icon={Target}
          title="CSP Events"
          value={metrics.cspEvents}
          trend={metrics.cspTrend}
          color="from-blue-500 to-blue-600"
          iconColor="text-white"
          subtitle="Events managed"
        />
        <MetricCard
          icon={Mail}
          title="Emails Sent"
          value={metrics.emails}
          trend={metrics.emailTrend}
          color="from-green-500 to-green-600"
          iconColor="text-white"
          subtitle="Communications"
        />
        <MetricCard
          icon={FileText}
          title="Tariff Updates"
          value={metrics.tariffActivities}
          color="from-amber-500 to-amber-600"
          iconColor="text-white"
          subtitle="Activities logged"
        />
        <MetricCard
          icon={FileText}
          title="Documents"
          value={metrics.documents}
          color="from-purple-500 to-purple-600"
          iconColor="text-white"
          subtitle="Files uploaded"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Object.keys(metrics.stageBreakdown).length > 0 && (
          <Card className="shadow-lg border-0 relative overflow-hidden hover:shadow-xl transition-shadow">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-blue-600" />
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-md">
                  <Award className="h-5 w-5 text-white" />
                </div>
                CSP Pipeline Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(metrics.stageBreakdown)
                  .sort(([, a], [, b]) => b - a)
                  .map(([stage, count]) => {
                    const percentage = ((count / metrics.cspEvents) * 100).toFixed(0);
                    return (
                      <div key={stage} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold capitalize text-slate-800 text-sm">
                            {stage.replace(/_/g, ' ')}
                          </span>
                          <span className="text-sm font-bold text-blue-600">{count} events</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-3 shadow-inner">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all shadow-sm"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        )}

        {Object.keys(metrics.emailBreakdown).length > 0 && (
          <Card className="shadow-lg border-0 relative overflow-hidden hover:shadow-xl transition-shadow">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-500 to-green-600" />
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-green-600 shadow-md">
                  <Mail className="h-5 w-5 text-white" />
                </div>
                Email Activity Types
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(metrics.emailBreakdown)
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, count]) => {
                    const percentage = ((count / metrics.emails) * 100).toFixed(0);
                    return (
                      <div key={type} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold capitalize text-slate-800 text-sm">
                            {type.replace(/_/g, ' ')}
                          </span>
                          <span className="text-sm font-bold text-green-600">{count} emails</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-3 shadow-inner">
                          <div
                            className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all shadow-sm"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {metrics.recentCspEvents.length > 0 && (
        <Card className="shadow-lg border-0 relative overflow-hidden hover:shadow-xl transition-shadow">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-slate-600 to-slate-800" />
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 rounded-lg bg-gradient-to-br from-slate-600 to-slate-800 shadow-md">
                <Activity className="h-5 w-5 text-white" />
              </div>
              Recent CSP Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.recentCspEvents.map((event) => (
                <div key={event.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl hover:from-slate-100 hover:to-slate-200 transition-all border border-slate-200 shadow-sm">
                  <div className="flex-1">
                    <div className="font-semibold text-slate-900 mb-1">{event.title}</div>
                    {event.customer && (
                      <div className="text-sm text-slate-600 font-medium">{event.customer.name}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="capitalize font-semibold px-3 py-1">
                      {event.stage.replace(/_/g, ' ')}
                    </Badge>
                    <span className="text-sm text-slate-500 font-medium">
                      {format(new Date(event.created_date), 'MMM d')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
