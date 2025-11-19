import React, { useState, useEffect } from 'react';
import { Brain, Shield, Target, AlertTriangle, TrendingUp, Clock, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { format, differenceInDays, addDays } from 'date-fns';
import { supabase } from '../../api/supabaseClient';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';

export const AICarrierStrategyPanel = ({ customerId, tariffs = [] }) => {
  const [carriers, setCarriers] = useState([]);
  const [cspEvents, setCspEvents] = useState([]);
  const today = new Date();

  useEffect(() => {
    const fetchData = async () => {
      const [carriersRes, cspRes] = await Promise.all([
        supabase.from('carriers').select('*'),
        supabase.from('csp_events').select('*').eq('customer_id', customerId)
      ]);

      if (carriersRes.data) setCarriers(carriersRes.data);
      if (cspRes.data) setCspEvents(cspRes.data);
    };

    fetchData();
  }, [customerId]);

  const customerDirectTariffs = tariffs.filter(t => t.ownership_type === 'customer_direct');
  const blanketTariffs = tariffs.filter(t => t.ownership_type === 'blanket');
  const rocketTariffs = tariffs.filter(t => t.ownership_type === 'rocket_csp' || t.ownership_type === 'rocket_blanket');

  const recentCsps = cspEvents.filter(e => {
    const created = new Date(e.created_date);
    const daysSince = differenceInDays(today, created);
    return daysSince <= 365;
  });

  const blockedCarriers = customerDirectTariffs
    .map(t => carriers.find(c => c.id === t.carrier_id))
    .filter(Boolean);

  const expiringDirect = customerDirectTariffs
    .filter(t => {
      if (!t.expiry_date) return false;
      const expiry = new Date(t.expiry_date);
      const daysUntil = differenceInDays(expiry, today);
      return daysUntil > 0 && daysUntil <= 90;
    })
    .sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date));

  const availableCarriers = carriers.filter(c =>
    !blockedCarriers.some(bc => bc.id === c.id)
  );

  const getRecommendedTargets = () => {
    const targetCarriers = availableCarriers
      .filter(c => c.carrier_type !== 'brokerage')
      .slice(0, 5);

    return targetCarriers;
  };

  const recommendedTargets = getRecommendedTargets();

  const getComparisonInsight = () => {
    if (blanketTariffs.length === 0 || customerDirectTariffs.length === 0) return null;

    const totalLanes = customerDirectTariffs.length;
    const blanketCoverage = Math.round(blanketTariffs.length / totalLanes * 100);

    return {
      blanketWins: blanketCoverage,
      directWins: 100 - blanketCoverage,
      totalLanes
    };
  };

  const comparisonInsight = getComparisonInsight();

  if (customerDirectTariffs.length === 0 && blanketTariffs.length === 0) {
    return null;
  }

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Brain className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <CardTitle className="text-base">AI Carrier Strategy Intelligence</CardTitle>
            <p className="text-xs text-slate-600 mt-1">Internal strategic insights and carrier targeting</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-3 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-semibold text-slate-700">Customer Direct</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">{customerDirectTariffs.length}</div>
            <div className="text-xs text-slate-600">Active tariffs</div>
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-xs font-semibold text-slate-700">Blanket Programs</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">{blanketTariffs.length}</div>
            <div className="text-xs text-slate-600">Enabled blankets</div>
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-semibold text-slate-700">CSP Events</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">{recentCsps.length}</div>
            <div className="text-xs text-slate-600">Last 12 months</div>
          </div>
        </div>

        {blockedCarriers.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-red-900 mb-1">Do Not Pursue Carriers</h4>
                <p className="text-xs text-red-700 mb-2">
                  These carriers have active Customer Direct tariffs. Avoid bidding to prevent conflicts.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {blockedCarriers.map(carrier => {
                    const tariff = customerDirectTariffs.find(t => t.carrier_id === carrier.id);
                    const expiryDays = tariff?.expiry_date
                      ? differenceInDays(new Date(tariff.expiry_date), today)
                      : null;

                    return (
                      <TooltipProvider key={carrier.id}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="destructive" className="cursor-help">
                              {carrier.scac_code || carrier.name}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-xs space-y-1">
                              <div><strong>{carrier.name}</strong></div>
                              <div>Tariff: {tariff?.tariff_reference_id || 'Unknown'}</div>
                              {expiryDays !== null && (
                                <div>Expires in: {expiryDays} days</div>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {expiringDirect.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-orange-900 mb-1">
                  Expiring Direct Tariffs ({expiringDirect.length})
                </h4>
                <p className="text-xs text-orange-700 mb-2">
                  Plan CSP outreach before these expire
                </p>
                <div className="space-y-1.5">
                  {expiringDirect.slice(0, 3).map(tariff => {
                    const carrier = carriers.find(c => c.id === tariff.carrier_id);
                    const daysUntil = differenceInDays(new Date(tariff.expiry_date), today);

                    return (
                      <Link
                        key={tariff.id}
                        to={createPageUrl(`TariffDetail?id=${tariff.id}`)}
                        className="flex items-center justify-between p-2 bg-white rounded border border-orange-200 hover:border-orange-300 transition-colors text-xs"
                      >
                        <span className="font-medium text-slate-900">
                          {carrier?.name || 'Unknown'} - {tariff.tariff_reference_id}
                        </span>
                        <Badge variant={daysUntil <= 30 ? 'destructive' : 'secondary'}>
                          {daysUntil}d
                        </Badge>
                      </Link>
                    );
                  })}
                  {expiringDirect.length > 3 && (
                    <div className="text-xs text-orange-700 pt-1">
                      +{expiringDirect.length - 3} more expiring soon
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {recommendedTargets.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Target className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-green-900 mb-1">Recommended CSP Targets</h4>
                <p className="text-xs text-green-700 mb-2">
                  Best fit carriers for next CSP event
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {recommendedTargets.map(carrier => (
                    <TooltipProvider key={carrier.id}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className="bg-white border-green-300 text-green-700 cursor-help">
                            {carrier.scac_code || carrier.name}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-xs">
                            <div><strong>{carrier.name}</strong></div>
                            <div className="text-slate-600">{carrier.carrier_type}</div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {comparisonInsight && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-blue-900 mb-1">Blanket vs Direct Analysis</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-blue-700">Blanket Coverage</span>
                        <span className="font-semibold text-blue-900">{comparisonInsight.blanketWins}%</span>
                      </div>
                      <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{ width: `${comparisonInsight.blanketWins}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-blue-700">
                    {comparisonInsight.blanketWins >= 50
                      ? `Strong blanket adoption. Consider expanding coverage.`
                      : `Opportunity to increase blanket utilization.`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-1.5 pt-2 border-t border-slate-200">
          <AlertTriangle className="w-3 h-3 text-amber-600" />
          <p className="text-xs text-slate-600">
            Internal intelligence only - not customer-facing
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
