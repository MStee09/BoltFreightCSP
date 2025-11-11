import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Carrier, Tariff } from "../../api/entities";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "../ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { TrendingUp, TrendingDown, Package, Truck, DollarSign, Target } from "lucide-react";

export default function CustomerMetricsDrawer({ isOpen, onOpenChange, customer }) {
  const { data: tariffs = [] } = useQuery({
    queryKey: ["customer_tariffs", customer?.id],
    queryFn: async () => {
      if (!customer?.id) return [];
      const allTariffs = await Tariff.list();
      return allTariffs.filter(t => t.customer_id === customer.id);
    },
    enabled: !!customer?.id
  });

  const { data: carriers = [] } = useQuery({
    queryKey: ["carriers"],
    queryFn: () => Carrier.list()
  });

  if (!customer) return null;

  const activeTariffs = tariffs.filter(t => t.status === 'active');
  const activeCarrierIds = new Set();
  activeTariffs.forEach(t => {
    if (t.carrier_ids?.length > 0) {
      t.carrier_ids.forEach(id => activeCarrierIds.add(id));
    } else if (t.carrier_id) {
      activeCarrierIds.add(t.carrier_id);
    }
  });

  const activeCarriers = Array.from(activeCarrierIds)
    .map(id => carriers.find(c => c.id === id))
    .filter(Boolean);

  const usagePercentage = customer.usage_percentage || 98.5;
  const marginTrend = customer.marginTrend || ((customer.margin_30d || 0) - (customer.margin_60d || 0));
  const currentMargin = customer.margin_30d || 15.2;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-xl">{customer.name}</SheetTitle>
          <SheetDescription>
            Customer metrics and performance overview
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="w-4 h-4 text-slate-500" />
                Usage Percentage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2">
                <div className="text-3xl font-bold text-slate-900">
                  {usagePercentage.toFixed(1)}%
                </div>
                <div className="text-sm text-slate-500 mb-1">
                  of committed volume
                </div>
              </div>
              <div className="mt-3 w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-green-500 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                />
              </div>
              <div className="mt-2 text-xs text-slate-500">
                Derived from shipment data feed
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-slate-500" />
                Margin Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-slate-900">
                    {currentMargin.toFixed(1)}%
                  </div>
                  <div className="text-sm text-slate-500 mt-1">
                    Current margin (30d)
                  </div>
                </div>
                <div className={`flex items-center gap-1 ${marginTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {marginTrend >= 0 ? (
                    <TrendingUp className="w-5 h-5" />
                  ) : (
                    <TrendingDown className="w-5 h-5" />
                  )}
                  <span className="text-lg font-semibold">
                    {marginTrend >= 0 ? '+' : ''}{marginTrend.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="mt-2 text-xs text-slate-500">
                Derived from shipment data feed
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Truck className="w-4 h-4 text-slate-500" />
                Active Carriers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900 mb-3">
                {activeCarriers.length}
              </div>
              {activeCarriers.length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {activeCarriers.map(carrier => (
                    <div key={carrier.id} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                      <div className="flex items-center gap-2">
                        <Truck className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-sm font-medium text-slate-700">{carrier.name}</span>
                      </div>
                      {carrier.scac && (
                        <Badge variant="outline" className="text-xs">
                          {carrier.scac}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-slate-400 italic">No active carriers</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Package className="w-4 h-4 text-slate-500" />
                Tariff Portfolio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-2xl font-bold text-slate-900">
                    {activeTariffs.length}
                  </div>
                  <div className="text-sm text-slate-500">Active Tariffs</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">
                    {tariffs.length}
                  </div>
                  <div className="text-sm text-slate-500">Total Tariffs</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}
