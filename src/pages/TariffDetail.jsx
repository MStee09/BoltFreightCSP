
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, Link, useLocation } from 'react-router-dom';
import { Customer, Carrier, Tariff, CSPEvent, Task, Interaction, Alert, Shipment, LostOpportunity, ReportSnapshot } from '../api/entities';
import { createPageUrl } from '../utils';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { ArrowLeft, Edit, File, UploadCloud, Download, X, Loader2, BookMarked, ArrowRight, Users } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import EditTariffDialog from '../components/tariffs/EditTariffDialog';
import TariffSopsTab from '../components/tariffs/TariffSopsTab';
import { BackButton } from '../components/navigation/BackButton';
import LinkedCspSummaryCard from '../components/tariffs/LinkedCspSummaryCard';
import RenewalStatusBadge from '../components/tariffs/RenewalStatusBadge';
import TariffActivityTimeline from '../components/tariffs/TariffActivityTimeline';

const TariffDocumentManager = ({ tariff }) => {
    const queryClient = useQueryClient();
    const [file, setFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);

    const mutation = useMutation({
        mutationFn: async (newFile) => {
            console.error('File upload not implemented');
            throw new Error('File upload functionality requires base44 SDK');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tariff', tariff.id] });
            setFile(null);
        },
    });

    const handleFileChange = (e) => e.target.files && e.target.files[0] && setFile(e.target.files[0]);
    const handleDragEnter = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
    const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
    const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };
    const handleDrop = (e) => {
        e.preventDefault(); e.stopPropagation(); setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
        }
    };
    const handleUpload = () => file && mutation.mutate(file);

    return (
        <Card id="documents-section">
            <CardHeader>
                <CardTitle>Tariff Document</CardTitle>
            </CardHeader>
            <CardContent>
                {tariff.file_url ? (
                    <div className="space-y-4">
                        <div className="p-4 border rounded-lg flex items-center justify-between bg-slate-50">
                            <div className="flex items-center gap-3">
                                <File className="w-6 h-6 text-blue-500"/>
                                <div>
                                    <p className="font-medium text-sm">{tariff.file_name || 'Tariff Document'}</p>
                                </div>
                            </div>
                            <Button variant="outline" size="sm" asChild>
                                <a href={tariff.file_url} target="_blank" rel="noopener noreferrer"><Download className="w-4 h-4 mr-2"/>Download</a>
                            </Button>
                        </div>
                         <p className="text-sm text-slate-600 text-center">To replace this document, upload a new one below.</p>
                    </div>
                ) : (
                    <p className="text-sm text-slate-600 text-center pb-4">No document has been uploaded for this tariff yet.</p>
                )}

                <div className="mt-4">
                    {file ? (
                        <div className="p-4 border rounded-lg flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <File className="w-6 h-6 text-blue-500"/>
                                <p className="font-medium text-sm">{file.name}</p>
                            </div>
                             <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" onClick={() => setFile(null)}><X className="w-4 h-4"/></Button>
                                <Button onClick={handleUpload} disabled={mutation.isPending}>
                                    {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin"/> : <UploadCloud className="w-4 h-4"/>}
                                </Button>
                            </div>
                        </div>
                    ) : (
                         <div onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop} className={`relative p-8 border-2 border-dashed rounded-lg text-center cursor-pointer hover:border-blue-500 transition-colors ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300'}`}>
                            <UploadCloud className="w-8 h-8 mx-auto text-slate-400 mb-2"/>
                            <p className="font-semibold text-slate-700">Drag & drop new file here</p>
                            <p className="text-sm text-slate-500">or click to browse</p>
                            <Input type="file" className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileChange} accept=".pdf,.doc,.docx,.xls,.xlsx"/>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

const InfoItem = ({ label, value, children }) => (
    <div>
        <p className="text-sm text-slate-500 font-medium">{label}</p>
        <p className="text-base text-slate-900 font-semibold">{children || value || 'N/A'}</p>
    </div>
);

export default function TariffDetailPage() {
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const tariffId = searchParams.get('id');
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');

    const { data: tariff, isLoading: isLoadingTariff } = useQuery({
        queryKey: ['tariff', tariffId],
        queryFn: () => Tariff.get(tariffId),
        enabled: !!tariffId,
    });

    const { data: customer, isLoading: isLoadingCustomer } = useQuery({
        queryKey: ['customer', tariff?.customer_id],
        queryFn: () => Customer.get(tariff.customer_id),
        enabled: !!tariff?.customer_id,
    });

    const carrierId = tariff?.carrier_ids?.[0] || tariff?.carrier_id;

    const { data: carrier, isLoading: isLoadingCarrier } = useQuery({
        queryKey: ['carrier', carrierId],
        queryFn: () => Carrier.get(carrierId),
        enabled: !!carrierId,
    });

    const { data: cspEvent, isLoading: isLoadingCspEvent } = useQuery({
        queryKey: ['csp_event', tariff?.csp_event_id],
        queryFn: () => CSPEvent.get(tariff.csp_event_id),
        enabled: !!tariff?.csp_event_id,
    });

    const isLoading = isLoadingTariff || isLoadingCustomer || isLoadingCarrier || isLoadingCspEvent;

    useEffect(() => {
        if (location.hash === '#documents' && tariff) {
            setActiveTab('documents');
            setTimeout(() => {
                const element = document.getElementById('documents-section');
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 100);
        }
    }, [location.hash, tariff]);

    const ownershipTypeLabel = {
        rocket_csp: 'Rocket CSP',
        customer_direct: 'Customer Direct',
        customer_csp: 'Customer CSP'
    }[tariff?.ownership_type] || tariff?.ownership_type || 'N/A';
    
    if (isLoading) {
        return (
            <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
                <Skeleton className="h-8 w-1/4" />
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-96 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    if (!tariff) {
        return <div className="p-8 text-center">Tariff not found.</div>;
    }

    const headerDescription = tariff.is_blanket_tariff
        ? `Blanket tariff${carrier ? ` with ${carrier.name}` : ''}`
        : `For ${customer?.name || '...'}${carrier ? ` with ${carrier.name}` : ''}`;

    return (
        <div className="p-6 lg:p-8 max-w-4xl mx-auto">
            <div className="mb-6">
                <BackButton fallbackPath="/Tariffs" />
            </div>

            <div className="flex items-start justify-between mb-6">
                <div>
                    <div className="flex items-center gap-3">
                        {tariff.is_blanket_tariff && <BookMarked className="w-8 h-8 text-blue-600"/>}
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">{tariff.tariff_reference_id || 'Untitled Tariff'}</h1>
                        </div>
                    </div>
                    <p className="text-slate-600 mt-2">{headerDescription}</p>
                </div>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
                    <Edit className="w-4 h-4 mr-2" /> Edit Details
                </Button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="activity">Activity</TabsTrigger>
                    <TabsTrigger value="documents">Documents</TabsTrigger>
                    <TabsTrigger value="sops">SOPs</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                    {cspEvent && carrier && (
                        <LinkedCspSummaryCard
                            cspEvent={cspEvent}
                            customer={customer}
                            carriers={[carrier]}
                        />
                    )}

                    {(cspEvent || customer) && (
                        <Card className="border-blue-200 bg-blue-50/50">
                            <CardHeader>
                                <CardTitle className="text-lg">Related Records</CardTitle>
                                <CardDescription>Quick links to associated customer and CSP event</CardDescription>
                            </CardHeader>
                            <CardContent className="flex gap-3">
                                {customer && (
                                    <Button variant="outline" className="bg-white" asChild>
                                        <Link to={createPageUrl(`Customers?detailId=${customer.id}`)}>
                                            <Users className="w-4 h-4 mr-2" />
                                            View Customer
                                            <ArrowRight className="w-4 h-4 ml-2" />
                                        </Link>
                                    </Button>
                                )}
                                {cspEvent && (
                                    <Button variant="outline" className="bg-white" asChild>
                                        <Link to={createPageUrl(`CspEventDetail?id=${cspEvent.id}`)}>
                                            <File className="w-4 h-4 mr-2" />
                                            View RFP
                                            <ArrowRight className="w-4 h-4 ml-2" />
                                        </Link>
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardHeader><CardTitle>Key Information</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-6">
                            <InfoItem label="Tariff ID" value={tariff.tariff_reference_id || 'N/A'} />
                            <InfoItem label="Status">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${ {active: 'bg-green-100 text-green-800', proposed: 'bg-blue-100 text-blue-800', expired: 'bg-slate-100 text-slate-700', superseded: 'bg-purple-100 text-purple-700'}[tariff.status] || 'bg-gray-100'}`}>{tariff.status}</span>
                            </InfoItem>
                            <InfoItem label="Type" value={ownershipTypeLabel} />
                            {tariff.ownership_type === 'rocket_csp' && tariff.rocket_csp_subtype && (
                                <InfoItem label="Rocket CSP Type">
                                    <Badge variant="default">
                                        {tariff.rocket_csp_subtype === 'rocket_owned' && 'Rocket Owned'}
                                        {tariff.rocket_csp_subtype === 'blanket' && 'Blanket Tariff'}
                                        {tariff.rocket_csp_subtype === 'care_of' && 'C/O (Care Of)'}
                                    </Badge>
                                </InfoItem>
                            )}
                            <InfoItem label="Service Type" value={tariff.mode || 'N/A'} />
                            <InfoItem label="Effective Date" value={tariff.effective_date ? format(new Date(tariff.effective_date), 'MMM d, yyyy') : 'N/A'} />
                            <InfoItem label="Expiry Date" value={tariff.expiry_date ? format(new Date(tariff.expiry_date), 'MMM d, yyyy') : 'N/A'} />
                            {!tariff.is_blanket_tariff && customer && <InfoItem label="Customer" value={customer.name} />}
                            <InfoItem label="Customer Contact" value={tariff.customer_contact_name} />
                            <InfoItem label="Carrier Contact" value={tariff.carrier_contact_name} />
                        </CardContent>
                    </Card>

                    {carrier && (
                        <Card>
                            <CardHeader><CardTitle>Carrier Information</CardTitle></CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                    <InfoItem label="Carrier" value={carrier.name} />
                                    <InfoItem label="Carrier Login">
                                        {(tariff.carrier_portal_url || carrier.portal_login_url) ? (
                                            <a
                                                href={tariff.carrier_portal_url || carrier.portal_login_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:text-blue-800 hover:underline break-all"
                                            >
                                                {tariff.carrier_portal_url || carrier.portal_login_url}
                                            </a>
                                        ) : (
                                            'N/A'
                                        )}
                                    </InfoItem>
                                    <InfoItem label="Username" value={tariff.credential_username} />
                                    <InfoItem label="Password" value={tariff.credential_password} />
                                    <InfoItem label="Shipper Number/Code" value={tariff.shipper_number} />
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardHeader><CardTitle>Billing Information</CardTitle></CardHeader>
                        <CardContent>
                            {tariff.billing_company_name || tariff.billing_contact_name ? (
                                <div className="space-y-6">
                                    <div>
                                        <h4 className="text-sm font-semibold text-slate-700 mb-3">Company & Address</h4>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                            <InfoItem label="Company Name" value={tariff.billing_company_name} />
                                            <div className="col-span-2">
                                                <InfoItem label="Address">
                                                    {tariff.billing_address_line1 || tariff.billing_city ? (
                                                        <div className="text-sm">
                                                            {tariff.billing_address_line1 && <div>{tariff.billing_address_line1}</div>}
                                                            {tariff.billing_address_line2 && <div>{tariff.billing_address_line2}</div>}
                                                            {(tariff.billing_city || tariff.billing_state || tariff.billing_postal_code) && (
                                                                <div>
                                                                    {tariff.billing_city && `${tariff.billing_city}, `}
                                                                    {tariff.billing_state && `${tariff.billing_state} `}
                                                                    {tariff.billing_postal_code}
                                                                </div>
                                                            )}
                                                            {tariff.billing_country && <div>{tariff.billing_country}</div>}
                                                        </div>
                                                    ) : (
                                                        <span className="text-sm text-slate-600">N/A</span>
                                                    )}
                                                </InfoItem>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="border-t pt-4">
                                        <h4 className="text-sm font-semibold text-slate-700 mb-3">Billing Contact</h4>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                            <InfoItem label="Contact Name" value={tariff.billing_contact_name} />
                                            <InfoItem label="Email" value={tariff.billing_contact_email} />
                                            <InfoItem label="Phone" value={tariff.billing_contact_phone} />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-slate-500 italic">No billing information on file</p>
                            )}
                        </CardContent>
                    </Card>

                    {tariff.notes && (
                        <Card>
                            <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
                            <CardContent>
                                <p className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 p-4 rounded-lg">
                                    {tariff.notes}
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="activity" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Lifecycle Activity</CardTitle>
                            <CardDescription>
                                Complete history of this tariff including CSP stages, updates, documents, and communications
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <TariffActivityTimeline
                                tariffId={tariffId}
                                tariffFamilyId={tariff.tariff_family_id}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="documents" className="space-y-6">
                    <TariffDocumentManager tariff={tariff} />
                </TabsContent>

                <TabsContent value="sops" className="space-y-6">
                    <TariffSopsTab
                        tariffId={tariffId}
                        tariffFamilyId={tariff.tariff_family_id}
                        carrierName={carrier?.name || 'N/A'}
                        customerName={customer?.name || 'N/A'}
                    />
                </TabsContent>
            </Tabs>

            <EditTariffDialog
                open={isEditDialogOpen}
                onOpenChange={setIsEditDialogOpen}
                tariff={tariff}
            />
        </div>
    );
}
