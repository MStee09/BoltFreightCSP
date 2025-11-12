import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Customer, Tariff, Carrier } from '../api/entities';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { Badge } from '../components/ui/badge';
import { ArrowLeft, Edit, Mail, ExternalLink, ChevronRight } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { createPageUrl } from '../utils';
import InteractionTimeline from '../components/customers/InteractionTimeline';
import CustomerOverviewTab from '../components/customers/CustomerOverviewTab';
import EditCustomerDialog from '../components/customers/EditCustomerDialog';
import DocumentsTab from '../components/customers/DocumentsTab';
import CustomerTariffTimeline from '../components/customers/CustomerTariffTimeline';
import { EmailThreadView } from '../components/email/EmailThreadView';
import { EmailThreadBadge } from '../components/email/EmailThreadBadge';
import { useEmailComposer } from '../contexts/EmailComposerContext';
import { BackButton } from '../components/navigation/BackButton';
import { useNavigation } from '../contexts/NavigationContext';

export default function CustomerDetail() {
    const [searchParams] = useSearchParams();
    const customerId = searchParams.get('id');
    const isNew = searchParams.get('new') === 'true';
    const defaultTab = searchParams.get('tab') || 'overview';
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(isNew);
    const [emailViewMode, setEmailViewMode] = useState('threads');
    const { goBack } = useNavigation();
    const { openComposer } = useEmailComposer();

    const { data: customer, isLoading } = useQuery({
        queryKey: ['customer', customerId],
        queryFn: () => Customer.get(customerId),
        enabled: !!customerId && !isNew,
    });

    if (isNew) {
        return (
            <>
                <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
                    <div className="mb-6">
                        <BackButton fallbackPath="/Customers" />
                    </div>
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-slate-900">Create New Customer</h1>
                        <p className="text-slate-600 mt-2">Add a new customer to your database</p>
                    </div>
                </div>
                <EditCustomerDialog
                    isOpen={true}
                    onOpenChange={(open) => {
                        if (!open) goBack();
                    }}
                    customer={null}
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

    if (!customer) {
        return <div className="p-8 text-center">Customer not found. Please return to the customers list.</div>;
    }

    return (
        <>
            <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
                <div className="mb-6">
                    <BackButton fallbackPath="/Customers" />
                </div>

                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">{customer.name}</h1>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => openComposer({
                            customer: { id: customer.id, name: customer.name }
                        })}>
                            <Mail className="w-4 h-4 mr-2" /> Email
                        </Button>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
                            <Edit className="w-4 h-4 mr-2" /> Edit
                        </Button>
                    </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 mb-6 flex items-center justify-between gap-6 text-sm">
                    <div className="flex items-center gap-6">
                        {customer.account_owner && (
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-slate-600">Owner:</span>
                                <span className="text-slate-900">{customer.account_owner}</span>
                            </div>
                        )}
                        {customer.segment && (
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-slate-600">Segment:</span>
                                <Badge variant="outline" className="capitalize">
                                    {customer.segment}
                                </Badge>
                            </div>
                        )}
                        {customer.status && (
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-slate-600">Status:</span>
                                <Badge variant="secondary" className="capitalize">
                                    {customer.status}
                                </Badge>
                            </div>
                        )}
                        {customer.health_score && (
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-slate-600">Health Score:</span>
                                <span className="text-slate-900 font-medium">{customer.health_score}</span>
                            </div>
                        )}
                    </div>
                    <EmailThreadBadge
                        customerId={customerId}
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
                        <TabsTrigger value="activity">Activity</TabsTrigger>
                        <TabsTrigger value="documents">Documents</TabsTrigger>
                    </TabsList>
                    <TabsContent value="overview">
                        <CustomerOverviewTab customer={customer} />
                    </TabsContent>
                    <TabsContent value="tariffs">
                        <CustomerTariffTimeline customerId={customerId} />
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
                                <EmailThreadView customerId={customerId} />
                            ) : (
                                <InteractionTimeline customerId={customerId} entityType="customer" />
                            )}
                        </div>
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
        </>
    );
}
