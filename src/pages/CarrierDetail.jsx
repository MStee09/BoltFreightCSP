
import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Customer, Carrier, Tariff, CSPEvent, Task, Interaction, Alert, Shipment, LostOpportunity, ReportSnapshot } from '../api/entities';
import { supabase } from '../api/supabaseClient';
import { Link, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { ArrowLeft, Edit, Users, FileText, BarChart2, ShieldCheck, Ban, Anchor, Mail } from 'lucide-react';
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
import { EmailThreadView } from '../components/email/EmailThreadView';
import { EmailThreadBadge } from '../components/email/EmailThreadBadge';
import { BackButton } from '../components/navigation/BackButton';

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
        initialData: [] // Ensure it starts as an array to prevent crashes if data isn't loaded yet
    });

    const isLoading = isLoadingTariffs || isLoadingCustomers;

    const getStatusBadge = (status) => {
        const colors = {
            active: "bg-green-100 text-green-800",
            proposed: "bg-blue-100 text-blue-800",
            expired: "bg-slate-100 text-slate-700",
            superseded: "bg-purple-100 text-purple-800",
        };
        return <Badge className={`${colors[status] || 'bg-gray-100'} hover:bg-opacity-80`}>{status}</Badge>;
    };

    return (
        <Card className="mt-4 shadow-md">
            <CardHeader>
                <CardTitle>Tariff Library</CardTitle>
                <CardDescription>All tariffs associated with this carrier, across all customers.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Customer</TableHead>
                            <TableHead>Tariff ID</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Days Left</TableHead>
                            <TableHead>Last Updated</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? Array(3).fill(0).map((_, i) => (
                            <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
                        )) : tariffs.map(tariff => {
                            const customer = customers.find(c => c.id === tariff.customer_id);
                            const daysLeft = tariff.expiry_date ? differenceInDays(new Date(tariff.expiry_date), new Date()) : null;
                            return (
                                <TableRow
                                    key={tariff.id}
                                    className={`cursor-pointer hover:bg-slate-50 ${tariff.id === highlightId ? 'bg-blue-50' : ''}`}
                                    onClick={() => window.location.href = createPageUrl(`TariffDetail?id=${tariff.id}`)}
                                >
                                    <TableCell className="font-medium">{customer?.name || (tariff.is_blanket_tariff ? 'Blanket' : 'N/A')}</TableCell>
                                    <TableCell>{tariff.tariff_reference_id || tariff.version}</TableCell>
                                    <TableCell>{getStatusBadge(tariff.status)}</TableCell>
                                    <TableCell>{daysLeft !== null && daysLeft >= 0 ? `${daysLeft} days` : 'Expired'}</TableCell>
                                    <TableCell>{formatDistanceToNow(new Date(tariff.updated_date), { addSuffix: true })}</TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
};

export default function CarrierDetailPage() {
    const [searchParams] = useSearchParams();
    const carrierId = searchParams.get('id');
    const isNew = searchParams.get('new') === 'true';
    const prefillScac = searchParams.get('scac');
    const defaultTab = searchParams.get('tab') || 'overview';
    const highlightId = searchParams.get('highlight');
    const [isEditSheetOpen, setIsEditSheetOpen] = useState(isNew);
    const [emailViewMode, setEmailViewMode] = useState('threads');
    const { openComposer } = useEmailComposer();

    const { data: carrier, isLoading } = useQuery({
        queryKey: ['carrier', carrierId],
        queryFn: () => Carrier.get(carrierId),
        enabled: !!carrierId && !isNew,
    });

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
        </>
    );
}

