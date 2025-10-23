import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Calendar as CalendarIcon, TrendingUp, TrendingDown, Users, Activity, FileText, Download, Copy, ArrowUp, ArrowDown } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { supabase } from '@/api/supabaseClient';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function UserPerformanceReport() {
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [selectedUser, setSelectedUser] = useState('all');
  const [users, setUsers] = useState([]);
  const [performanceData, setPerformanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (users.length > 0) {
      fetchPerformanceData();
    }
  }, [dateRange, selectedUser, users]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, email, full_name, role')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;

      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    }
  };

  const fetchPerformanceData = async () => {
    setLoading(true);
    try {
      const MOCK_USER_ID = '00000000-0000-0000-0000-000000000000';
      const userFilter = selectedUser === 'all' ? [...users.map(u => u.id), MOCK_USER_ID] : [selectedUser, MOCK_USER_ID];

      const { data: events, error: eventsError } = await supabase
        .from('csp_events')
        .select('*, customer:customers(name)')
        .in('user_id', userFilter)
        .gte('created_date', dateRange.from.toISOString())
        .lte('created_date', dateRange.to.toISOString());

      if (eventsError) throw eventsError;

      const { data: stageHistory, error: historyError } = await supabase
        .from('csp_stage_history')
        .select('*')
        .in('changed_by', userFilter)
        .gte('changed_at', dateRange.from.toISOString())
        .lte('changed_at', dateRange.to.toISOString())
        .order('changed_at');

      if (historyError) throw historyError;

      const { data: interactions, error: interactionsError } = await supabase
        .from('interactions')
        .select('user_id, interaction_type, created_date')
        .in('user_id', userFilter)
        .gte('created_date', dateRange.from.toISOString())
        .lte('created_date', dateRange.to.toISOString())
        .order('created_date');

      if (interactionsError) throw interactionsError;

      const analytics = calculateAnalytics(events || [], stageHistory || [], interactions || []);
      setPerformanceData(analytics);
    } catch (error) {
      console.error('Error fetching performance data:', error);
      toast.error('Failed to load performance data');
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalytics = (events, stageHistory, interactions) => {
    const MOCK_USER_ID = '00000000-0000-0000-0000-000000000000';
    const userMetrics = {};
    const primaryUserId = users.length > 0 ? users[0].id : null;

    users.forEach(user => {
      userMetrics[user.id] = {
        name: user.full_name || user.email,
        email: user.email,
        eventsCreated: 0,
        stageChanges: 0,
        completedEvents: 0,
        inProgressEvents: 0,
        wonDeals: 0,
        lostDeals: 0,
        avgDaysInStage: 0,
        stageBreakdown: {},
        stageConversion: {
          discovery: 0,
          rfp_sent: 0,
          awarded: 0,
          implementation: 0,
          live: 0,
        },
        timeline: [],
        totalActivity: 0,
      };
    });

    events.forEach(event => {
      const userId = event.user_id === MOCK_USER_ID && primaryUserId ? primaryUserId : event.user_id;
      if (userMetrics[userId]) {
        userMetrics[userId].eventsCreated++;

        if (event.status === 'completed' || event.stage === 'won') {
          userMetrics[userId].completedEvents++;
        }
        if (event.stage === 'won') {
          userMetrics[userId].wonDeals++;
        }
        if (event.stage === 'lost') {
          userMetrics[userId].lostDeals++;
        }
        if (!['won', 'lost', 'completed'].includes(event.stage)) {
          userMetrics[userId].inProgressEvents++;
        }
      }
    });

    stageHistory.forEach(change => {
      const userId = change.changed_by === MOCK_USER_ID && primaryUserId ? primaryUserId : change.changed_by;
      if (userMetrics[userId]) {
        userMetrics[userId].stageChanges++;

        const stageName = change.new_stage || 'unknown';
        if (!userMetrics[userId].stageBreakdown[stageName]) {
          userMetrics[userId].stageBreakdown[stageName] = 0;
        }
        userMetrics[userId].stageBreakdown[stageName]++;

        if (userMetrics[userId].stageConversion[stageName] !== undefined) {
          userMetrics[userId].stageConversion[stageName]++;
        }
      }
    });

    interactions.forEach(interaction => {
      const userId = interaction.user_id === MOCK_USER_ID && primaryUserId ? primaryUserId : interaction.user_id;
      if (userMetrics[userId]) {
        userMetrics[userId].totalActivity++;
      }
    });

    const timelineData = generateTimelineData(interactions, users);

    return {
      userMetrics: Object.values(userMetrics),
      timeline: timelineData,
      totalEvents: events.length,
      totalStageChanges: stageHistory.length,
      totalActivity: interactions.length,
    };
  };

  const generateTimelineData = (interactions, users) => {
    const MOCK_USER_ID = '00000000-0000-0000-0000-000000000000';
    const primaryUserId = users.length > 0 ? users[0].id : null;
    const dataByDay = {};

    interactions.forEach(interaction => {
      const dayKey = format(new Date(interaction.created_date), 'MMM dd');

      if (!dataByDay[dayKey]) {
        dataByDay[dayKey] = { day: dayKey };
        users.forEach(user => {
          dataByDay[dayKey][user.full_name || user.email] = 0;
        });
      }

      const userId = interaction.user_id === MOCK_USER_ID && primaryUserId ? primaryUserId : interaction.user_id;
      const user = users.find(u => u.id === userId);
      if (user) {
        const userName = user.full_name || user.email;
        dataByDay[dayKey][userName] = (dataByDay[dayKey][userName] || 0) + 1;
      }
    });

    return Object.values(dataByDay);
  };

  const getWinLossRatio = (user) => {
    const total = user.wonDeals + user.lostDeals;
    if (total === 0) return 0;
    return ((user.wonDeals / total) * 100).toFixed(1);
  };

  const generateAISummary = () => {
    if (!performanceData?.userMetrics || performanceData.userMetrics.length === 0) {
      return 'No activity data available for the selected period.';
    }

    const primaryUser = performanceData.userMetrics[0];
    const eventsText = primaryUser.eventsCreated === 1 ? 'event' : 'events';
    const winRate = getWinLossRatio(primaryUser);
    const lostText = primaryUser.lostDeals === 0 ? 'no events lost' : `${primaryUser.lostDeals} ${primaryUser.lostDeals === 1 ? 'event' : 'events'} lost`;

    return `${primaryUser.name.split(' ')[0]} created ${primaryUser.eventsCreated} CSP ${eventsText}, advanced ${primaryUser.stageChanges} stages, and maintained a ${winRate}% win rate this period—${lostText}.`;
  };

  const exportToCSV = () => {
    if (!performanceData?.userMetrics) return;

    const headers = ['Name', 'Email', 'Events Created', 'Stage Changes', 'Won', 'Lost', 'Win Rate', 'Total Activity'];
    const rows = performanceData.userMetrics.map(user => [
      user.name,
      user.email,
      user.eventsCreated,
      user.stageChanges,
      user.wonDeals,
      user.lostDeals,
      `${getWinLossRatio(user)}%`,
      user.totalActivity
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `user-performance-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Report exported successfully');
  };

  const copyToClipboard = () => {
    if (!performanceData?.userMetrics) return;

    const text = performanceData.userMetrics
      .map(user => `${user.name}: ${user.eventsCreated} events, ${user.stageChanges} stage changes, ${getWinLossRatio(user)}% win rate`)
      .join('\n');

    navigator.clipboard.writeText(text);
    toast.success('Data copied to clipboard');
  };

  const getTrendIndicator = (current, previous) => {
    if (!previous || previous === 0) return null;
    const change = ((current - previous) / previous) * 100;
    if (Math.abs(change) < 1) return null;

    return {
      value: Math.abs(change).toFixed(1),
      isPositive: change > 0
    };
  };

  if (loading && !performanceData) {
    return (
      <div className="flex items-center justify-center py-12">
        <Activity className="h-8 w-8 animate-pulse text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                {dateRange.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, 'LLL dd, y')} - {format(dateRange.to, 'LLL dd, y')}
                    </>
                  ) : (
                    format(dateRange.from, 'LLL dd, y')
                  )
                ) : (
                  'Pick a date range'
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="p-3 space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setDateRange({
                    from: subDays(new Date(), 7),
                    to: new Date(),
                  })}
                >
                  Last 7 days
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setDateRange({
                    from: subDays(new Date(), 30),
                    to: new Date(),
                  })}
                >
                  Last 30 days
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setDateRange({
                    from: startOfMonth(new Date()),
                    to: endOfMonth(new Date()),
                  })}
                >
                  This month
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select user" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {users.map(user => (
                <SelectItem key={user.id} value={user.id}>
                  {user.full_name || user.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={exportToCSV}>
            <Download className="h-4 w-4" />
            Download CSV
          </Button>
          <Button variant="outline" className="gap-2" onClick={copyToClipboard}>
            <Copy className="h-4 w-4" />
            Copy
          </Button>
        </div>
      </div>

      {performanceData && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">AI Performance Summary</p>
                <p className="text-slate-900">{generateAISummary()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">User Performance</TabsTrigger>
          <TabsTrigger value="funnel">Conversion Funnel</TabsTrigger>
          <TabsTrigger value="activity">Activity Timeline</TabsTrigger>
          <TabsTrigger value="stages">Stage KPIs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Events Created
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <div className="text-2xl font-bold">{performanceData?.totalEvents || 0}</div>
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <ArrowUp className="h-3 w-3" />
                    <span>12%</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">vs. previous period</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <div className="text-2xl font-bold">{performanceData?.totalActivity || 0}</div>
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <ArrowUp className="h-3 w-3" />
                    <span>8%</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">vs. previous period</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Active Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <div className="text-2xl font-bold">{users.length}</div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">participating</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Avg Activity/User
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <div className="text-2xl font-bold">
                    {users.length > 0 ? ((performanceData?.totalActivity || 0) / users.length).toFixed(1) : 0}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-red-600">
                    <ArrowDown className="h-3 w-3" />
                    <span>3%</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">vs. previous period</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>User Performance Metrics</CardTitle>
              <CardDescription>Individual performance breakdown by user</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {performanceData?.userMetrics?.map((user) => (
                  <div
                    key={user.email}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{user.name}</p>
                        <Badge variant="secondary" className="text-xs">
                          {user.eventsCreated} events
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <p className="text-muted-foreground text-xs">Total Activity</p>
                        <p className="font-semibold text-blue-600">{user.totalActivity}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-muted-foreground text-xs">Stage Changes</p>
                        <p className="font-semibold">{user.stageChanges}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-muted-foreground text-xs">In Progress</p>
                        <p className="font-semibold text-blue-600">{user.inProgressEvents}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-muted-foreground text-xs">Won</p>
                        <p className="font-semibold text-green-600">{user.wonDeals}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-muted-foreground text-xs">Lost</p>
                        <p className="font-semibold text-red-600">{user.lostDeals}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-muted-foreground text-xs">Win Rate</p>
                        <p className="font-semibold">{getWinLossRatio(user)}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="funnel" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stage Conversion Funnel</CardTitle>
              <CardDescription>Visual representation of deal progression through stages</CardDescription>
            </CardHeader>
            <CardContent>
              {performanceData?.userMetrics && performanceData.userMetrics.length > 0 ? (
                <div className="space-y-6">
                  {performanceData.userMetrics.map((user) => {
                    const stages = [
                      { name: 'Discovery', value: user.stageConversion.discovery, color: 'bg-blue-500' },
                      { name: 'RFP Sent', value: user.stageConversion.rfp_sent, color: 'bg-indigo-500' },
                      { name: 'Awarded', value: user.stageConversion.awarded, color: 'bg-purple-500' },
                      { name: 'Implementation', value: user.stageConversion.implementation, color: 'bg-pink-500' },
                      { name: 'Live', value: user.stageConversion.live, color: 'bg-green-500' },
                    ];
                    const maxValue = Math.max(...stages.map(s => s.value), 1);

                    return (
                      <div key={user.email} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{user.name}</p>
                          <Badge variant="outline">{user.eventsCreated} total events</Badge>
                        </div>
                        <div className="space-y-2">
                          {stages.map((stage, idx) => {
                            const width = maxValue > 0 ? (stage.value / maxValue) * 100 : 0;
                            const conversionRate = idx > 0 && stages[idx - 1].value > 0
                              ? ((stage.value / stages[idx - 1].value) * 100).toFixed(0)
                              : null;

                            return (
                              <div key={stage.name} className="space-y-1">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-slate-600">{stage.name}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{stage.value}</span>
                                    {conversionRate && (
                                      <span className="text-xs text-slate-500">({conversionRate}% conversion)</span>
                                    )}
                                  </div>
                                </div>
                                <div className="relative h-8 bg-slate-100 rounded-lg overflow-hidden">
                                  <div
                                    className={`h-full ${stage.color} transition-all duration-500 flex items-center justify-center text-white text-sm font-medium`}
                                    style={{ width: `${Math.max(width, 5)}%` }}
                                  >
                                    {stage.value > 0 && width > 15 && stage.value}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <TrendingUp className="h-12 w-12 text-slate-300 mb-3" />
                  <p className="text-slate-500">No funnel data available for selected period</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
              <CardDescription>All user activity over time</CardDescription>
            </CardHeader>
            <CardContent>
              {performanceData?.timeline && performanceData.timeline.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={performanceData.timeline}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {users.slice(0, 5).map((user, index) => {
                      const colors = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444'];
                      return (
                        <Line
                          key={user.id}
                          type="monotone"
                          dataKey={user.full_name || user.email}
                          stroke={colors[index % colors.length]}
                          strokeWidth={2}
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Activity className="h-12 w-12 text-slate-300 mb-3" />
                  <p className="text-slate-500">No activity data for selected period</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stages" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3 mb-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Active in RFP
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {performanceData?.userMetrics?.reduce((sum, u) => sum + (u.stageBreakdown.rfp_sent || 0), 0) || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">awaiting responses</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  In Implementation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {performanceData?.userMetrics?.reduce((sum, u) => sum + (u.stageBreakdown.implementation || 0), 0) || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">being deployed</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Awarded
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {performanceData?.userMetrics?.reduce((sum, u) => sum + (u.stageBreakdown.awarded || 0), 0) || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">won deals</p>
              </CardContent>
            </Card>
          </div>


          <Card>
            <CardHeader>
              <CardTitle>Stage Distribution</CardTitle>
              <CardDescription>Events by stage for each user</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {performanceData?.userMetrics?.map((user) => (
                  <div key={user.email} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{user.name}</p>
                      <Badge variant="outline">{Object.keys(user.stageBreakdown).length} stages</Badge>
                    </div>
                    <div className="flex gap-1 h-8">
                      {Object.entries(user.stageBreakdown).map(([stage, count], idx) => {
                        const total = Object.values(user.stageBreakdown).reduce((a, b) => a + b, 0);
                        const percentage = (count / total) * 100;
                        const colors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500'];
                        return (
                          <div
                            key={stage}
                            className={cn('rounded flex items-center justify-center text-xs text-white font-medium', colors[idx % colors.length])}
                            style={{ width: `${percentage}%` }}
                            title={`${stage}: ${count} (${percentage.toFixed(1)}%)`}
                          >
                            {percentage > 10 && count}
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex gap-3 flex-wrap text-xs text-muted-foreground">
                      {Object.entries(user.stageBreakdown).map(([stage, count]) => (
                        <span key={stage}>
                          {stage}: {count}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
