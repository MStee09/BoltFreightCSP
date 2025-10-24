import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Customer, Carrier, CSPEvent } from '../api/entities';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { Badge } from '../components/ui/badge';
import { ArrowLeft, Edit, Mail } from 'lucide-react';
import { createPageUrl } from '../utils';
import { EmailComposeDialog } from '../components/email/EmailComposeDialog';
import { EmailTimeline } from '../components/email/EmailTimeline';
import CspStrategyTab from '../components/customers/CspStrategyTab';
import CspEventOverview from '../components/pipeline/CspEventOverview';
import EditCspEventDialog from '../components/pipeline/EditCspEventDialog';
import ManageCarriersDialog from '../components/pipeline/ManageCarriersDialog';
import InteractionTimeline from '../components/customers/InteractionTimeline';

export default function CspEventDetail() {
    const [searchParams] = useSearchParams();
    const eventId = searchParams.get('id');
    const defaultTab = searchParams.get('tab') || 'activity';
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
    const [isManageCarriersOpen, setIsManageCarriersOpen] = useState(false);

    const { data: event, isLoading } = useQuery({
        queryKey: ['csp_event', eventId],
        queryFn: () => CSPEvent.get(eventId),
        enabled: !!eventId,
    });

    const { data: customer } = useQuery({
        queryKey: ['customer', event?.customer_id],
        queryFn: () => Customer.get(event.customer_id),
        enabled: !!event?.customer_id,
    });

    const { data: carriers = [] } = useQuery({
        queryKey: ['carriers'],
        queryFn: () => Carrier.list(),
        initialData: []
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

    if (!event) {
        return <div className="p-8 text-center">CSP Event not found. Please return to the pipeline.</div>;
    }

    return (
        <>
            <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
                <Link to={createPageUrl("Pipeline")} className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Pipeline
                </Link>

                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">{event.title}</h1>
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

                <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 mb-6 flex items-center gap-6 text-sm">
                    {customer?.name && (
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-600">Customer:</span>
                            <span className="text-slate-900">{customer.name}</span>
                        </div>
                    )}
                    {event.stage && (
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-600">Stage:</span>
                            <Badge variant="outline" className="capitalize">
                                {event.stage.replace(/_/g, ' ')}
                            </Badge>
                        </div>
                    )}
                    {event.assigned_to && (
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-600">Owner:</span>
                            <span className="text-slate-900">{event.assigned_to}</span>
                        </div>
                    )}
                    {event.mode && (
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-600">Mode:</span>
                            <Badge variant="secondary" className="capitalize">
                                {event.mode}
                            </Badge>
                        </div>
                    )}
                </div>

                <Tabs defaultValue={defaultTab}>
                    <TabsList className="bg-slate-100">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="strategy">Strategy</TabsTrigger>
                        <TabsTrigger value="activity">Activity</TabsTrigger>
                        <TabsTrigger value="emails">Emails</TabsTrigger>
                        <TabsTrigger value="carriers">Carriers</TabsTrigger>
                    </TabsList>
                    <TabsContent value="overview">
                        <CspEventOverview event={event} customer={customer} />
                    </TabsContent>
                    <TabsContent value="strategy">
                        <CspStrategyTab customer={customer} cspEventId={eventId} cspEvent={event} />
                    </TabsContent>
                    <TabsContent value="activity">
                        <InteractionTimeline customerId={event.customer_id} entityType="customer" />
                    </TabsContent>
                    <TabsContent value="emails">
                        <EmailTimeline cspEventId={eventId} customerId={event?.customer_id} />
                    </TabsContent>
                    <TabsContent value="carriers">
                        <div className="mt-4">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold">Involved Carriers</h3>
                                <Button onClick={() => setIsManageCarriersOpen(true)}>
                                    Manage Carriers
                                </Button>
                            </div>
                            <p className="text-slate-500">Carriers participating in this event</p>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

            <EditCspEventDialog
                isOpen={isEditDialogOpen}
                onOpenChange={setIsEditDialogOpen}
                eventId={eventId}
            />

            <EmailComposeDialog
                open={isEmailDialogOpen}
                onOpenChange={setIsEmailDialogOpen}
                cspEvent={event}
                customer={customer}
            />

            <ManageCarriersDialog
                isOpen={isManageCarriersOpen}
                onOpenChange={setIsManageCarriersOpen}
                cspEventId={eventId}
            />
        </>
    );
}
