import React from 'react';
import { Clock, AlertCircle, TrendingUp, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { format, differenceInDays, differenceInMonths } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { assessRiskLevel } from '../../utils/tariffComparisonEngine';

export const CustomerDirectTimeline = ({ tariffs = [], carriers = [] }) => {
  const today = new Date();

  const customerDirectTariffs = tariffs
    .filter(t => t.ownership_type === 'customer_direct')
    .map(t => {
      const carrier = carriers.find(c => c.id === t.carrier_id);
      const risk = assessRiskLevel(t);

      return {
        ...t,
        carrier,
        risk,
        daysUntilExpiry: t.expiry_date ? differenceInDays(new Date(t.expiry_date), today) : null,
        ageInMonths: t.effective_date ? differenceInMonths(today, new Date(t.effective_date)) : null
      };
    })
    .sort((a, b) => {
      if (!a.expiry_date) return 1;
      if (!b.expiry_date) return -1;
      return new Date(a.expiry_date) - new Date(b.expiry_date);
    });

  if (customerDirectTariffs.length === 0) {
    return null;
  }

  const getRiskColor = (level) => {
    switch (level) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  const getRiskIcon = (level) => {
    switch (level) {
      case 'critical':
        return XCircle;
      case 'high':
      case 'medium':
        return AlertCircle;
      case 'low':
        return Clock;
      default:
        return CheckCircle;
    }
  };

  const getCompetitiveStrength = (tariff) => {
    if (tariff.ai_competitive_strength) {
      return tariff.ai_competitive_strength;
    }

    if (tariff.ageInMonths && tariff.ageInMonths > 24) {
      return 'weak';
    } else if (tariff.ageInMonths && tariff.ageInMonths > 12) {
      return 'moderate';
    }

    return 'unknown';
  };

  const getStrengthBadge = (strength) => {
    switch (strength) {
      case 'strong':
        return <Badge variant="outline" className="bg-green-50 border-green-300 text-green-700">Strong</Badge>;
      case 'moderate':
        return <Badge variant="outline" className="bg-yellow-50 border-yellow-300 text-yellow-700">Moderate</Badge>;
      case 'weak':
        return <Badge variant="outline" className="bg-red-50 border-red-300 text-red-700">Weak</Badge>;
      default:
        return <Badge variant="outline" className="bg-slate-50 border-slate-300 text-slate-600">Unknown</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Customer Direct Tariff Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {customerDirectTariffs.map((tariff, index) => {
            const RiskIcon = getRiskIcon(tariff.risk.level);
            const riskColor = getRiskColor(tariff.risk.level);
            const strength = getCompetitiveStrength(tariff);

            return (
              <Link
                key={tariff.id}
                to={createPageUrl(`TariffDetail?id=${tariff.id}`)}
                className="block"
              >
                <div className={`p-3 rounded-lg border ${riskColor} hover:shadow-md transition-shadow`}>
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${riskColor.replace('text-', 'bg-').replace('bg-', 'bg-').replace('-50', '-100')}`}>
                      <RiskIcon className={`w-4 h-4 ${riskColor.split(' ')[0]}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div>
                          <div className="font-semibold text-slate-900 text-sm">
                            {tariff.carrier?.name || 'Unknown Carrier'}
                          </div>
                          <div className="text-xs text-slate-600">
                            {tariff.tariff_reference_id}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {getStrengthBadge(strength)}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge
                                  variant={tariff.risk.level === 'critical' || tariff.risk.level === 'high' ? 'destructive' : 'secondary'}
                                >
                                  {tariff.daysUntilExpiry !== null && tariff.daysUntilExpiry >= 0
                                    ? `${tariff.daysUntilExpiry}d`
                                    : 'Expired'}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="text-xs space-y-1">
                                  <div><strong>Risk Level:</strong> {tariff.risk.level}</div>
                                  <div>{tariff.risk.message}</div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                        {tariff.effective_date && (
                          <div>
                            <span className="text-slate-500">Effective: </span>
                            <span className="text-slate-700 font-medium">
                              {format(new Date(tariff.effective_date), 'MMM dd, yyyy')}
                            </span>
                          </div>
                        )}
                        {tariff.expiry_date && (
                          <div>
                            <span className="text-slate-500">Expires: </span>
                            <span className="text-slate-700 font-medium">
                              {format(new Date(tariff.expiry_date), 'MMM dd, yyyy')}
                            </span>
                          </div>
                        )}
                        {tariff.ageInMonths !== null && (
                          <div>
                            <span className="text-slate-500">Age: </span>
                            <span className="text-slate-700 font-medium">
                              {tariff.ageInMonths} month{tariff.ageInMonths === 1 ? '' : 's'}
                            </span>
                          </div>
                        )}
                      </div>

                      {tariff.ai_opportunity_flags && tariff.ai_opportunity_flags.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-current border-opacity-20">
                          <div className="flex items-center gap-1.5">
                            <TrendingUp className="w-3 h-3" />
                            <span className="text-xs font-semibold">Opportunities:</span>
                          </div>
                          <div className="text-xs mt-1 space-y-0.5">
                            {tariff.ai_opportunity_flags.slice(0, 2).map((flag, idx) => (
                              <div key={idx} className="flex items-start gap-1">
                                <span className="opacity-50">•</span>
                                <span>{flag}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {(tariff.daysUntilExpiry !== null && tariff.daysUntilExpiry > 0 && tariff.daysUntilExpiry <= 90) && (
                        <div className={`mt-2 pt-2 border-t ${riskColor} border-opacity-20`}>
                          <p className="text-xs font-medium">
                            ✓ Plan CSP outreach before expiration
                          </p>
                        </div>
                      )}

                      {tariff.ai_risk_awareness && (
                        <div className={`mt-2 pt-2 border-t ${riskColor} border-opacity-20`}>
                          <div className="flex items-start gap-1.5">
                            <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                            <p className="text-xs">{tariff.ai_risk_awareness}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-200">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>{customerDirectTariffs.length} Customer Direct tariff{customerDirectTariffs.length === 1 ? '' : 's'}</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Sorted by expiration date
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
