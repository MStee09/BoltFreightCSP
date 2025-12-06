
import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Customer, Carrier, Tariff, CSPEvent, Task, Interaction, Alert, Shipment, LostOpportunity, ReportSnapshot } from '../api/entities';
import { supabase } from '../api/supabaseClient';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { ArrowLeft, Edit, Users, FileText, BarChart2, ShieldCheck, Ban, Anchor, Mail, Trash2, PlusCircle, ChevronRight, Eye, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { createPageUrl } from '../utils';
import { Badge } from "../components/ui/badge";
import { format, formatDistanceToNow, differenceInDays } from "date-fns";
import EditCarrierSheet from '../components/carriers/EditCarrierSheet';
import CarrierOverview from '../components/carriers/CarrierOverview';
import ManageContactsDialog from '../components/carriers/ManageContactsDialog';
import { useEmailComposer } from '../contexts/EmailComposerContext';
import InteractionTimeline from '../components/customers/InteractionTimeline';
import DocumentsTab from '../components/customers/DocumentsTab';
import { EmailThreadView } from '../components/email/EmailThreadView';
import { EmailThreadBadge } from '../components/email/EmailThreadBadge';
import { BackButton } from '../components/navigation/BackButton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { toast } from 'sonner';
import EditTariffDialog from '../components/tariffs/EditTariffDialog';

const PlaceholderTab = ({ title, icon }) => (
    <div className="py-12 text-center text-slate-500 border border-dashed rounded-lg mt-4">
        {icon}
        <p className="font-semibold mt-4">{title} Panel</p>
        <p className="text-sm">This section is under construction.</p>
    </div>
);

const CarrierContacts = ({ carrier }) => {
    const [isManageContactsOpen, setIsManageContactsOpen] = useState(false);

    return (
        <>
            <div className="flex justify-end mb-4">
                <Button onClick={() => setIsManageContactsOpen(true)}>
                    <Users className="w-4 h-4 mr-2" />
                    Manage Contacts
                </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <Card>
                <CardHeader>
                    <CardTitle>Carrier Representative</CardTitle>
                    <CardDescription>Primary contact for operations and sales</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {carrier.carrier_rep_name || carrier.carrier_rep_email || carrier.carrier_rep_phone ? (
                        <>
                            {carrier.carrier_rep_name && (
                                <div>
                                    <p className="text-sm text-slate-500 mb-1">Name</p>
                                    <p className="text-base font-medium text-slate-900">{carrier.carrier_rep_name}</p>
                                </div>
                            )}
                            {carrier.carrier_rep_email && (
                                <div>
                                    <p className="text-sm text-slate-500 mb-1">Email</p>
                                    <a href={`mailto:${carrier.carrier_rep_email}`} className="text-base text-blue-600 hover:underline">
                                        {carrier.carrier_rep_email}
                                    </a>
                                </div>
                            )}
                            {carrier.carrier_rep_phone && (
                                <div>
                                    <p className="text-sm text-slate-500 mb-1">Phone</p>
                                    <a href={`tel:${carrier.carrier_rep_phone}`} className="text-base text-blue-600 hover:underline">
                                        {carrier.carrier_rep_phone}
                                    </a>
                                </div>
                            )}
                        </>
                    ) : (
                        <p className="text-sm text-slate-500">No carrier representative information available</p>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Billing Contact</CardTitle>
                    <CardDescription>Contact for invoicing and payment inquiries</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {carrier.billing_contact_name || carrier.billing_contact_email || carrier.billing_contact_phone ? (
                        <>
                            {carrier.billing_contact_name && (
                                <div>
                                    <p className="text-sm text-slate-500 mb-1">Name</p>
                                    <p className="text-base font-medium text-slate-900">{carrier.billing_contact_name}</p>
                                </div>
                            )}
                            {carrier.billing_contact_email && (
                                <div>
                                    <p className="text-sm text-slate-500 mb-1">Email</p>
                                    <a href={`mailto:${carrier.billing_contact_email}`} className="text-base text-blue-600 hover:underline">
                                        {carrier.billing_contact_email}
                                    </a>
                                </div>
                            )}
                            {carrier.billing_contact_phone && (
                                <div>
                                    <p className="text-sm text-slate-500 mb-1">Phone</p>
                                    <a href={`tel:${carrier.billing_contact_phone}`} className="text-base text-blue-600 hover:underline">
                                        {carrier.billing_contact_phone}
                                    </a>
                                </div>
                            )}
                        </>
                    ) : (
                        <p className="text-sm text-slate-500">No billing contact information available</p>
                    )}
                </CardContent>
            </Card>

            {(carrier.website || carrier.portal_login_url) && (
                <Card>
                    <CardHeader>
                        <CardTitle>Online Resources</CardTitle>
                        <CardDescription>Carrier websites and portals</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {carrier.website && (
                            <div>
                                <p className="text-sm text-slate-500 mb-1">Website</p>
                                <a href={carrier.website} target="_blank" rel="noopener noreferrer" className="text-base text-blue-600 hover:underline break-all">
                                    {carrier.website}
                                </a>
                            </div>
                        )}
                        {carrier.portal_login_url && (
                            <div>
                                <p className="text-sm text-slate-500 mb-1">Portal Login</p>
                                <a href={carrier.portal_login_url} target="_blank" rel="noopener noreferrer" className="text-base text-blue-600 hover:underline break-all">
                                    {carrier.portal_login_url}
                                </a>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {(carrier.contact_name || carrier.contact_email || carrier.contact_phone) && (
                <Card>
                    <CardHeader>
                        <CardTitle>General Contact</CardTitle>
                        <CardDescription>Additional contact information</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {carrier.contact_name && (
                            <div>
                                <p className="text-sm text-slate-500 mb-1">Name</p>
                                <p className="text-base font-medium text-slate-900">{carrier.contact_name}</p>
                            </div>
                        )}
                        {carrier.contact_email && (
                            <div>
                                <p className="text-sm text-slate-500 mb-1">Email</p>
                                <a href={`mailto:${carrier.contact_email}`} className="text-base text-blue-600 hover:underline">
                                    {carrier.contact_email}
                                </a>
                            </div>
                        )}
                        {carrier.contact_phone && (
                            <div>
                                <p className="text-sm text-slate-500 mb-1">Phone</p>
                                <a href={`tel:${carrier.contact_phone}`} className="text-base text-blue-600 hover:underline">
                                    {carrier.contact_phone}
                                </a>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
        <ManageContactsDialog
            isOpen={isManageContactsOpen}
            onOpenChange={setIsManageContactsOpen}
            carrierId={carrier.id}
            carrierName={carrier.name}
        />
        </>
    );
};

const CarrierKPIs = ({ carrier }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
            <Card>
                <CardHeader>
                    <CardTitle>Service Type</CardTitle>
                    <CardDescription>Primary service offering</CardDescription>
                </CardHeader>
                <CardContent>
                    <Badge variant="secondary" className="text-lg capitalize">
                        {carrier.service_type || 'Not specified'}
                    </Badge>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Coverage</CardTitle>
                    <CardDescription>Geographic reach</CardDescription>
                </CardHeader>
                <CardContent>
                    <Badge variant="outline" className="text-lg capitalize">
                        {carrier.coverage_type || 'Regional'}
                    </Badge>
                    {carrier.service_states && carrier.service_states.length > 0 && (
                        <p className="text-sm text-slate-600 mt-2">
                            {carrier.service_states.length} states
                        </p>
                    )}
                </CardContent>
            </Card>

            {carrier.equipment_types && carrier.equipment_types.length > 0 && (
                <Card className="md:col-span-2 lg:col-span-3">
                    <CardHeader>
                        <CardTitle>Equipment & Capabilities</CardTitle>
                        <CardDescription>Available equipment types and specializations</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <div>
                                <p className="text-sm font-medium text-slate-700 mb-2">Equipment Types</p>
                                <div className="flex flex-wrap gap-2">
                                    {carrier.equipment_types.map((eq, idx) => (
                                        <Badge key={idx} variant="secondary" className="capitalize">
                                            {eq.replace('_', ' ')}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                            {carrier.specializations && carrier.specializations.length > 0 && (
                                <div>
                                    <p className="text-sm font-medium text-slate-700 mb-2">Specializations</p>
                                    <div className="flex flex-wrap gap-2">
                                        {carrier.specializations.map((spec, idx) => (
                                            <Badge key={idx} variant="outline" className="capitalize">
                                                {spec.replace('_', ' ')}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

const CarrierTimeline = ({ carrierId }) => {
    const { data: interactions = [], isLoading } = useQuery({
        queryKey: ['interactions', carrierId, 'carrier'],
        queryFn: () => Interaction.filter({ entity_id: carrierId, entity_type: 'carrier', order_by: '-created_date' }),
        enabled: !!carrierId,
    });

    const { data: customers = [] } = useQuery({
        queryKey: ['customers'],
        queryFn: () => Customer.list(),
        initialData: []
    });

    return (
        <Card className="mt-4">
            <CardHeader>
                <CardTitle>Relationship Timeline</CardTitle>
                <CardDescription>All interactions and activities with this carrier</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="space-y-4">
                        {Array(3).fill(0).map((_, i) => (
                            <Skeleton key={i} className="h-20 w-full" />
                        ))}
                    </div>
                ) : interactions.length > 0 ? (
                    <div className="space-y-4">
                        {interactions.map((interaction) => {
                            const customer = interaction.metadata?.customer_id
                                ? customers.find(c => c.id === interaction.metadata.customer_id)
                                : null;

                            return (
                                <div key={interaction.id} className="border-l-2 border-blue-500 pl-4 pb-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Badge variant="outline" className="capitalize">
                                                    {interaction.interaction_type?.replace(/_/g, ' ')}
                                                </Badge>
                                                {customer && (
                                                    <span className="text-xs text-slate-500">
                                                        with {customer.name}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="font-medium text-slate-900 text-sm">{interaction.summary}</p>
                                            {interaction.details && (
                                                <p className="text-sm text-slate-600 mt-1">{interaction.details}</p>
                                            )}
                                            <p className="text-xs text-slate-500 mt-2">
                                                {formatDistanceToNow(new Date(interaction.created_date), { addSuffix: true })}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-sm text-slate-500 text-center py-8">No interactions recorded yet</p>
                )}
            </CardContent>
        </Card>
    );
};

const CarrierCommitments = ({ carrier }) => {
    return (
        <div className="mt-4 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Service Commitments</CardTitle>
                    <CardDescription>Agreed upon service level agreements and commitments</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-slate-500 text-center py-8">
                        No formal commitments recorded. Use this section to track volume commitments,
                        service level agreements, and other contractual obligations.
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Notes</CardTitle>
                    <CardDescription>General notes about this carrier relationship</CardDescription>
                </CardHeader>
                <CardContent>
                    {carrier.notes ? (
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{carrier.notes}</p>
                    ) : (
                        <p className="text-sm text-slate-500 text-center py-4">No notes available</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

const CarrierTariffs = ({ carrierId, highlightId }) => {
    const [showCreateTariffDialog, setShowCreateTariffDialog] = useState(false);
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [expandedGroups, setExpandedGroups] = useState({
        'rocket_csp': true,
        'customer_direct': false,
        'rocket_blanket': false,
        'priority_1_csp': false
    });
    const [visibleCounts, setVisibleCounts] = useState({
        'rocket_csp': 10,
        'customer_direct': 10,
        'rocket_blanket': 10,
        'priority_1_csp': 10
    });
    const [hoveredTariffId, setHoveredTariffId] = useState(null);

    const { data: tariffs = [], isLoading: isLoadingTariffs } = useQuery({
        queryKey: ['tariffs', { carrierForTariffs: carrierId }],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('tariffs')
                .select('*')
                .or(`carrier_id.eq.${carrierId},carrier_ids.cs.{${carrierId}}`)
                .eq('user_id', '00000000-0000-0000-0000-000000000000');

            if (error) throw error;
            return data || [];
        },
        enabled: !!carrierId,
        initialData: []
    });

    const { data: customers = [], isLoading: isLoadingCustomers } = useQuery({
        queryKey: ['customers'],
        queryFn: () => Customer.list(),
        initialData: []
    });

    const { data: cspEvents = [], isLoading: isLoadingCspEvents } = useQuery({
        queryKey: ['csp_events'],
        queryFn: () => CSPEvent.list(),
        initialData: []
    });

    const isLoading = isLoadingTariffs || isLoadingCustomers || isLoadingCspEvents;
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
            'priority_1_csp': liveTariffs.filter(t => t.ownership_type === 'priority_1_csp')
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
        const customer = customers.find(c => c.id === tariff.customer_id);
        const expiryDate = tariff.expiry_date ? new Date(tariff.expiry_date) : null;
        const daysUntilExpiry = expiryDate ? differenceInDays(expiryDate, today) : null;
        const isExpiring = daysUntilExpiry !== null && daysUntilExpiry <= 90 && daysUntilExpiry > 0;
        const renewalCsp = getRenewalCspEvent(tariff);
        const hasRenewal = !!renewalCsp;
        const isHovered = hoveredTariffId === tariff.id;
        const customerName = customer?.name || (tariff.is_blanket_tariff ? 'Rocket Blanket' : 'Unknown Customer');

        return (
            <div
                key={tariff.id}
                className={`relative min-h-[100px] p-5 rounded-lg border hover:bg-slate-50 transition-colors ${tariff.id === highlightId ? 'bg-blue-50' : ''}`}
                onMouseEnter={() => setHoveredTariffId(tariff.id)}
                onMouseLeave={() => setHoveredTariffId(null)}
            >
                <div className="pr-32">
                    <h3 className="text-lg font-bold text-slate-900 mb-1">
                        {customerName}
                    </h3>
                    <p className="text-sm text-slate-500 font-mono mb-1">
                        {tariff.tariff_reference_id || 'No ID'}
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

    const handleCreateSuccess = () => {
        queryClient.invalidateQueries({ queryKey: ['tariffs'] });
        setShowCreateTariffDialog(false);
        toast.success('Tariff created successfully');
    };

    if (isLoading) {
        return <div className="space-y-2 mt-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>;
    }

    if (tariffs.length === 0) {
        return (
            <>
                <div className="py-12 text-center border border-dashed rounded-lg mt-4">
                    <p className="text-slate-500 mb-4">No tariffs found for this carrier.</p>
                    <Button
                        onClick={() => setShowCreateTariffDialog(true)}
                        variant="outline"
                        size="sm"
                    >
                        <PlusCircle className="w-4 h-4 mr-2" />
                        Create Tariff
                    </Button>
                </div>
                <EditTariffDialog
                    open={showCreateTariffDialog}
                    onOpenChange={setShowCreateTariffDialog}
                    tariff={null}
                    preselectedCarrierIds={[carrierId]}
                    onSuccess={handleCreateSuccess}
                />
            </>
        );
    }

    const hasLiveTariffs = Object.values(groupedTariffs).some(group => group.length > 0);

    return (
        <>
            <div className="flex items-center justify-between mb-3 mt-4">
                <div className="text-sm text-slate-500">
                    {tariffs.length} {tariffs.length === 1 ? 'tariff' : 'tariffs'}
                </div>
                <Button
                    onClick={() => setShowCreateTariffDialog(true)}
                    variant="outline"
                    size="sm"
                >
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Create Tariff
                </Button>
            </div>

            <div className="space-y-4">
                {hasLiveTariffs && (
                    <div className="space-y-3">
                        {renderGroup('rocket_csp', 'Rocket CSP', groupedTariffs.rocket_csp)}
                        {renderGroup('customer_direct', 'Customer Direct', groupedTariffs.customer_direct)}
                        {renderGroup('rocket_blanket', 'Rocket Blanket', groupedTariffs.rocket_blanket)}
                        {renderGroup('priority_1_csp', 'Priority 1 CSP', groupedTariffs.priority_1_csp)}
                    </div>
                )}

                {historyTariffs.length > 0 && (
                    <div>
                        <button
                            onClick={() => {
                                const showHistory = !expandedGroups.history;
                                setExpandedGroups(prev => ({ ...prev, history: showHistory }));
                            }}
                            className="text-sm font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-2 mb-2"
                        >
                            <ChevronRight className={`w-4 h-4 transition-transform ${expandedGroups.history ? 'rotate-90' : ''}`} />
                            History ({historyTariffs.length})
                        </button>
                        {expandedGroups.history && (
                            <div className="space-y-3">
                                {historyTariffs.map(renderTariff)}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <EditTariffDialog
                open={showCreateTariffDialog}
                onOpenChange={setShowCreateTariffDialog}
                tariff={null}
                preselectedCarrierIds={[carrierId]}
                onSuccess={handleCreateSuccess}
            />
        </>
    )
};

export default function CarrierDetailPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const carrierId = searchParams.get('id');
    const isNew = searchParams.get('new') === 'true';
    const prefillScac = searchParams.get('scac');
    const defaultTab = searchParams.get('tab') || 'overview';
    const highlightId = searchParams.get('highlight');
    const [isEditSheetOpen, setIsEditSheetOpen] = useState(isNew);
    const [emailViewMode, setEmailViewMode] = useState('threads');
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const { openComposer } = useEmailComposer();

    const { data: carrier, isLoading } = useQuery({
        queryKey: ['carrier', carrierId],
        queryFn: () => Carrier.get(carrierId),
        enabled: !!carrierId && !isNew,
    });

    const handleDelete = async () => {
        try {
            await Carrier.delete(carrierId);
            toast.success('Carrier deleted successfully');
            queryClient.invalidateQueries(['carriers']);
            navigate(createPageUrl('Carriers'));
        } catch (error) {
            toast.error(error.message || 'Failed to delete carrier');
        }
    };

    if (isNew) {
        return (
            <>
                <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
                    <div className="mb-6">
                        <BackButton fallbackPath="/Carriers" />
                    </div>
                    <div className="text-center py-12">
                        <h1 className="text-3xl font-bold text-slate-900 mb-4">Create New Carrier</h1>
                        <p className="text-slate-600">Fill out the form to add a new carrier partner.</p>
                    </div>
                </div>
                <EditCarrierSheet
                    carrierId={null}
                    isOpen={isEditSheetOpen}
                    onOpenChange={setIsEditSheetOpen}
                    prefillData={prefillScac ? { scac_code: prefillScac } : undefined}
                />
            </>
        );
    }

    if (isLoading) {
        return (
            <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
                <Skeleton className="h-8 w-1/4 mb-2" />
                <Skeleton className="h-6 w-1/3 mb-8" />
                <Skeleton className="h-[400px] w-full" />
            </div>
        );
    }

    if (!carrier) {
        return <div className="p-8 text-center">Carrier not found. Please return to the carriers list.</div>;
    }

    return (
        <>
            <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
                <div className="mb-6">
                    <BackButton fallbackPath="/Carriers" />
                </div>

                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">{carrier.name}</h1>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => openComposer({
                            carrier: { id: carrier.id, name: carrier.name }
                        })}>
                            <Mail className="w-4 h-4 mr-2" /> Email
                        </Button>
                        <Button variant="outline" onClick={() => setIsEditSheetOpen(true)}>
                            <Edit className="w-4 h-4 mr-2" /> Edit Carrier
                        </Button>
                        <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setShowDeleteDialog(true)}>
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </Button>
                    </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 mb-6 flex items-center justify-between gap-6 text-sm">
                    <div className="flex items-center gap-6">
                        {carrier.scac_code && (
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-slate-600">SCAC:</span>
                                <span className="text-slate-900 font-mono">{carrier.scac_code}</span>
                            </div>
                        )}
                        {carrier.service_type && (
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-slate-600">Service Type:</span>
                                <Badge variant="outline" className="capitalize">
                                    {carrier.service_type}
                                </Badge>
                            </div>
                        )}
                        {carrier.status && (
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-slate-600">Status:</span>
                                <Badge variant="secondary" className="capitalize">
                                    {carrier.status}
                                </Badge>
                            </div>
                        )}
                    </div>
                    <EmailThreadBadge
                        carrierId={carrierId}
                        onClick={() => {
                            const emailsTab = document.querySelector('[value="emails"]');
                            if (emailsTab) emailsTab.click();
                        }}
                    />
                </div>

                <Tabs defaultValue={defaultTab}>
                    <TabsList className="bg-slate-100">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="tariffs">Tariffs</TabsTrigger>
                        <TabsTrigger value="documents">Documents</TabsTrigger>
                        <TabsTrigger value="emails">Emails</TabsTrigger>
                        <TabsTrigger value="contacts">Contacts</TabsTrigger>
                        <TabsTrigger value="kpis">KPIs</TabsTrigger>
                        <TabsTrigger value="timeline">Activity</TabsTrigger>
                        <TabsTrigger value="commitments">Commitments</TabsTrigger>
                    </TabsList>
                    <TabsContent value="overview">
                        <CarrierOverview carrier={carrier} />
                    </TabsContent>
                    <TabsContent value="tariffs">
                        <CarrierTariffs carrierId={carrierId} highlightId={highlightId} />
                    </TabsContent>
                    <TabsContent value="documents">
                        <DocumentsTab carrierId={carrierId} entityType="carrier" />
                    </TabsContent>
                    <TabsContent value="emails">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold">Email Communications</h3>
                                <div className="flex gap-2">
                                    <Button
                                        variant={emailViewMode === 'threads' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setEmailViewMode('threads')}
                                    >
                                        Thread View
                                    </Button>
                                    <Button
                                        variant={emailViewMode === 'timeline' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setEmailViewMode('timeline')}
                                    >
                                        Timeline View
                                    </Button>
                                </div>
                            </div>
                            {emailViewMode === 'threads' ? (
                                <EmailThreadView carrierId={carrierId} />
                            ) : (
                                <InteractionTimeline customerId={carrierId} entityType="carrier" />
                            )}
                        </div>
                    </TabsContent>
                    <TabsContent value="contacts">
                        <CarrierContacts carrier={carrier} />
                    </TabsContent>
                    <TabsContent value="kpis">
                        <CarrierKPIs carrier={carrier} />
                    </TabsContent>
                    <TabsContent value="timeline">
                        <InteractionTimeline customerId={carrierId} entityType="carrier" />
                    </TabsContent>
                    <TabsContent value="commitments">
                        <CarrierCommitments carrier={carrier} />
                    </TabsContent>
                </Tabs>
            </div>
            <EditCarrierSheet
                carrierId={carrierId}
                isOpen={isEditSheetOpen}
                onOpenChange={setIsEditSheetOpen}
            />

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Carrier</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{carrier?.name}"? This action cannot be undone and will remove all associated data including tariffs and relationships.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                        >
                            Delete Carrier
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

