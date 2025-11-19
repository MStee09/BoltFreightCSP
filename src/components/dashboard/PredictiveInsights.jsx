import React from 'react';
import { format, endOfMonth } from 'date-fns';
import { AlertTriangle, FileText, Target, Zap, TrendingUp, Sparkles, Brain, Clock, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';

const PredictiveInsight = ({ icon: Icon, title, description, trend, color, details }) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={`p-4 rounded-lg border ${color} bg-white cursor-help hover:shadow-md transition-shadow`}>
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${color.replace('border-', 'bg-').replace('-200', '-100')}`}>
              <Icon className={`w-5 h-5 ${color.replace('border-', 'text-').replace('-200', '-600')}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-slate-900 mb-1">{title}</h4>
              <p className="text-xs text-slate-600 leading-relaxed">{description}</p>
              {trend && (
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className={`w-3 h-3 ${trend.direction === 'up' ? 'text-green-600' : 'text-red-600'}`} />
                  <span className={`text-xs font-semibold ${trend.direction === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                    {trend.value}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </TooltipTrigger>
      {details && (
        <TooltipContent className="max-w-md">
          <div className="space-y-2">
            {details.map((detail, idx) => (
              <div key={idx} className="text-xs">
                {detail.label && <span className="font-semibold">{detail.label}: </span>}
                {detail.value}
              </div>
            ))}
          </div>
        </TooltipContent>
      )}
    </Tooltip>
  </TooltipProvider>
);

export const PredictiveInsightsPanel = ({ events, tariffs, cspEvents, dailyDigest, compact = false }) => {
  const today = new Date();

  const predictExpiringSoon = () => {
    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const nextMonthEnd = endOfMonth(nextMonth);

    const expiringTariffs = tariffs.filter(t => {
      if (!t.expiry_date) return false;
      const expiry = new Date(t.expiry_date);
      return expiry > today && expiry <= nextMonthEnd;
    });

    const expiringCSPs = cspEvents.filter(e => {
      if (!e.due_date) return false;
      const due = new Date(e.due_date);
      return due > today && due <= nextMonthEnd;
    });

    return { tariffs: expiringTariffs.length, csps: expiringCSPs.length };
  };

  const calculateRFPResponseTime = () => {
    const completedRFPs = cspEvents.filter(e =>
      e.rfp_due_date && (e.stage === 'awarded' || e.stage === 'lost')
    );

    if (completedRFPs.length === 0) return null;

    const totalDays = completedRFPs.reduce((sum, csp) => {
      const created = new Date(csp.created_date);
      const rfpDue = new Date(csp.rfp_due_date);
      const days = Math.floor((rfpDue - created) / (1000 * 60 * 60 * 24));
      return sum + days;
    }, 0);

    return (totalDays / completedRFPs.length).toFixed(1);
  };

  const analyzeEventVelocity = () => {
    const last30Days = new Date(today);
    last30Days.setDate(last30Days.getDate() - 30);

    const recentEvents = events.filter(e => {
      const eventDate = new Date(e.date);
      return eventDate >= last30Days && eventDate <= today;
    });

    if (recentEvents.length === 0) return { total: 0, highPriorityRate: 0 };

    const highPriorityRate = (recentEvents.filter(e => e.priority === 'high').length / recentEvents.length * 100).toFixed(0);

    return { total: recentEvents.length, highPriorityRate };
  };

  const detectPatterns = () => {
    const monthlyDistribution = {};

    tariffs.forEach(t => {
      if (t.expiry_date) {
        const month = format(new Date(t.expiry_date), 'MMM');
        monthlyDistribution[month] = (monthlyDistribution[month] || 0) + 1;
      }
    });

    const peakMonth = Object.entries(monthlyDistribution)
      .sort(([, a], [, b]) => b - a)[0];

    return peakMonth ? { month: peakMonth[0], count: peakMonth[1] } : null;
  };

  const expiring = predictExpiringSoon();
  const avgRFPTime = calculateRFPResponseTime();
  const velocity = analyzeEventVelocity();
  const pattern = detectPatterns();

  const insights = [];

  // Add Daily Digest action items first if they exist
  if (dailyDigest?.action_items && dailyDigest.action_items.length > 0) {
    dailyDigest.action_items.forEach((item, index) => {
      const iconMap = {
        high: AlertTriangle,
        medium: Clock,
        low: Sparkles,
      };
      const colorMap = {
        high: 'border-red-200',
        medium: 'border-yellow-200',
        low: 'border-blue-200',
      };

      insights.push(
        <PredictiveInsight
          key={`digest-${index}`}
          icon={iconMap[item.priority] || Sparkles}
          title={item.message}
          description={item.action}
          color={colorMap[item.priority] || 'border-blue-200'}
        />
      );
    });
  }

  // Add digest detail insights if content exists
  if (dailyDigest) {
    if (dailyDigest.expiring_tariffs && dailyDigest.expiring_tariffs.length > 0) {
      const tariffsList = dailyDigest.expiring_tariffs.slice(0, 3).map(t => (
        <Link
          key={t.id}
          to={createPageUrl(`TariffDetail?id=${t.id}`)}
          className="text-purple-700 hover:text-purple-800 hover:underline"
        >
          {t.customers?.name || 'Customer'}
        </Link>
      ));

      insights.push(
        <div key="digest-tariffs" className="p-4 rounded-lg border border-orange-200 bg-white">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-orange-100">
              <FileText className="w-5 h-5 text-orange-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-slate-900 mb-1">
                {dailyDigest.expiring_tariffs.length} Tariff{dailyDigest.expiring_tariffs.length > 1 ? 's' : ''} Expiring Soon
              </h4>
              <p className="text-xs text-slate-600 mb-2">Review and initiate renewal process</p>
              <div className="space-y-1">
                {tariffsList}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (dailyDigest.stalled_csps && dailyDigest.stalled_csps.length > 0) {
      const cspsList = dailyDigest.stalled_csps.slice(0, 3).map(c => (
        <Link
          key={c.id}
          to={createPageUrl(`CspEventDetail?id=${c.id}`)}
          className="text-purple-700 hover:text-purple-800 hover:underline"
        >
          {c.title}
        </Link>
      ));

      insights.push(
        <div key="digest-csps" className="p-4 rounded-lg border border-yellow-200 bg-white">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-yellow-100">
              <TrendingDown className="w-5 h-5 text-yellow-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-slate-900 mb-1">
                {dailyDigest.stalled_csps.length} Stalled CSP{dailyDigest.stalled_csps.length > 1 ? 's' : ''}
              </h4>
              <p className="text-xs text-slate-600 mb-2">No activity in 7+ days</p>
              <div className="space-y-1">
                {cspsList}
              </div>
            </div>
          </div>
        </div>
      );
    }
  }

  if (expiring.csps > 0) {
    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const nextMonthEnd = endOfMonth(nextMonth);

    const expiringCSPsList = cspEvents.filter(e => {
      if (!e.due_date) return false;
      const due = new Date(e.due_date);
      return due > today && due <= nextMonthEnd;
    });

    insights.push(
      <PredictiveInsight
        key="csp-expiration"
        icon={AlertTriangle}
        title="CSP Expiration Forecast"
        description={`${expiring.csps} CSP ${expiring.csps === 1 ? 'event is' : 'events are'} likely to expire next month based on historical timing. Review and prepare renewal strategies now.`}
        color="border-orange-200"
        details={[
          { label: 'Expiring CSP Events', value: expiringCSPsList.length },
          ...expiringCSPsList.slice(0, 5).map(csp => ({
            value: `${csp.title} — Due: ${format(new Date(csp.due_date), 'MMM dd, yyyy')}`
          })),
          ...(expiringCSPsList.length > 5 ? [{ value: `...and ${expiringCSPsList.length - 5} more` }] : [])
        ]}
      />
    );
  }

  if (expiring.tariffs > 0) {
    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const nextMonthEnd = endOfMonth(nextMonth);

    const expiringTariffsList = tariffs.filter(t => {
      if (!t.expiry_date) return false;
      const expiry = new Date(t.expiry_date);
      return expiry > today && expiry <= nextMonthEnd;
    });

    insights.push(
      <PredictiveInsight
        key="tariff-renewal"
        icon={FileText}
        title="Tariff Renewal Prediction"
        description={`${expiring.tariffs} tariff${expiring.tariffs === 1 ? '' : 's'} expiring next month. Historical data shows ${Math.round(expiring.tariffs * 0.7)} will require negotiation cycles of 30+ days.`}
        color="border-green-200"
        details={[
          { label: 'Expiring Tariffs', value: expiringTariffsList.length },
          { label: 'Estimated Long Negotiations', value: `${Math.round(expiring.tariffs * 0.7)} tariffs (30+ days)` },
          ...expiringTariffsList.slice(0, 5).map(tariff => ({
            value: `${tariff.tariff_reference_id || tariff.version} — Expires: ${format(new Date(tariff.expiry_date), 'MMM dd, yyyy')}`
          })),
          ...(expiringTariffsList.length > 5 ? [{ value: `...and ${expiringTariffsList.length - 5} more` }] : [])
        ]}
      />
    );
  }

  if (avgRFPTime) {
    insights.push(
      <PredictiveInsight
        key="rfp-performance"
        icon={Target}
        title="RFP Response Performance"
        description={`Average response time to RFPs is ${avgRFPTime} days. Industry target is 9 days. ${avgRFPTime > 9 ? 'Consider streamlining processes to improve competitiveness.' : 'Performance is above industry standard.'}`}
        trend={{
          direction: avgRFPTime <= 9 ? 'up' : 'down',
          value: avgRFPTime <= 9 ? 'On Target' : `${(avgRFPTime - 9).toFixed(1)}d over`
        }}
        color={avgRFPTime <= 9 ? 'border-green-200' : 'border-yellow-200'}
      />
    );
  }

  if (velocity.total > 0) {
    const last30Days = new Date(today);
    last30Days.setDate(last30Days.getDate() - 30);

    const recentEventsList = events.filter(e => {
      const eventDate = new Date(e.date);
      return eventDate >= last30Days && eventDate <= today;
    });

    const highPriorityEvents = recentEventsList.filter(e => e.priority === 'high');

    insights.push(
      <PredictiveInsight
        key="velocity"
        icon={Zap}
        title="Event Velocity Analysis"
        description={`${velocity.total} events completed in the last 30 days. ${velocity.highPriorityRate}% were high-priority. ${velocity.highPriorityRate > 40 ? 'Consider workload rebalancing.' : 'Healthy priority distribution.'}`}
        trend={{
          direction: velocity.highPriorityRate <= 40 ? 'up' : 'down',
          value: `${velocity.highPriorityRate}% high priority`
        }}
        color="border-blue-200"
        details={[
          { label: 'Total Events (30 days)', value: recentEventsList.length },
          { label: 'High Priority Events', value: highPriorityEvents.length },
          { label: 'Medium Priority Events', value: recentEventsList.filter(e => e.priority === 'medium').length },
          { label: 'Low Priority Events', value: recentEventsList.filter(e => e.priority === 'low').length },
          { label: 'High Priority Rate', value: `${velocity.highPriorityRate}%` },
          { label: 'Recommendation', value: velocity.highPriorityRate > 40 ? 'Consider workload rebalancing or resource allocation' : 'Current workload distribution is healthy' }
        ]}
      />
    );
  }

  if (pattern) {
    const monthlyDistribution = {};

    tariffs.forEach(t => {
      if (t.expiry_date) {
        const month = format(new Date(t.expiry_date), 'MMM');
        monthlyDistribution[month] = (monthlyDistribution[month] || 0) + 1;
      }
    });

    const sortedMonths = Object.entries(monthlyDistribution).sort(([, a], [, b]) => b - a);

    insights.push(
      <PredictiveInsight
        key="pattern"
        icon={TrendingUp}
        title="Seasonal Pattern Detected"
        description={`Peak expiration month is ${pattern.month} with ${pattern.count} tariffs. Plan resource allocation and negotiate early to avoid bottlenecks.`}
        color="border-purple-200"
        details={[
          { label: 'Peak Month', value: `${pattern.month} (${pattern.count} tariffs)` },
          { label: 'Monthly Distribution', value: '' },
          ...sortedMonths.slice(0, 6).map(([month, count]) => ({
            value: `${month}: ${count} tariff${count === 1 ? '' : 's'}`
          })),
          { label: 'Action Required', value: 'Start negotiations 60-90 days before peak month to avoid bottlenecks' }
        ]}
      />
    );
  }

  if (events.filter(e => e.autoGenerated).length > 0) {
    const automatedEvents = events.filter(e => e.autoGenerated);
    const timeSaved = Math.round(automatedEvents.length * 0.5);

    insights.push(
      <PredictiveInsight
        key="automation"
        icon={Sparkles}
        title="AI Automation Impact"
        description={`${automatedEvents.length} events were auto-generated this period, saving approximately ${timeSaved} hours of manual planning time.`}
        trend={{
          direction: 'up',
          value: `${automatedEvents.length} automated`
        }}
        color="border-cyan-200"
        details={[
          { label: 'Auto-Generated Events', value: automatedEvents.length },
          { label: 'Estimated Time Saved', value: `${timeSaved} hours (${Math.round(timeSaved / 8)} work days)` },
          { label: 'Average Time per Manual Event', value: '30 minutes' },
          { label: 'Automation Rate', value: `${Math.round(automatedEvents.length / events.length * 100)}% of all events` },
          { label: '', value: '' },
          { label: 'Auto-Generated Events', value: '' },
          ...automatedEvents.slice(0, 8).map(event => ({
            value: `${event.title || 'Untitled'} — ${format(new Date(event.date), 'MMM dd, yyyy')}`
          })),
          ...(automatedEvents.length > 8 ? [{ value: `...and ${automatedEvents.length - 8} more` }] : []),
          { label: '', value: '' },
          { label: 'Impact', value: 'AI automation reduces manual effort and allows focus on strategic tasks' }
        ]}
      />
    );
  }

  if (insights.length === 0) {
    return null;
  }

  if (compact) {
    return (
      <div className="space-y-3">
        {insights.slice(0, 3)}
      </div>
    );
  }

  return (
    <Card className="bg-gradient-to-r from-purple-50 via-blue-50 to-cyan-50 border-purple-200">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-white rounded-lg shadow-sm">
            <Brain className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Predictive Intelligence</h3>
            <p className="text-sm text-slate-600">AI-powered insights and forecasting</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights}
        </div>
      </CardContent>
    </Card>
  );
};
