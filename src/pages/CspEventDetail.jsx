import React, { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Customer, Carrier, CSPEvent, CSPEventCarrier } from '../api/entities';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import { ArrowLeft, Edit, Mail, Phone, ExternalLink, Building2, Trash2 } from 'lucide-react';
import { createPageUrl } from '../utils';
import { useEmailComposer } from '../contexts/EmailComposerContext';
import { EmailTimeline } from '../components/email/EmailTimeline';
import { EmailThreadView } from '../components/email/EmailThreadView';
import { EmailThreadBadge } from '../components/email/EmailThreadBadge';
import CspStrategyTab from '../components/customers/CspStrategyTab';
import CspEventOverview from '../components/pipeline/CspEventOverview';
import EditCspEventDialog from '../components/pipeline/EditCspEventDialog';
import ManageCarriersDialog from '../components/pipeline/ManageCarriersDialog';
import InteractionTimeline from '../components/customers/InteractionTimeline';
import DocumentsTab from '../components/customers/DocumentsTab';
import VolumeSpendTab from '../components/pipeline/VolumeSpendTab';
import CspCarriersTab from '../components/pipeline/CspCarriersTab';
import { BackButton } from '../components/navigation/BackButton';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export default function CspEventDetail() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const eventId = searchParams.get('id');
    const defaultTab = searchParams.get('tab') || 'overview';
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isManageCarriersOpen, setIsManageCarriersOpen] = useState(false);
    const [emailViewMode, setEmailViewMode] = useState('threads');
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const { openComposer } = useEmailComposer();
    const queryClient = useQueryClient();

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

    const { data: eventCarrierAssignments = [] } = useQuery({
        queryKey: ['csp_event_carriers', eventId],
        queryFn: () => CSPEventCarrier.filter({ csp_event_id: eventId }),
        enabled: !!eventId
    });

    const assignedCarriers = eventCarrierAssignments
        .map(assignment => ({
            ...assignment,
            carrier: carriers.find(c => c.id === assignment.carrier_id)
        }))
        .filter(assignment => assignment.carrier);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await CSPEvent.delete(eventId);
            toast.success('CSP event deleted successfully');
            queryClient.invalidateQueries(['csp_events']);
            navigate('/Pipeline');
        } catch (error) {
            console.error('Error deleting CSP event:', error);
            toast.error('Failed to delete CSP event');
        } finally {
            setIsDeleting(false);
            setIsDeleteDialogOpen(false);
        }
    };

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
                <div className="mb-6 -ml-2">
                    <BackButton fallbackPath="/Pipeline" />
                </div>

                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">{event.title}</h1>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => openComposer({
                            cspEvent: { id: event.id, title: event.title },
                            customer: customer ? { id: customer.id, name: customer.name } : null
                        })}>
                            <Mail className="w-4 h-4 mr-2" /> Email
                        </Button>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
                            <Edit className="w-4 h-4 mr-2" /> Edit
                        </Button>
                        <Button
                            variant="outline"
                            className="text-red-600 hover:text-red-700 hover:border-red-300"
                            onClick={() => setIsDeleteDialogOpen(true)}
                        >
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </Button>
                    </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 mb-6 flex items-center justify-between gap-6 text-sm">
                    <div className="flex items-center gap-6">
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
                    <EmailThreadBadge
                        cspEventId={eventId}
                        onClick={() => {
                            const emailsTab = document.querySelector('[value="emails"]');
                            if (emailsTab) emailsTab.click();
                        }}
                    />
                </div>

                <Tabs defaultValue={defaultTab}>
                    <TabsList className="bg-slate-100">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="strategy">Strategy</TabsTrigger>
                        <TabsTrigger value="volume-spend">Volume & Spend</TabsTrigger>
                        <TabsTrigger value="documents">Documents</TabsTrigger>
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
                    <TabsContent value="volume-spend">
                        <VolumeSpendTab cspEvent={event} cspEventId={eventId} />
                    </TabsContent>
                    <TabsContent value="documents">
                        <DocumentsTab cspEventId={eventId} entityType="csp_event" />
                    </TabsContent>
                    <TabsContent value="activity">
                        <InteractionTimeline customerId={event.customer_id} entityType="customer" />
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
                                <EmailThreadView cspEventId={eventId} />
                            ) : (
                                <EmailTimeline
                                    cspEventId={eventId}
                                    customerId={event?.customer_id}
                                    onComposeClick={() => openComposer({
                                        cspEvent: { id: event.id, title: event.title },
                                        customer: customer ? { id: customer.id, name: customer.name } : null
                                    })}
                                />
                            )}
                        </div>
                    </TabsContent>
                    <TabsContent value="carriers" className="mt-4">
                        <CspCarriersTab cspEvent={event} />
                    </TabsContent>
                </Tabs>
            </div>

            <EditCspEventDialog
                isOpen={isEditDialogOpen}
                onOpenChange={setIsEditDialogOpen}
                eventId={eventId}
            />

            <ManageCarriersDialog
                isOpen={isManageCarriersOpen}
                onOpenChange={setIsManageCarriersOpen}
                cspEventId={eventId}
            />

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete CSP Event</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{event?.title}"? This action cannot be undone.
                            All associated carriers, documents, activities, and emails will remain but will no longer be linked to this event.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isDeleting ? 'Deleting...' : 'Delete Event'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
