import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Customer, Tariff, Carrier } from '../api/entities';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { Badge } from '../components/ui/badge';
import { ArrowLeft, Edit, Mail, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { createPageUrl } from '../utils';
import InteractionTimeline from '../components/customers/InteractionTimeline';
import CustomerOverviewTab from '../components/customers/CustomerOverviewTab';
import EditCustomerDialog from '../components/customers/EditCustomerDialog';
import DocumentsTab from '../components/customers/DocumentsTab';
import { EmailComposeDialog } from '../components/email/EmailComposeDialog';

const CustomerTariffTimeline = ({ customerId }) => {
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
        return <div className="py-8 text-center text-slate-500 border border-dashed rounded-lg mt-4">No tariffs found for this customer.</div>
    }

    return (
        <div className="space-y-3 mt-4">
            {tariffs.map(tariff => {
                const carrierIds = tariff.carrier_ids || [];
                const firstCarrier = carriers.find(c => carrierIds.includes(c.id));
                return (
                    <Link
                        key={tariff.id}
                        to={createPageUrl(`CarrierDetail?id=${firstCarrier?.id}&tab=tariffs&highlight=${tariff.id}`)}
                        className="block p-3 rounded-lg border hover:bg-slate-50 transition-colors"
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-semibold">{firstCarrier?.name || (carrierIds.length > 1 ? `${carrierIds.length} carriers` : 'Multiple Carriers')}</p>
                                <p className="text-sm text-slate-600">Version: {tariff.version}</p>
                            </div>
                            <div className="flex items-center gap-2">
                               <Badge variant={tariff.status === 'active' ? 'default' : 'outline'} className={tariff.status === 'active' ? 'bg-green-100 text-green-800' : ''}>{tariff.status}</Badge>
                               <ExternalLink className="w-4 h-4 text-slate-400" />
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                            Effective: {format(new Date(tariff.effective_date), 'MMM d, yyyy')} • Expires: {format(new Date(tariff.expiry_date), 'MMM d, yyyy')}
                        </p>
                    </Link>
                );
            })}
        </div>
    );
};

export default function CustomerDetail() {
    const [searchParams] = useSearchParams();
    const customerId = searchParams.get('id');
    const defaultTab = searchParams.get('tab') || 'overview';
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);

    const { data: customer, isLoading } = useQuery({
        queryKey: ['customer', customerId],
        queryFn: () => Customer.get(customerId),
        enabled: !!customerId,
    });

    if (isLoading) {
        return (
            <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
                <Skeleton className="h-8 w-1/4 mb-2" />
                <Skeleton className="h-6 w-1/3 mb-8" />
                <Skeleton className="h-[400px] w-full" />
            </div>
        );
    }

    if (!customer) {
        return <div className="p-8 text-center">Customer not found. Please return to the customers list.</div>;
    }

    return (
        <>
            <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
                <Link to={createPageUrl("Customers")} className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6">
                    <ArrowLeft className="w-4 h-4" />
                    Back to All Customers
                </Link>

                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">{customer.name}</h1>
                        <p className="text-slate-600 mt-1">Owner: {customer.account_owner} • Segment: <span className="capitalize">{customer.segment}</span></p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setIsEmailDialogOpen(true)}>
                            <Mail className="w-4 h-4 mr-2" /> Email
                        </Button>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
                            <Edit className="w-4 h-4 mr-2" /> Edit
                        </Button>
                    </div>
                </div>

                <Tabs defaultValue={defaultTab}>
                    <TabsList className="bg-slate-100">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="tariffs">Tariffs</TabsTrigger>
                        <TabsTrigger value="activity">Activity</TabsTrigger>
                        <TabsTrigger value="documents">Documents</TabsTrigger>
                    </TabsList>
                    <TabsContent value="overview">
                        <CustomerOverviewTab customer={customer} />
                    </TabsContent>
                    <TabsContent value="tariffs">
                        <CustomerTariffTimeline customerId={customerId} />
                    </TabsContent>
                    <TabsContent value="activity">
                        <InteractionTimeline customerId={customerId} entityType="customer" />
                    </TabsContent>
                    <TabsContent value="documents">
                        <DocumentsTab customerId={customerId} />
                    </TabsContent>
                </Tabs>
            </div>

            <EditCustomerDialog
                customer={customer}
                isOpen={isEditDialogOpen}
                onOpenChange={setIsEditDialogOpen}
            />

            <EmailComposeDialog
                open={isEmailDialogOpen}
                onOpenChange={setIsEmailDialogOpen}
                customer={customer}
            />
        </>
    );
}
