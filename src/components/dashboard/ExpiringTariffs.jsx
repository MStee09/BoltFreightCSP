
import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Clock, ArrowRight, AlertTriangle } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "../../utils";
import { ensureArray } from "../utils";

export default function ExpiringTariffs({ tariffs, customers, carriers }) {
  const safeTariffs = ensureArray(tariffs);
  const safeCustomers = ensureArray(customers);
  const safeCarriers = ensureArray(carriers);

  const getDaysUntilExpiry = (expiryDate) => {
    return differenceInDays(new Date(expiryDate), new Date());
  };

  const getUrgencyColor = (days) => {
    if (days <= 30) return 'text-red-600 bg-red-50 border-red-200';
    if (days <= 60) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-amber-600 bg-amber-50 border-amber-200';
  };

  return (
    <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
      <CardHeader className="border-b border-slate-100 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            Expiring Tariffs (90 Days)
          </CardTitle>
          <Link to={createPageUrl("Tariffs")}>
            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {safeTariffs.length > 0 ? (
          <div className="space-y-3">
            {safeTariffs.slice(0, 6).map((tariff) => {
              const customer = tariff.customers || safeCustomers.find(c => c.id === tariff.customer_id);
              const carrier = tariff.carriers || safeCarriers.find(c => c.id === tariff.carrier_id);
              const daysLeft = getDaysUntilExpiry(tariff.expiry_date);

              const isBlanket = tariff.ownership_type === 'blanket' ||
                               tariff.ownership_type === 'rocket_blanket' ||
                               !tariff.customer_id;

              const displayName = isBlanket
                ? `${carrier?.name || 'Blanket'} - All Customers`
                : customer?.name || 'Unknown Customer';

              return (
                <div
                  key={tariff.id}
                  className="p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all bg-white"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900 mb-1">
                        {displayName}
                      </p>
                      <p className="text-sm text-slate-600">
                        {isBlanket ? 'Blanket Tariff' : carrier?.name || 'Unknown Carrier'} • {tariff.tariff_reference_id}
                      </p>
                    </div>
                    <Badge className={`${getUrgencyColor(daysLeft)} border font-semibold`}>
                      {daysLeft}d left
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">
                      Expires: {format(new Date(tariff.expiry_date), 'MMM d, yyyy')}
                    </span>
                    {daysLeft <= 30 && (
                      <span className="flex items-center gap-1 text-red-600 font-medium">
                        <AlertTriangle className="w-3 h-3" />
                        Urgent
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Clock className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-900 font-medium mb-1">No Expiring Tariffs</p>
            <p className="text-sm text-slate-500">All tariffs are valid for 90+ days</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
