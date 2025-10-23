import { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Sparkles, AlertCircle, TrendingUp, Clock, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../../api/supabaseClient';

export default function DailyFocusBanner({ alerts, expiringTariffs, idleNegotiations, todayTasks, customers, cspEvents }) {
  const [aiSummary, setAiSummary] = useState('');
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
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
      text: `${alerts.length} active alert${alerts.length > 1 ? 's' : ''} requiring attention`,
      color: 'text-red-600',
    });
  }

  if (todayTasks.length > 0) {
    priorities.push({
      icon: Clock,
      text: `${todayTasks.length} task${todayTasks.length > 1 ? 's' : ''} due today`,
      color: 'text-orange-600',
    });
  }

  if (idleNegotiations.length > 0) {
    priorities.push({
      icon: TrendingUp,
      text: `${idleNegotiations.length} negotiation${idleNegotiations.length > 1 ? 's' : ''} need follow-up`,
      color: 'text-blue-600',
    });
  }

  if (expiringTariffs.length > 0) {
    priorities.push({
      icon: Clock,
      text: `${expiringTariffs.length} tariff${expiringTariffs.length > 1 ? 's' : ''} expiring soon`,
      color: 'text-amber-600',
    });
  }

  if (priorities.length === 0) {
    priorities.push({
      icon: Sparkles,
      text: "All caught up! No urgent items today",
      color: 'text-green-600',
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
      setAiSummary(data.response || '');
    } catch (error) {
      console.error('Error generating AI summary:', error);
      setAiSummary('');
    } finally {
      setIsLoadingSummary(false);
    }
  };

  return (
    <Card className="shadow-lg border-0 bg-gradient-to-r from-blue-50 to-indigo-50 mb-4">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-semibold text-slate-900">
                {greeting()}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={generateAISummary}
                disabled={isLoadingSummary}
                className="h-7 px-2"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSummary ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {aiSummary && (
              <p className="text-sm text-slate-700 mb-3 italic">
                {aiSummary}
              </p>
            )}

            <div className="space-y-1.5">
              {priorities.slice(0, 3).map((priority, idx) => {
                const Icon = priority.icon;
                return (
                  <div key={idx} className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${priority.color}`} />
                    <span className="text-sm text-slate-700">{priority.text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
