import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Customer, Carrier, CSPEvent, Document, Interaction, Tariff } from '../../api/entities';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '../ui/sheet';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Skeleton } from '../ui/skeleton';
import { Calendar, User, Clock, FileText, MessageSquare, Building2, TrendingUp, ExternalLink, Pencil, Mail, ChevronRight } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import EditCspEventDialog from './EditCspEventDialog';
import { EmailComposeDialog } from '../email/EmailComposeDialog';
import { EmailTimeline } from '../email/EmailTimeline';
import CspStrategyTab from '../customers/CspStrategyTab';
import CustomerDetailSheet from '../customers/CustomerDetailSheet';
import { useToast } from '../ui/use-toast';

const STAGES = [
    "discovery",
    "data_room_ready",
    "rfp_sent",
    "qa_round",
    "round_1",
    "final_offers",
    "awarded",
    "implementation",
    "validation",
    "live",
    "renewal_watch"
];

export default function CspEventDetailSheet({ isOpen, onOpenChange, eventId }) {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
    const [isCustomerDetailOpen, setIsCustomerDetailOpen] = useState(false);

    const { data: event, isLoading: isLoadingEvent } = useQuery({
        queryKey: ['csp_event', eventId],
        queryFn: () => CSPEvent.get(eventId),
        enabled: !!eventId && isOpen,
    });

    const { data: customer, isLoading: isLoadingCustomer } = useQuery({
        queryKey: ['customer', event?.customer_id],
        queryFn: () => Customer.get(event.customer_id),
        enabled: !!event?.customer_id,
    });

    const { data: carriers = [], isLoading: isLoadingCarriers } = useQuery({
        queryKey: ['carriers'],
        queryFn: () => Carrier.list(),
        enabled: isOpen,
        initialData: []
    });

    const { data: documents = [], isLoading: isLoadingDocuments } = useQuery({
        queryKey: ['documents', { csp_event_id: eventId }],
        queryFn: () => Document.filter({ csp_event_id: eventId }),
        enabled: !!eventId && isOpen,
        initialData: []
    });

    const { data: interactions = [], isLoading: isLoadingInteractions } = useQuery({
        queryKey: ['interactions', event?.customer_id, 'customer'],
        queryFn: () => Interaction.filter({
            entity_id: event.customer_id,
            entity_type: 'customer',
            order_by: '-created_date'
        }),
        enabled: !!event?.customer_id && isOpen,
        initialData: []
    });

    const { data: tariffs = [], isLoading: isLoadingTariffs } = useQuery({
        queryKey: ['tariffs', { csp_event_id: eventId }],
        queryFn: () => Tariff.filter({ csp_event_id: eventId }),
        enabled: !!eventId && isOpen,
        initialData: []
    });

    const eventCarriers = event?.carrier_ids?.map(id => carriers.find(c => c.id === id)).filter(Boolean) || [];
    const eventInteractions = interactions.filter(i => i.metadata?.csp_event_id === eventId);

    const isLoading = isLoadingEvent || isLoadingCustomer;

    const moveToNextStage = useMutation({
        mutationFn: async (newStage) => {
            await CSPEvent.update(eventId, { stage: newStage });
            await Interaction.create({
                entity_type: 'customer',
                entity_id: event.customer_id,
                interaction_type: 'stage_change',
                summary: `CSP Stage: ${event.stage} → ${newStage}`,
                details: `The deal "${event.title}" was moved to the "${newStage.replace(/_/g, ' ')}" stage.`,
                metadata: {
                    from_stage: event.stage,
                    to_stage: newStage,
                    csp_event_id: eventId
                }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['csp_event', eventId] });
            queryClient.invalidateQueries({ queryKey: ['csp_events'] });
            queryClient.invalidateQueries({ queryKey: ['interactions'] });
            toast({
                title: "Stage Updated",
                description: "CSP event stage has been updated successfully.",
            });
        },
        onError: (error) => {
            toast({
                title: "Error",
                description: error.message || "Failed to update stage.",
                variant: "destructive",
            });
        }
    });

    const getCurrentStageLabel = (stage) => {
        if (!stage) return 'Select Stage';
        const stageIndex = STAGES.indexOf(stage);
        const stageDisplay = stage.replace(/_/g, ' ');
        return `${stageIndex + 1}. ${stageDisplay.charAt(0).toUpperCase() + stageDisplay.slice(1)}`;
    };

    const getPriorityColor = (priority) => {
        const colors = {
            urgent: 'destructive',
            high: 'default',
            medium: 'secondary',
            low: 'outline'
        };
        return colors[priority] || 'secondary';
    };

    const getStageColor = (days) => {
        if (days > 14) return 'text-red-600';
        if (days > 7) return 'text-amber-600';
        return 'text-green-600';
    };

    if (!isOpen) return null;

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-2xl overflow-y-auto">
                <SheetHeader className="mb-6">
                    <div className="flex items-start justify-between">
                        <div>
                            <SheetTitle className="text-2xl">CSP Event Details</SheetTitle>
                            <SheetDescription>View and manage this customer savings project</SheetDescription>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsEmailDialogOpen(true)}
                                className="gap-2"
                            >
                                <Mail className="w-4 h-4" />
                                Email
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsEditDialogOpen(true)}
                                className="gap-2"
                            >
                                <Pencil className="w-4 h-4" />
                                Edit
                            </Button>
                            <Select
                                value={event?.stage}
                                onValueChange={(value) => {
                                    if (value !== event?.stage) {
                                        moveToNextStage.mutate(value);
                                    }
                                }}
                                disabled={moveToNextStage.isPending}
                            >
                                <SelectTrigger className="h-9 w-[180px]">
                                    <SelectValue>
                                        {event?.stage ? getCurrentStageLabel(event.stage) : 'Select Stage'}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {STAGES.map((stage, index) => (
                                        <SelectItem
                                            key={stage}
                                            value={stage}
                                            className="relative"
                                        >
                                            <div className="flex items-center gap-2">
                                                {event?.stage === stage && (
                                                    <div className="w-2 h-2 rounded-full bg-blue-600" />
                                                )}
                                                <span className="capitalize">
                                                    {index + 1}. {stage.replace(/_/g, ' ')}
                                                </span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </SheetHeader>

                {isLoading ? (
                    <div className="space-y-4">
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-64 w-full" />
                    </div>
                ) : event ? (
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <CardTitle className="text-xl mb-2">{event.title}</CardTitle>
                                        <div className="flex items-center gap-2 mb-3">
                                            <Badge variant={getPriorityColor(event.priority)} className="capitalize">
                                                {event.priority}
                                            </Badge>
                                            <Badge variant="outline" className="capitalize">
                                                {event.stage?.replace(/_/g, ' ')}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex items-start gap-2">
                                        <Building2 className="w-4 h-4 text-slate-500 mt-0.5" />
                                        <div>
                                            <p className="text-xs text-slate-500">Customer</p>
                                            <button
                                                onClick={() => setIsCustomerDetailOpen(true)}
                                                className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline text-left"
                                            >
                                                {customer?.name || 'Loading...'}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <User className="w-4 h-4 text-slate-500 mt-0.5" />
                                        <div>
                                            <p className="text-xs text-slate-500">Assigned To</p>
                                            <p className="text-sm font-medium text-slate-900">{event.assigned_to || 'Unassigned'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <Calendar className="w-4 h-4 text-slate-500 mt-0.5" />
                                        <div>
                                            <p className="text-xs text-slate-500">Created</p>
                                            <p className="text-sm font-medium text-slate-900">
                                                {format(new Date(event.created_date), 'MMM d, yyyy')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <Clock className="w-4 h-4 text-slate-500 mt-0.5" />
                                        <div>
                                            <p className="text-xs text-slate-500">Days in Stage</p>
                                            <p className={`text-sm font-medium ${getStageColor(event.days_in_stage || 0)}`}>
                                                {event.days_in_stage || 0} days
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {event.description && (
                                    <div className="pt-3 border-t">
                                        <p className="text-xs text-slate-500 mb-1">Description</p>
                                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{event.description}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Tabs defaultValue="activity" className="w-full">
                            <TabsList className="grid w-full grid-cols-6">
                                <TabsTrigger value="activity">Activity</TabsTrigger>
                                <TabsTrigger value="strategy">Strategy</TabsTrigger>
                                <TabsTrigger value="emails">Emails</TabsTrigger>
                                <TabsTrigger value="carriers">Carriers</TabsTrigger>
                                <TabsTrigger value="tariffs">Tariffs</TabsTrigger>
                                <TabsTrigger value="documents">Documents</TabsTrigger>
                            </TabsList>

                            <TabsContent value="activity" className="mt-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">Timeline</CardTitle>
                                        <CardDescription>Activity related to this event</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {isLoadingInteractions ? (
                                            <div className="space-y-3">
                                                <Skeleton className="h-16 w-full" />
                                                <Skeleton className="h-16 w-full" />
                                            </div>
                                        ) : eventInteractions.length > 0 ? (
                                            <div className="space-y-4">
                                                {eventInteractions.map((interaction) => (
                                                    <div key={interaction.id} className="border-l-2 border-blue-500 pl-4 pb-3">
                                                        <div className="flex items-start gap-2 mb-1">
                                                            <MessageSquare className="w-4 h-4 text-slate-500 mt-0.5" />
                                                            <div className="flex-1">
                                                                <Badge variant="outline" className="capitalize text-xs mb-1">
                                                                    {interaction.interaction_type?.replace(/_/g, ' ')}
                                                                </Badge>
                                                                <p className="font-medium text-sm text-slate-900">{interaction.summary}</p>
                                                                {interaction.details && (
                                                                    <p className="text-xs text-slate-600 mt-1">{interaction.details}</p>
                                                                )}
                                                                <p className="text-xs text-slate-500 mt-1">
                                                                    {formatDistanceToNow(new Date(interaction.created_date), { addSuffix: true })}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-slate-500 text-center py-8">No activity recorded yet</p>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="strategy" className="mt-4">
                                <CspStrategyTab customer={customer} cspEventId={eventId} />
                            </TabsContent>

                            <TabsContent value="emails" className="mt-4">
                                <EmailTimeline cspEventId={eventId} customerId={event?.customer_id} />
                            </TabsContent>

                            <TabsContent value="carriers" className="mt-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">Involved Carriers</CardTitle>
                                        <CardDescription>Carriers participating in this event</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {isLoadingCarriers ? (
                                            <div className="space-y-3">
                                                <Skeleton className="h-16 w-full" />
                                                <Skeleton className="h-16 w-full" />
                                            </div>
                                        ) : eventCarriers.length > 0 ? (
                                            <div className="space-y-3">
                                                {eventCarriers.map((carrier) => (
                                                    <div key={carrier.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50">
                                                        <div>
                                                            <p className="font-medium text-sm text-slate-900">{carrier.name}</p>
                                                            <p className="text-xs text-slate-500 capitalize">{carrier.service_type}</p>
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => window.open(`/carriers/${carrier.id}`, '_blank')}
                                                        >
                                                            <ExternalLink className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-slate-500 text-center py-8">No carriers assigned yet</p>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="tariffs" className="mt-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">Generated Tariffs</CardTitle>
                                        <CardDescription>Tariffs created from this CSP event</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {isLoadingTariffs ? (
                                            <div className="space-y-3">
                                                <Skeleton className="h-16 w-full" />
                                                <Skeleton className="h-16 w-full" />
                                            </div>
                                        ) : tariffs.length > 0 ? (
                                            <div className="space-y-3">
                                                {tariffs.map((tariff) => {
                                                    const tariffCarriers = (tariff.carrier_ids || []).map(id => carriers.find(c => c.id === id)).filter(Boolean);
                                                    const firstCarrier = tariffCarriers[0];
                                                    return (
                                                        <a
                                                            key={tariff.id}
                                                            href={`/tariffs/${tariff.id}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors block"
                                                        >
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <p className="font-medium text-sm text-slate-900">
                                                                        {firstCarrier?.name || (tariffCarriers.length > 1 ? `${tariffCarriers.length} carriers` : 'Unknown Carrier')}
                                                                    </p>
                                                                    <Badge variant={tariff.status === 'active' ? 'default' : 'outline'} className={tariff.status === 'active' ? 'bg-green-100 text-green-800' : ''}>
                                                                        {tariff.status}
                                                                    </Badge>
                                                                </div>
                                                                <p className="text-xs text-slate-600">Version: {tariff.version}</p>
                                                                <p className="text-xs text-slate-500 mt-1">
                                                                    Effective: {format(new Date(tariff.effective_date), 'MMM d, yyyy')} • Expires: {format(new Date(tariff.expiry_date), 'MMM d, yyyy')}
                                                                </p>
                                                            </div>
                                                            <ExternalLink className="w-4 h-4 text-slate-400 ml-2 flex-shrink-0" />
                                                        </a>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-slate-500 text-center py-8">No tariffs generated from this event yet</p>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="documents" className="mt-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">Attached Documents</CardTitle>
                                        <CardDescription>Files related to this event</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {isLoadingDocuments ? (
                                            <div className="space-y-3">
                                                <Skeleton className="h-16 w-full" />
                                                <Skeleton className="h-16 w-full" />
                                            </div>
                                        ) : documents.length > 0 ? (
                                            <div className="space-y-3">
                                                {documents.map((doc) => (
                                                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50">
                                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                                            <FileText className="w-5 h-5 text-slate-500 flex-shrink-0" />
                                                            <div className="min-w-0">
                                                                <p className="font-medium text-sm text-slate-900 truncate">{doc.file_name}</p>
                                                                <p className="text-xs text-slate-500">
                                                                    {format(new Date(doc.upload_date), 'MMM d, yyyy')}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <Badge variant="secondary" className="capitalize text-xs">
                                                            {doc.document_type?.replace(/_/g, ' ')}
                                                        </Badge>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-slate-500 text-center py-8">No documents attached yet</p>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </div>
                ) : (
                    <p className="text-center text-slate-500 py-8">Event not found</p>
                )}
            </SheetContent>
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
                carrier={eventCarriers[0]}
            />
            <CustomerDetailSheet
                isOpen={isCustomerDetailOpen}
                onOpenChange={setIsCustomerDetailOpen}
                customerId={event?.customer_id}
            />
        </Sheet>
    );
}
