import React, { useState, useEffect } from 'react';
import { AlertTriangle, Shield, Info } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { differenceInDays, format } from 'date-fns';
import { supabase } from '../../api/supabaseClient';

export const CarrierBlockerWarning = ({ customerId, selectedCarrierIds = [] }) => {
  const [blockedCarriers, setBlockedCarriers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBlockedCarriers = async () => {
      if (!customerId) {
        setLoading(false);
        return;
      }

      const { data: tariffs } = await supabase
        .from('tariffs')
        .select('id, tariff_reference_id, expiry_date, carrier_id, carriers(id, name, scac_code)')
        .eq('customer_id', customerId)
        .eq('ownership_type', 'customer_direct');

      if (tariffs) {
        const today = new Date();
        const blocked = tariffs
          .filter(t => t.carriers)
          .map(t => ({
            carrierId: t.carrier_id,
            carrierName: t.carriers.name,
            carrierScac: t.carriers.scac_code,
            tariffId: t.id,
            tariffRef: t.tariff_reference_id,
            expiryDate: t.expiry_date,
            daysUntilExpiry: t.expiry_date ? differenceInDays(new Date(t.expiry_date), today) : null
          }));

        setBlockedCarriers(blocked);
      }

      setLoading(false);
    };

    fetchBlockedCarriers();
  }, [customerId]);

  if (loading || blockedCarriers.length === 0) {
    return null;
  }

  const selectedBlockedCarriers = blockedCarriers.filter(bc =>
    selectedCarrierIds.includes(bc.carrierId)
  );

  const allBlockedCarriers = blockedCarriers;

  return (
    <div className="space-y-3">
      {selectedBlockedCarriers.length > 0 && (
        <Alert variant="destructive" className="border-red-300 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-semibold text-red-900">
                Warning: Conflict with Customer Direct Tariffs
              </p>
              <p className="text-sm text-red-800">
                The following selected carriers have active Customer Direct tariffs with this customer.
                Including them in this CSP may violate existing agreements:
              </p>
              <div className="space-y-1.5 mt-2">
                {selectedBlockedCarriers.map(bc => (
                  <div
                    key={bc.carrierId}
                    className="flex items-center justify-between p-2 bg-white border border-red-200 rounded text-sm"
                  >
                    <div>
                      <span className="font-semibold text-red-900">
                        {bc.carrierName} ({bc.carrierScac})
                      </span>
                      <div className="text-xs text-red-700 mt-0.5">
                        Active Tariff: {bc.tariffRef}
                      </div>
                    </div>
                    {bc.daysUntilExpiry !== null && bc.daysUntilExpiry > 0 && (
                      <Badge variant="outline" className="bg-red-100 border-red-300 text-red-800">
                        Expires in {bc.daysUntilExpiry}d
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {allBlockedCarriers.length > 0 && (
        <Alert className="border-amber-300 bg-amber-50">
          <Shield className="h-4 w-4 text-amber-600" />
          <AlertDescription>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-amber-900">
                  Do Not Pursue List ({allBlockedCarriers.length} carriers)
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3.5 h-3.5 text-amber-600 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">
                        These carriers have active Customer Direct tariffs. Avoid bidding to prevent
                        conflicts with existing customer-carrier relationships.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {allBlockedCarriers.map(bc => (
                  <TooltipProvider key={bc.carrierId}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge
                          variant="outline"
                          className={`cursor-help ${
                            selectedCarrierIds.includes(bc.carrierId)
                              ? 'bg-red-100 border-red-300 text-red-800'
                              : 'bg-white border-amber-300 text-amber-800'
                          }`}
                        >
                          {bc.carrierScac || bc.carrierName}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-xs space-y-1">
                          <div><strong>{bc.carrierName}</strong></div>
                          <div>Tariff: {bc.tariffRef}</div>
                          {bc.expiryDate && (
                            <div>
                              Expires: {format(new Date(bc.expiryDate), 'MMM dd, yyyy')}
                              {bc.daysUntilExpiry !== null && bc.daysUntilExpiry > 0 && (
                                <span> ({bc.daysUntilExpiry} days)</span>
                              )}
                            </div>
                          )}
                          {bc.daysUntilExpiry !== null && bc.daysUntilExpiry > 0 && bc.daysUntilExpiry <= 90 && (
                            <div className="text-orange-600 font-semibold">
                              Opportunity: Expiring soon
                            </div>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
              <p className="text-xs text-amber-700 mt-2">
                Consider these carriers for CSP outreach only when their direct tariffs expire.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
