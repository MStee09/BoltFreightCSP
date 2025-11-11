import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Tariff, Carrier, CSPEvent } from '../../api/entities';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { ChevronRight, ExternalLink, FileText, RefreshCw, Eye } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { createPageUrl } from '../../utils';
import CreateAwardedCspDialog from '../tariffs/CreateAwardedCspDialog';

const CustomerTariffTimeline = ({ customerId }) => {
    const navigate = useNavigate();
    const [showHistory, setShowHistory] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState({
        'rocket_csp': true,
        'customer_direct': false,
        'rocket_blanket': false,
        'priority1_blanket': false
    });
    const [visibleCounts, setVisibleCounts] = useState({
        'rocket_csp': 10,
        'customer_direct': 10,
        'rocket_blanket': 10,
        'priority1_blanket': 10
    });
    const [hoveredTariffId, setHoveredTariffId] = useState(null);
    const [renewalDialogOpen, setRenewalDialogOpen] = useState(false);
    const [selectedTariff, setSelectedTariff] = useState(null);

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

    const { data: cspEvents = [], isLoading: isLoadingCspEvents } = useQuery({
        queryKey: ['csp_events', { forCustomer: customerId }],
        queryFn: () => CSPEvent.filter({ customer_id: customerId }),
        enabled: !!customerId,
        initialData: []
    });

    const isLoading = isLoadingTariffs || isLoadingCarriers || isLoadingCspEvents;

    const today = new Date();

    const groupedTariffs = useMemo(() => {
        const liveTariffs = tariffs.filter(t => {
            const expiryDate = t.expiry_date ? new Date(t.expiry_date) : null;
            const daysUntilExpiry = expiryDate ? differenceInDays(expiryDate, today) : null;
            return t.status === 'active' || t.status === 'proposed' ||
                   (expiryDate && daysUntilExpiry !== null && daysUntilExpiry <= 90 && daysUntilExpiry > 0);
        });

        const grouped = {
            'rocket_csp': liveTariffs.filter(t => t.ownership_type === 'rocket_csp'),
            'customer_direct': liveTariffs.filter(t => t.ownership_type === 'customer_direct'),
            'rocket_blanket': liveTariffs.filter(t => t.ownership_type === 'rocket_blanket'),
            'priority1_blanket': liveTariffs.filter(t => t.ownership_type === 'priority1_blanket')
        };

        return grouped;
    }, [tariffs, today]);

    const historyTariffs = useMemo(() => {
        return tariffs.filter(t => {
            const expiryDate = t.expiry_date ? new Date(t.expiry_date) : null;
            const daysUntilExpiry = expiryDate ? differenceInDays(expiryDate, today) : null;
            const isLive = t.status === 'active' || t.status === 'proposed' ||
                          (expiryDate && daysUntilExpiry !== null && daysUntilExpiry <= 90 && daysUntilExpiry > 0);
            return !isLive;
        });
    }, [tariffs, today]);

    const getGroupCounts = (groupTariffs) => {
        const active = groupTariffs.filter(t => {
            const expiryDate = t.expiry_date ? new Date(t.expiry_date) : null;
            const daysUntilExpiry = expiryDate ? differenceInDays(expiryDate, today) : null;
            return t.status === 'active' && !(daysUntilExpiry !== null && daysUntilExpiry <= 90 && daysUntilExpiry > 0);
        }).length;
        const expiring = groupTariffs.filter(t => {
            const expiryDate = t.expiry_date ? new Date(t.expiry_date) : null;
            const daysUntilExpiry = expiryDate ? differenceInDays(expiryDate, today) : null;
            return t.status === 'active' && daysUntilExpiry !== null && daysUntilExpiry <= 90 && daysUntilExpiry > 0;
        }).length;
        const proposed = groupTariffs.filter(t => t.status === 'proposed').length;
        return { active, expiring, proposed };
    };

    const getRenewalCspEvent = (tariff) => {
        if (tariff.renewal_csp_event_id) {
            return cspEvents.find(e => e.id === tariff.renewal_csp_event_id);
        }
        if (tariff.tariff_family_id) {
            return cspEvents.find(e => e.related_tariff_family_id === tariff.tariff_family_id);
        }
        return null;
    };

    const getCspStageBadge = (stage) => {
        const stageColors = {
            'draft': 'bg-slate-100 text-slate-700 border-slate-300',
            'rfp_issued': 'bg-blue-100 text-blue-700 border-blue-300',
            'under_review': 'bg-yellow-100 text-yellow-700 border-yellow-300',
            'awarded': 'bg-green-100 text-green-700 border-green-300',
            'implementation': 'bg-purple-100 text-purple-700 border-purple-300',
            'optimization': 'bg-cyan-100 text-cyan-700 border-cyan-300'
        };
        const stageLabels = {
            'draft': 'Draft',
            'rfp_issued': 'RFP Issued',
            'under_review': 'Under Review',
            'awarded': 'Awarded',
            'implementation': 'Implementation',
            'optimization': 'Optimization'
        };
        return { color: stageColors[stage] || stageColors.draft, label: stageLabels[stage] || stage };
    };

    const toggleGroup = (groupKey) => {
        setExpandedGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }));
    };

    const loadMore = (groupKey) => {
        setVisibleCounts(prev => ({ ...prev, [groupKey]: prev[groupKey] + 5 }));
    };

    const renderTariff = (tariff) => {
        const carrierIds = tariff.carrier_ids || [];
        const carrier = carrierIds.length > 0
            ? carriers.find(c => carrierIds.includes(c.id))
            : carriers.find(c => c.id === tariff.carrier_id);
        const expiryDate = tariff.expiry_date ? new Date(tariff.expiry_date) : null;
        const daysUntilExpiry = expiryDate ? differenceInDays(expiryDate, today) : null;
        const isExpiring = daysUntilExpiry !== null && daysUntilExpiry <= 90 && daysUntilExpiry > 0;
        const renewalCsp = getRenewalCspEvent(tariff);
        const hasRenewal = !!renewalCsp;
        const isHovered = hoveredTariffId === tariff.id;
        const carrierName = carrier?.name || (carrierIds.length > 1 ? `${carrierIds.length} carriers` : 'Unknown Carrier');

        return (
            <div
                key={tariff.id}
                className="relative min-h-[100px] p-5 rounded-lg border hover:bg-slate-50 transition-colors"
                onMouseEnter={() => setHoveredTariffId(tariff.id)}
                onMouseLeave={() => setHoveredTariffId(null)}
            >
                <div className="pr-32">
                    <h3 className="text-lg font-bold text-slate-900 mb-1">
                        {carrierName}
                    </h3>
                    <p className="text-sm text-slate-500 font-mono mb-1">
                        {tariff.tariff_reference_id || tariff.version || 'No ID'}
                    </p>
                    {isExpiring && (
                        <p className="text-xs text-yellow-700 mb-2">
                            Expiring in {daysUntilExpiry} days
                        </p>
                    )}
                    <p className="text-xs text-slate-500 mt-2">
                        Effective: {format(new Date(tariff.effective_date), 'MMM d, yyyy')} • Expires: {format(new Date(tariff.expiry_date), 'MMM d, yyyy')}
                    </p>
                </div>

                <div className="absolute right-5 top-5 flex flex-col items-end gap-3">
                    <div className="flex items-center gap-2">
                        {tariff.status === 'active' && !isExpiring && (
                            <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>
                        )}
                        {tariff.status === 'proposed' && (
                            <Badge className="bg-blue-100 text-blue-800 border-blue-200">Proposed</Badge>
                        )}
                        {isExpiring && (
                            <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                                Expiring
                            </Badge>
                        )}
                        {hasRenewal && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(createPageUrl(`CspEventDetail?id=${renewalCsp.id}`));
                                            }}
                                        >
                                            <Badge
                                                variant="outline"
                                                className={`${getCspStageBadge(renewalCsp.stage).color} cursor-pointer hover:opacity-80`}
                                            >
                                                Renewal: {getCspStageBadge(renewalCsp.stage).label}
                                            </Badge>
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent>Click to view renewal CSP</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                    </div>

                    <div className={`flex items-center gap-1 bg-white rounded-md shadow-sm border p-1 transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(createPageUrl(`TariffDetail?id=${tariff.id}`));
                                        }}
                                    >
                                        <Eye className="w-3.5 h-3.5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>View Tariff</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(createPageUrl(`TariffDetail?id=${tariff.id}&tab=documents`));
                                        }}
                                    >
                                        <FileText className="w-3.5 h-3.5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Docs</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        {isExpiring && !hasRenewal && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedTariff(tariff);
                                                setRenewalDialogOpen(true);
                                            }}
                                        >
                                            <RefreshCw className="w-3.5 h-3.5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Renew</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderGroup = (groupKey, groupLabel, groupTariffs) => {
        if (groupTariffs.length === 0) return null;

        const counts = getGroupCounts(groupTariffs);
        const visibleTariffs = groupTariffs.slice(0, visibleCounts[groupKey]);
        const hasMore = visibleTariffs.length < groupTariffs.length;

        return (
            <Collapsible
                key={groupKey}
                open={expandedGroups[groupKey]}
                onOpenChange={() => toggleGroup(groupKey)}
                className="border rounded-lg"
            >
                <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                        <ChevronRight className={`w-4 h-4 transition-transform ${expandedGroups[groupKey] ? 'rotate-90' : ''}`} />
                        <h3 className="text-sm font-semibold text-slate-900">{groupLabel}</h3>
                        <div className="flex items-center gap-2 text-xs">
                            {counts.active > 0 && (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                    {counts.active} Active
                                </Badge>
                            )}
                            {counts.expiring > 0 && (
                                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                    {counts.expiring} Expiring
                                </Badge>
                            )}
                            {counts.proposed > 0 && (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                    {counts.proposed} Proposed
                                </Badge>
                            )}
                        </div>
                    </div>
                    <span className="text-xs text-slate-500">{groupTariffs.length} total</span>
                </CollapsibleTrigger>
                <CollapsibleContent className="px-4 pb-4 space-y-3">
                    {visibleTariffs.map(renderTariff)}
                    {hasMore && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => loadMore(groupKey)}
                            className="w-full mt-2"
                        >
                            Load 5 More ({groupTariffs.length - visibleTariffs.length} remaining)
                        </Button>
                    )}
                </CollapsibleContent>
            </Collapsible>
        );
    };

    if (isLoading) {
        return <div className="space-y-2 mt-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>;
    }

    if (tariffs.length === 0) {
        return <div className="py-8 text-center text-slate-500 border border-dashed rounded-lg mt-4">No tariffs found for this customer.</div>;
    }

    const hasLiveTariffs = Object.values(groupedTariffs).some(group => group.length > 0);

    return (
        <>
            <div className="space-y-4 mt-4">
                {hasLiveTariffs && (
                    <div className="space-y-3">
                        {renderGroup('rocket_csp', 'Rocket CSP', groupedTariffs.rocket_csp)}
                        {renderGroup('customer_direct', 'Customer Direct', groupedTariffs.customer_direct)}
                        {renderGroup('rocket_blanket', 'Rocket Blanket', groupedTariffs.rocket_blanket)}
                        {renderGroup('priority1_blanket', 'Priority 1 CSP', groupedTariffs.priority1_blanket)}
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

            {selectedTariff && (
                <CreateAwardedCspDialog
                    open={renewalDialogOpen}
                    onOpenChange={setRenewalDialogOpen}
                    customerId={customerId}
                    prefilledTariff={selectedTariff}
                    isRenewal={true}
                />
            )}
        </>
    );
};

export default CustomerTariffTimeline;
