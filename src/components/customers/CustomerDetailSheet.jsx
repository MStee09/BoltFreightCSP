
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Customer, Carrier, Tariff, CSPEvent, Task, Interaction, Alert, Shipment, LostOpportunity, ReportSnapshot } from '../../api/entities';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '../ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Skeleton } from '../ui/skeleton';
import { ExternalLink, Edit } from 'lucide-react';
import InteractionTimeline from './InteractionTimeline';
import { createPageUrl } from '../../utils';
import { Link } from 'react-router-dom';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { format } from 'date-fns';
import CustomerOverviewTab from './CustomerOverviewTab';
import CspStrategyTab from './CspStrategyTab';
import EditCustomerDialog from './EditCustomerDialog';
import DocumentsTab from './DocumentsTab'; // Import the new tab component

const PlaceholderTab = ({ title }) => (
    <div className="py-8 text-center text-slate-500 border border-dashed rounded-lg mt-4">
        <p className="font-semibold">{title} Panel</p>
        <p className="text-sm">This section is under construction.</p>
    </div>
);

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
                // Ensure carrier_ids is an array before using it
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

export default function CustomerDetailSheet({ customerId, isOpen, onOpenChange }) {
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    const { data: customer, isLoading: isLoadingCustomer } = useQuery({
        queryKey: ['customer', customerId],
        queryFn: () => Customer.get(customerId),
        enabled: !!customerId,
    });

    const { data: tasks = [], isLoading: isLoadingTasks } = useQuery({
        queryKey: ['tasks', customerId],
        queryFn: () => Task.filter({ entity_id: customerId, entity_type: 'customer' }),
        enabled: !!customerId,
        initialData: []
    });

    const { data: interactions = [], isLoading: isLoadingInteractions } = useQuery({
        queryKey: ['interactions', customerId, 'customer'],
        queryFn: () => Interaction.filter({ entity_id: customerId, entity_type: 'customer', order_by: '-created_date' }),
        enabled: !!customerId,
        initialData: []
    });

    const isLoading = isLoadingCustomer || isLoadingTasks || isLoadingInteractions;
    const openTasks = tasks.filter(t => t.status === 'open' || t.status === 'in_progress');

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-3xl w-full p-0">
                {isLoading ? (
                    <div className="p-6 space-y-4">
                        <Skeleton className="h-8 w-3/4" />
                        <Skeleton className="h-5 w-1/2" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-64 w-full" />
                    </div>
                ) : customer ? (
                    <div className="h-full flex flex-col">
                        <SheetHeader className="p-6 border-b">
                            <div className="flex items-start justify-between">
                                <div>
                                    <SheetTitle className="text-2xl font-bold text-slate-900">{customer.name}</SheetTitle>
                                    <SheetDescription>Owner: {customer.account_owner} • Segment: <span className="capitalize">{customer.segment}</span></SheetDescription>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsEditDialogOpen(true)}
                                    className="gap-2"
                                >
                                    <Edit className="w-4 h-4" />
                                    Edit
                                </Button>
                            </div>
                        </SheetHeader>
                        <div className="flex-grow p-6 overflow-y-auto">
                            <Tabs defaultValue="overview">
                                <TabsList>
                                    <TabsTrigger value="overview">Overview</TabsTrigger>
                                    <TabsTrigger value="csp_strategy">CSP Strategy</TabsTrigger>
                                    <TabsTrigger value="tariffs">Tariff Timeline</TabsTrigger>
                                    <TabsTrigger value="interactions">Interactions</TabsTrigger>
                                    <TabsTrigger value="documents">Documents</TabsTrigger>
                                </TabsList>
                                <TabsContent value="overview">
                                    <CustomerOverviewTab customer={customer} />
                                </TabsContent>
                                <TabsContent value="csp_strategy">
                                    <CspStrategyTab customer={customer} />
                                </TabsContent>
                                <TabsContent value="tariffs">
                                    <CustomerTariffTimeline customerId={customerId} />
                                </TabsContent>
                                <TabsContent value="interactions">
                                    <InteractionTimeline customerId={customerId} entityType="customer" />
                                </TabsContent>
                                <TabsContent value="documents">
                                    <DocumentsTab customerId={customerId} />
                                </TabsContent>
                            </Tabs>
                        </div>
                    </div>
                ) : (
                     <div className="p-6">Customer data not available.</div>
                )}
            </SheetContent>
            <EditCustomerDialog
                customer={customer}
                isOpen={isEditDialogOpen}
                onOpenChange={setIsEditDialogOpen}
            />
        </Sheet>
    );
}
