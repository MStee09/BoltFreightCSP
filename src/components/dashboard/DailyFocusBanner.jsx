import { Card, CardContent } from '../ui/card';
import { Sparkles, AlertCircle, TrendingUp, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function DailyFocusBanner({ alerts, expiringTariffs, idleNegotiations, todayTasks }) {
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
            <h2 className="text-lg font-semibold text-slate-900 mb-1">
              {greeting()} - Here's what to focus on today:
            </h2>
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
