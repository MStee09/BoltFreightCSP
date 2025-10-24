import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Tariff, Carrier } from '../../api/entities';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { ChevronRight, ExternalLink } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { createPageUrl } from '../../utils';

const CustomerTariffTimeline = ({ customerId }) => {
    const [showHistory, setShowHistory] = useState(false);
    const { data: tariffs = [], isLoading: isLoadingTariffs } = useQuery({
        queryKey: ['tariffs', { forCustomer: customerId }],
        queryFn: () => Tariff.filter({ customer_id: customerId }),
        enabled: !!customerId,
        initialData: []
    });
    const { data: carriers = [], isLoading: isLoadingCarriers } = useQuery({
        queryKey: ['carriers'],
        queryFn: () => Carrier.list(),
        initialData: []
    });

    if (isLoadingTariffs || isLoadingCarriers) {
        return <div className="space-y-2 mt-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>;
    }

    if (tariffs.length === 0) {
        return <div className="py-8 text-center text-slate-500 border border-dashed rounded-lg mt-4">No tariffs found for this customer.</div>;
    }

    const today = new Date();
    const liveTariffs = tariffs.filter(t => {
        const expiryDate = t.expiry_date ? new Date(t.expiry_date) : null;
        const daysUntilExpiry = expiryDate ? differenceInDays(expiryDate, today) : null;
        return t.status === 'active' || t.status === 'proposed' ||
               (expiryDate && daysUntilExpiry !== null && daysUntilExpiry <= 90 && daysUntilExpiry > 0);
    });

    const historyTariffs = tariffs.filter(t => {
        const expiryDate = t.expiry_date ? new Date(t.expiry_date) : null;
        const daysUntilExpiry = expiryDate ? differenceInDays(expiryDate, today) : null;
        const isLive = t.status === 'active' || t.status === 'proposed' ||
                      (expiryDate && daysUntilExpiry !== null && daysUntilExpiry <= 90 && daysUntilExpiry > 0);
        return !isLive;
    });

    const renderTariff = (tariff) => {
        const carrierIds = tariff.carrier_ids || [];
        const firstCarrier = carriers.find(c => carrierIds.includes(c.id));
        const expiryDate = tariff.expiry_date ? new Date(tariff.expiry_date) : null;
        const daysUntilExpiry = expiryDate ? differenceInDays(expiryDate, today) : null;

        return (
            <Link
                key={tariff.id}
                to={createPageUrl(`TariffDetail?id=${tariff.id}`)}
                className="block p-3 rounded-lg border hover:bg-slate-50 transition-colors"
            >
                <div className="flex justify-between items-start">
                    <div>
                        <p className="font-semibold">{firstCarrier?.name || (carrierIds.length > 1 ? `${carrierIds.length} carriers` : 'Multiple Carriers')}</p>
                        <p className="text-sm text-slate-600">Version: {tariff.version}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {tariff.status === 'active' && daysUntilExpiry !== null && daysUntilExpiry <= 90 && daysUntilExpiry > 0 ? (
                            <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Expiring ({daysUntilExpiry}d)</Badge>
                        ) : tariff.status === 'proposed' ? (
                            <Badge className="bg-blue-100 text-blue-800 border-blue-200">Proposed</Badge>
                        ) : tariff.status === 'active' ? (
                            <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>
                        ) : (
                            <Badge variant="secondary">{tariff.status}</Badge>
                        )}
                        <ExternalLink className="w-4 h-4 text-slate-400" />
                    </div>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                    Effective: {format(new Date(tariff.effective_date), 'MMM d, yyyy')} • Expires: {format(new Date(tariff.expiry_date), 'MMM d, yyyy')}
                </p>
            </Link>
        );
    };

    return (
        <div className="space-y-4 mt-4">
            {liveTariffs.length > 0 && (
                <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-2">Live Agreements</h3>
                    <div className="space-y-3">
                        {liveTariffs.map(renderTariff)}
                    </div>
                </div>
            )}

            {historyTariffs.length > 0 && (
                <div>
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className="text-sm font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-2 mb-2"
                    >
                        <ChevronRight className={`w-4 h-4 transition-transform ${showHistory ? 'rotate-90' : ''}`} />
                        History ({historyTariffs.length})
                    </button>
                    {showHistory && (
                        <div className="space-y-3">
                            {historyTariffs.map(renderTariff)}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CustomerTariffTimeline;
