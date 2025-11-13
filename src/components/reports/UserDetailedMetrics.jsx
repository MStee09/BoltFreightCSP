import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Mail,
  FileText,
  Calendar,
  Award,
  Target,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { supabase } from '@/api/supabaseClient';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function UserDetailedMetrics({ userId, userName, dateRange, open, onOpenChange }) {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (open && userId) {
      fetchUserMetrics();
    }
  }, [open, userId, dateRange]);

  const fetchUserMetrics = async () => {
    setLoading(true);
    try {
      const MOCK_USER_ID = '00000000-0000-0000-0000-000000000000';
      const userIds = [userId, MOCK_USER_ID];

      const [
        eventsResult,
        stageHistoryResult,
        emailActivitiesResult,
        tariffActivitiesResult,
        assignedCarriersResult,
        documentsResult
      ] = await Promise.all([
        supabase
          .from('csp_events')
          .select(`
            *,
            customer:customers(name, segment),
            carriers:csp_event_carriers(
              id,
              status,
              carrier:carriers(name)
            )
          `)
          .in('user_id', userIds)
          .gte('created_date', dateRange.from.toISOString())
          .lte('created_date', dateRange.to.toISOString())
          .order('created_date', { ascending: false }),

        supabase
          .from('csp_stage_history')
          .select('*')
          .in('changed_by', userIds)
          .gte('changed_at', dateRange.from.toISOString())
          .lte('changed_at', dateRange.to.toISOString())
          .order('changed_at', { ascending: false }),

        supabase
          .from('email_activities')
          .select(`
            *,
            customer:customers(name),
            carrier:carriers(name),
            csp_event:csp_events(title)
          `)
          .in('owner_id', userIds)
          .gte('sent_at', dateRange.from.toISOString())
          .lte('sent_at', dateRange.to.toISOString())
          .order('sent_at', { ascending: false }),

        supabase
          .from('tariff_activities')
          .select(`
            *,
            tariff:tariffs(id, carrier_id, customer_ids)
          `)
          .in('user_id', userIds)
          .gte('created_at', dateRange.from.toISOString())
          .lte('created_at', dateRange.to.toISOString())
          .order('created_at', { ascending: false }),

        supabase
          .from('csp_event_carriers')
          .select(`
            id,
            status,
            invited_at,
            awarded_at,
            csp_event:csp_events!inner(user_id, title, customer:customers(name)),
            carrier:carriers(name)
          `)
          .in('csp_event.user_id', userIds)
          .gte('invited_at', dateRange.from.toISOString())
          .lte('invited_at', dateRange.to.toISOString()),

        supabase
          .from('documents')
          .select('*')
          .in('user_id', userIds)
          .gte('created_date', dateRange.from.toISOString())
          .lte('created_date', dateRange.to.toISOString())
      ]);

      if (eventsResult.error) throw eventsResult.error;
      if (stageHistoryResult.error) throw stageHistoryResult.error;
      if (emailActivitiesResult.error) throw emailActivitiesResult.error;
      if (tariffActivitiesResult.error) throw tariffActivitiesResult.error;
      if (assignedCarriersResult.error) throw assignedCarriersResult.error;
      if (documentsResult.error) throw documentsResult.error;

      const calculatedMetrics = calculateDetailedMetrics(
        eventsResult.data || [],
        stageHistoryResult.data || [],
        emailActivitiesResult.data || [],
        tariffActivitiesResult.data || [],
        assignedCarriersResult.data || [],
        documentsResult.data || []
      );

      setMetrics(calculatedMetrics);
    } catch (error) {
      console.error('Error fetching user metrics:', error);
      toast.error('Failed to load user metrics');
    } finally {
      setLoading(false);
    }
  };

  const calculateDetailedMetrics = (events, stageHistory, emails, tariffActivities, assignedCarriers, documents) => {
    const stageDistribution = {};
    const emailsByType = { sent: 0, received: 0, replied: 0 };
    const activityByDay = {};
    const stageVelocity = [];
    const customerBreakdown = {};
    const carrierInteractions = {};

    events.forEach(event => {
      const stage = event.stage || 'unknown';
      stageDistribution[stage] = (stageDistribution[stage] || 0) + 1;

      const customerName = event.customer?.name || 'Unknown';
      if (!customerBreakdown[customerName]) {
        customerBreakdown[customerName] = {
          name: customerName,
          segment: event.customer?.segment,
          eventsCount: 0,
          stages: new Set()
        };
      }
      customerBreakdown[customerName].eventsCount++;
      customerBreakdown[customerName].stages.add(stage);
    });

    stageHistory.forEach(change => {
      const dayKey = format(new Date(change.changed_at), 'MMM dd');
      if (!activityByDay[dayKey]) {
        activityByDay[dayKey] = { day: dayKey, stageChanges: 0, emails: 0, tariffs: 0 };
      }
      activityByDay[dayKey].stageChanges++;

      if (change.old_stage && change.new_stage) {
        const daysInStage = change.days_in_stage || 0;
        stageVelocity.push({
          from: change.old_stage,
          to: change.new_stage,
          days: daysInStage,
          date: change.changed_at
        });
      }
    });

    emails.forEach(email => {
      const dayKey = format(new Date(email.sent_at), 'MMM dd');
      if (!activityByDay[dayKey]) {
        activityByDay[dayKey] = { day: dayKey, stageChanges: 0, emails: 0, tariffs: 0 };
      }
      activityByDay[dayKey].emails++;

      if (email.direction === 'outbound') emailsByType.sent++;
      else if (email.direction === 'inbound') emailsByType.received++;

      if (email.in_reply_to) emailsByType.replied++;

      const carrierName = email.carrier?.name || email.customer?.name || 'Unknown';
      if (!carrierInteractions[carrierName]) {
        carrierInteractions[carrierName] = { name: carrierName, count: 0 };
      }
      carrierInteractions[carrierName].count++;
    });

    tariffActivities.forEach(activity => {
      const dayKey = format(new Date(activity.created_at), 'MMM dd');
      if (!activityByDay[dayKey]) {
        activityByDay[dayKey] = { day: dayKey, stageChanges: 0, emails: 0, tariffs: 0 };
      }
      activityByDay[dayKey].tariffs++;
    });

    const avgDaysPerStage = {};
    const stageTransitions = {};

    stageVelocity.forEach(transition => {
      const key = `${transition.from} → ${transition.to}`;
      if (!stageTransitions[key]) {
        stageTransitions[key] = { count: 0, totalDays: 0, transitions: [] };
      }
      stageTransitions[key].count++;
      stageTransitions[key].totalDays += transition.days;
      stageTransitions[key].transitions.push(transition);
    });

    Object.keys(stageTransitions).forEach(key => {
      const data = stageTransitions[key];
      avgDaysPerStage[key] = {
        transition: key,
        avgDays: (data.totalDays / data.count).toFixed(1),
        count: data.count
      };
    });

    const wonEvents = events.filter(e => e.stage === 'won' || e.stage === 'live');
    const lostEvents = events.filter(e => e.stage === 'lost' || e.stage === 'not_awarded');
    const inProgressEvents = events.filter(e =>
      !['won', 'lost', 'not_awarded', 'completed', 'live'].includes(e.stage)
    );

    const totalValue = wonEvents.reduce((sum, e) => sum + (e.projected_annual_spend || 0), 0);
    const avgDealSize = wonEvents.length > 0 ? totalValue / wonEvents.length : 0;

    return {
      summary: {
        totalEvents: events.length,
        wonDeals: wonEvents.length,
        lostDeals: lostEvents.length,
        inProgress: inProgressEvents.length,
        winRate: events.length > 0 ? ((wonEvents.length / (wonEvents.length + lostEvents.length)) * 100).toFixed(1) : 0,
        totalValue,
        avgDealSize,
        stageChanges: stageHistory.length,
        emailsSent: emailsByType.sent,
        emailsReceived: emailsByType.received,
        responseRate: emailsByType.sent > 0 ? ((emailsByType.replied / emailsByType.sent) * 100).toFixed(1) : 0,
        documentsUploaded: documents.length,
        carriersInvited: assignedCarriers.length,
        tariffActivities: tariffActivities.length
      },
      stageDistribution: Object.entries(stageDistribution).map(([stage, count]) => ({
        stage,
        count,
        percentage: ((count / events.length) * 100).toFixed(1)
      })),
      activityTimeline: Object.values(activityByDay).sort((a, b) =>
        new Date(a.day) - new Date(b.day)
      ),
      stageVelocity: Object.values(avgDaysPerStage).sort((a, b) =>
        parseFloat(b.avgDays) - parseFloat(a.avgDays)
      ),
      recentEvents: events.slice(0, 10),
      recentStageChanges: stageHistory.slice(0, 10),
      recentEmails: emails.slice(0, 10),
      customerBreakdown: Object.values(customerBreakdown).sort((a, b) =>
        b.eventsCount - a.eventsCount
      ),
      topCarrierInteractions: Object.values(carrierInteractions)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      emailBreakdown: emailsByType
    };
  };

  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];

  if (!open) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-4xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {userName} - Detailed Performance
          </SheetTitle>
          <SheetDescription>
            Comprehensive metrics and activity breakdown for{' '}
            {format(dateRange.from, 'MMM dd')} - {format(dateRange.to, 'MMM dd, yyyy')}
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Activity className="h-8 w-8 animate-pulse text-slate-400" />
          </div>
        ) : metrics ? (
          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Target className="h-4 w-4" />
                      <span className="text-xs">Total Events</span>
                    </div>
                    <div className="text-2xl font-bold">{metrics.summary.totalEvents}</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-xs">Won</span>
                    </div>
                    <div className="text-2xl font-bold text-green-600">{metrics.summary.wonDeals}</div>
                    <div className="text-xs text-muted-foreground">{metrics.summary.winRate}% win rate</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Activity className="h-4 w-4" />
                      <span className="text-xs">In Progress</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-600">{metrics.summary.inProgress}</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <XCircle className="h-4 w-4" />
                      <span className="text-xs">Lost</span>
                    </div>
                    <div className="text-2xl font-bold text-red-600">{metrics.summary.lostDeals}</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span className="text-xs">Emails Sent</span>
                    </div>
                    <div className="text-xl font-bold">{metrics.summary.emailsSent}</div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    {metrics.summary.responseRate}% response rate
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <ArrowRight className="h-4 w-4" />
                      <span className="text-xs">Stage Changes</span>
                    </div>
                    <div className="text-xl font-bold">{metrics.summary.stageChanges}</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span className="text-xs">Documents</span>
                    </div>
                    <div className="text-xl font-bold">{metrics.summary.documentsUploaded}</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="stages">Stages</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="emails">Emails</TabsTrigger>
                <TabsTrigger value="events">Events</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Performance Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <span className="text-sm font-medium">Total Deal Value (Won)</span>
                        <span className="text-lg font-bold text-green-600">
                          ${metrics.summary.totalValue.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <span className="text-sm font-medium">Avg Deal Size</span>
                        <span className="text-lg font-bold text-blue-600">
                          ${metrics.summary.avgDealSize.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                        <span className="text-sm font-medium">Carriers Invited</span>
                        <span className="text-lg font-bold text-purple-600">
                          {metrics.summary.carriersInvited}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Stage Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {metrics.stageDistribution.length > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={metrics.stageDistribution}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ stage, percentage }) => `${stage} (${percentage}%)`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="count"
                          >
                            {metrics.stageDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No stage data available
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Top Customers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {metrics.customerBreakdown.slice(0, 5).map((customer, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 border rounded">
                          <div>
                            <p className="font-medium text-sm">{customer.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {customer.stages.size} stages active
                            </p>
                          </div>
                          <Badge variant="secondary">{customer.eventsCount} events</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="stages" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Stage Velocity</CardTitle>
                    <CardDescription>Average days to move between stages</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {metrics.stageVelocity.length > 0 ? (
                      <div className="space-y-3">
                        {metrics.stageVelocity.map((velocity, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 border rounded">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">{velocity.transition}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge variant="outline">{velocity.count} times</Badge>
                              <div className={cn(
                                "font-bold",
                                parseFloat(velocity.avgDays) > 20 ? "text-red-600" :
                                parseFloat(velocity.avgDays) < 10 ? "text-green-600" : "text-slate-600"
                              )}>
                                {velocity.avgDays} days
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No stage transition data available
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Recent Stage Changes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-2">
                        {metrics.recentStageChanges.map((change, idx) => (
                          <div key={idx} className="flex items-start gap-3 p-2 border rounded text-sm">
                            <ArrowRight className="h-4 w-4 mt-0.5 text-blue-600" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{change.old_stage}</span>
                                <ArrowRight className="h-3 w-3" />
                                <span className="font-medium text-blue-600">{change.new_stage}</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(new Date(change.changed_at), 'MMM dd, yyyy h:mm a')}
                              </p>
                              {change.notes && (
                                <p className="text-xs mt-1 text-slate-600">{change.notes}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="activity" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Activity Timeline</CardTitle>
                    <CardDescription>Daily activity breakdown</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {metrics.activityTimeline.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={metrics.activityTimeline}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="day" />
                          <YAxis />
                          <RechartsTooltip />
                          <Legend />
                          <Bar dataKey="stageChanges" fill="#3b82f6" name="Stage Changes" />
                          <Bar dataKey="emails" fill="#8b5cf6" name="Emails" />
                          <Bar dataKey="tariffs" fill="#10b981" name="Tariff Activities" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No activity data available
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Top Carrier Interactions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {metrics.topCarrierInteractions.map((carrier, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 border rounded">
                          <span className="text-sm font-medium">{carrier.name}</span>
                          <Badge>{carrier.count} interactions</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="emails" className="space-y-4 mt-4">
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {metrics.emailBreakdown.sent}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Sent</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {metrics.emailBreakdown.received}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Received</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {metrics.emailBreakdown.replied}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Replied</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Recent Email Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-3">
                        {metrics.recentEmails.map((email, idx) => (
                          <div key={idx} className="p-3 border rounded">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium text-sm">{email.subject}</span>
                              </div>
                              <Badge variant={email.direction === 'outbound' ? 'default' : 'secondary'}>
                                {email.direction}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground space-y-1">
                              <p>To: {email.to_address}</p>
                              <p>{format(new Date(email.sent_at), 'MMM dd, yyyy h:mm a')}</p>
                              {email.customer && (
                                <p className="text-blue-600">Customer: {email.customer.name}</p>
                              )}
                              {email.carrier && (
                                <p className="text-purple-600">Carrier: {email.carrier.name}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="events" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Recent Events</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[500px]">
                      <div className="space-y-3">
                        {metrics.recentEvents.map((event, idx) => (
                          <div key={idx} className="p-4 border rounded hover:bg-slate-50 transition-colors">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className="font-medium">{event.title}</h4>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {event.customer?.name}
                                </p>
                              </div>
                              <Badge
                                variant={
                                  event.stage === 'won' || event.stage === 'live' ? 'default' :
                                  event.stage === 'lost' ? 'destructive' : 'secondary'
                                }
                              >
                                {event.stage}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs mt-3">
                              {event.projected_annual_spend && (
                                <div>
                                  <span className="text-muted-foreground">Value: </span>
                                  <span className="font-medium">
                                    ${event.projected_annual_spend.toLocaleString()}
                                  </span>
                                </div>
                              )}
                              <div>
                                <span className="text-muted-foreground">Created: </span>
                                <span className="font-medium">
                                  {format(new Date(event.created_date), 'MMM dd, yyyy')}
                                </span>
                              </div>
                              {event.carriers && event.carriers.length > 0 && (
                                <div className="col-span-2">
                                  <span className="text-muted-foreground">Carriers: </span>
                                  <span className="font-medium">
                                    {event.carriers.map(c => c.carrier?.name).join(', ')}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-slate-300 mb-3" />
            <p className="text-slate-500">No data available for this user</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
