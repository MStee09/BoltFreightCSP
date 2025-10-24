import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Sparkles, AlertCircle, TrendingUp, Clock, RefreshCw, CheckCircle2, Users, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../../api/supabaseClient';

export default function DailyFocusBanner({ alerts, expiringTariffs, idleNegotiations, todayTasks, customers, cspEvents }) {
  const [aiSummary, setAiSummary] = useState('');
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const hasGeneratedToday = useRef(false);
  const todayDate = format(new Date(), 'yyyy-MM-dd');

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const priorities = [];

  if (alerts.length > 0) {
    priorities.push({
      icon: AlertCircle,
      title: 'Active Alerts',
      count: alerts.length,
      description: 'require immediate attention',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
    });
  }

  if (todayTasks.length > 0) {
    priorities.push({
      icon: CheckCircle2,
      title: 'Tasks Due',
      count: todayTasks.length,
      description: 'scheduled for today',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
    });
  }

  if (idleNegotiations.length > 0) {
    priorities.push({
      icon: TrendingUp,
      title: 'Follow-ups Needed',
      count: idleNegotiations.length,
      description: 'negotiations awaiting response',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    });
  }

  if (expiringTariffs.length > 0) {
    priorities.push({
      icon: Clock,
      title: 'Expiring Soon',
      count: expiringTariffs.length,
      description: 'tariffs need renewal',
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
    });
  }

  const generateAISummary = async () => {
    setIsLoadingSummary(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const context = {
        expiringTariffsCount: expiringTariffs.length,
        expiringTariffs: expiringTariffs.slice(0, 2).map(t => ({
          customer: customers.find(c => c.id === t.customer_id)?.name,
          daysUntilExpiry: Math.floor((new Date(t.expiry_date) - new Date()) / (1000 * 60 * 60 * 24))
        })),
        idleNegotiationsCount: idleNegotiations.length,
        idleNegotiations: idleNegotiations.slice(0, 2).map(n => ({
          customer: customers.find(c => c.id === n.customer_id)?.name,
          stage: n.stage,
          daysInStage: n.days_in_stage
        })),
        upcomingRfps: cspEvents.filter(e => e.stage === 'rfp_sent').length,
        alertsCount: alerts.length,
        todayTasksCount: todayTasks.length,
      };

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dashboard-chat`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Generate a brief executive summary (1-2 sentences) based on this data: ${JSON.stringify(context)}. Focus on the most urgent items and suggest which customer to check first. Be concise and actionable.`,
          conversationHistory: [],
        }),
      });

      if (!response.ok) throw new Error('Failed to generate summary');

      const data = await response.json();
      const summary = data.response || '';
      setAiSummary(summary);

      // Store summary in localStorage with today's date
      localStorage.setItem('dailyAISummary', JSON.stringify({
        date: todayDate,
        summary: summary
      }));

      hasGeneratedToday.current = true;
    } catch (error) {
      console.error('Error generating AI summary:', error);
      setAiSummary('');
    } finally {
      setIsLoadingSummary(false);
    }
  };

  // Auto-generate summary on dashboard load (once per day)
  useEffect(() => {
    if (hasGeneratedToday.current) return;

    // Check if we already have a summary for today
    const stored = localStorage.getItem('dailyAISummary');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.date === todayDate && parsed.summary) {
          setAiSummary(parsed.summary);
          hasGeneratedToday.current = true;
          return;
        }
      } catch (e) {
        // Invalid stored data, clear it
        localStorage.removeItem('dailyAISummary');
      }
    }

    // Only generate if we have data to work with
    if (customers.length > 0 && !hasGeneratedToday.current) {
      generateAISummary();
    }
  }, [customers, todayDate]);

  return (
    <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 mb-6 overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {greeting()}
              </h2>
              <p className="text-sm text-slate-600">
                {format(new Date(), 'EEEE, MMMM d, yyyy')}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={generateAISummary}
            disabled={isLoadingSummary}
            className="h-9 px-3 hover:bg-white/50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingSummary ? 'animate-spin' : ''}`} />
            <span className="text-sm">AI Summary</span>
          </Button>
        </div>

        {aiSummary && (
          <div className="mb-5 p-4 bg-white/60 backdrop-blur rounded-lg border border-blue-200/50">
            <p className="text-sm text-slate-700 leading-relaxed">
              {aiSummary}
            </p>
          </div>
        )}

        {priorities.length > 0 ? (
          <>
            <h3 className="text-sm font-semibold text-slate-900 mb-3 uppercase tracking-wide">
              Today's Key Focus Areas
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {priorities.map((priority, idx) => {
                const Icon = priority.icon;
                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg border-l-4 ${priority.borderColor} bg-white/80 backdrop-blur hover:bg-white transition-all hover:shadow-md`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${priority.bgColor}`}>
                        <Icon className={`w-5 h-5 ${priority.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-slate-900">
                            {priority.title}
                          </p>
                          <Badge variant="secondary" className="h-5 px-1.5 text-xs font-bold">
                            {priority.count}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {priority.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-3">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">
              All Caught Up!
            </h3>
            <p className="text-sm text-slate-600">
              No urgent items today. Great job staying on top of things.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
