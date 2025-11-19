import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Carrier, CSPEventCarrier, CarrierContact, CSPEvent } from '../../api/entities';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { useToast } from '../ui/use-toast';
import { Search, Plus, Mail, Phone, User, X, ExternalLink } from 'lucide-react';
import { Separator } from '../ui/separator';
import { ScrollArea } from '../ui/scroll-area';
import { createPageUrl } from '../../utils';
import { CarrierBlockerWarning } from './CarrierBlockerWarning';

export default function ManageCarriersDialog({ isOpen, onOpenChange, cspEventId }) {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCarriers, setSelectedCarriers] = useState(new Set());
    const [ownershipTypes, setOwnershipTypes] = useState(new Map());

    const { data: allCarriers = [] } = useQuery({
        queryKey: ['carriers'],
        queryFn: () => Carrier.list(),
        enabled: isOpen
    });

    const { data: cspEvent } = useQuery({
        queryKey: ['csp_event', cspEventId],
        queryFn: () => CSPEvent.get(cspEventId),
        enabled: !!cspEventId && isOpen
    });

    const { data: eventCarrierAssignments = [] } = useQuery({
        queryKey: ['csp_event_carriers', cspEventId],
        queryFn: () => CSPEventCarrier.filter({ csp_event_id: cspEventId }),
        enabled: !!cspEventId && isOpen
    });

    const assignedCarrierIds = new Set(eventCarrierAssignments.map(ec => ec.carrier_id));

    const addCarrierMutation = useMutation({
        mutationFn: async ({ carrierId, ownershipType }) => {
            return CSPEventCarrier.create({
                csp_event_id: cspEventId,
                carrier_id: carrierId,
                status: 'invited',
                invited_at: new Date().toISOString(),
                ownership_type: ownershipType || 'rocket_csp'
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['csp_event_carriers', cspEventId]);
            toast({
                title: 'Carrier added',
                description: 'Carrier has been added to this CSP event'
            });
        },
        onError: (error) => {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive'
            });
        }
    });

    const removeCarrierMutation = useMutation({
        mutationFn: async (assignmentId) => {
            return CSPEventCarrier.delete(assignmentId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['csp_event_carriers', cspEventId]);
            toast({
                title: 'Carrier removed',
                description: 'Carrier has been removed from this CSP event'
            });
        },
        onError: (error) => {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive'
            });
        }
    });

    const updateOwnershipTypeMutation = useMutation({
        mutationFn: async ({ assignmentId, ownershipType }) => {
            return CSPEventCarrier.update(assignmentId, { ownership_type: ownershipType });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['csp_event_carriers', cspEventId]);
            toast({
                title: 'Ownership type updated',
                description: 'Carrier ownership type has been updated'
            });
        },
        onError: (error) => {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive'
            });
        }
    });

    const filteredCarriers = allCarriers.filter(carrier =>
        carrier.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        carrier.scac_code?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const availableCarriers = filteredCarriers.filter(c => !assignedCarrierIds.has(c.id));
    const assignedCarriers = eventCarrierAssignments
        .map(ec => ({
            ...ec,
            carrier: allCarriers.find(c => c.id === ec.carrier_id)
        }))
        .filter(ec => ec.carrier);

    const handleToggleCarrier = (carrierId) => {
        const newSelected = new Set(selectedCarriers);
        if (newSelected.has(carrierId)) {
            newSelected.delete(carrierId);
            const newTypes = new Map(ownershipTypes);
            newTypes.delete(carrierId);
            setOwnershipTypes(newTypes);
        } else {
            newSelected.add(carrierId);
            const newTypes = new Map(ownershipTypes);
            newTypes.set(carrierId, 'rocket_csp');
            setOwnershipTypes(newTypes);
        }
        setSelectedCarriers(newSelected);
    };

    const handleOwnershipTypeChange = (carrierId, ownershipType) => {
        const newTypes = new Map(ownershipTypes);
        newTypes.set(carrierId, ownershipType);
        setOwnershipTypes(newTypes);
    };

    const handleAddSelected = async () => {
        try {
            for (const carrierId of selectedCarriers) {
                await addCarrierMutation.mutateAsync({
                    carrierId,
                    ownershipType: ownershipTypes.get(carrierId) || 'rocket_csp'
                });
            }
            setSelectedCarriers(new Set());
            setOwnershipTypes(new Map());
            setSearchQuery('');
        } catch (error) {
            console.error('Error adding carriers:', error);
        }
    };

    const handleRemoveCarrier = (assignmentId) => {
        removeCarrierMutation.mutate(assignmentId);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Manage Carriers</DialogTitle>
                    <DialogDescription>
                        Add carriers to this CSP event to begin the bid process
                    </DialogDescription>
                </DialogHeader>

                {cspEvent?.customer_id && (
                    <div className="mb-4">
                        <CarrierBlockerWarning
                            customerId={cspEvent.customer_id}
                            selectedCarrierIds={Array.from(selectedCarriers)}
                        />
                    </div>
                )}

                <div className="grid grid-cols-2 gap-6 flex-1 min-h-0">
                    <div className="flex flex-col space-y-4 min-h-0">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label className="text-sm font-semibold">Available Carriers</Label>
                                <p className="text-xs text-slate-500 mb-3">Select carriers to add to this event</p>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    onOpenChange(false);
                                    navigate(createPageUrl('CarrierDetail?new=true'));
                                }}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                                <Plus className="w-4 h-4 mr-1" />
                                Add Carrier
                            </Button>
                        </div>

                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder="Search carriers..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        <div className="flex-1 min-h-0 border rounded-lg">
                            <ScrollArea className="h-full">
                                <div className="p-3">
                                    {availableCarriers.length === 0 ? (
                                        <p className="text-sm text-slate-500 text-center py-8">
                                            {searchQuery ? 'No carriers found' : 'All carriers have been added'}
                                        </p>
                                    ) : (
                                        <div className="space-y-2">
                                            {availableCarriers.map((carrier) => (
                                                <div
                                                    key={carrier.id}
                                                    className="flex items-start gap-3 p-3 border rounded-lg hover:bg-slate-50 transition-colors"
                                                >
                                                    <Checkbox
                                                        checked={selectedCarriers.has(carrier.id)}
                                                        onCheckedChange={() => handleToggleCarrier(carrier.id)}
                                                        className="mt-1"
                                                    />
                                                    <div className="flex-1 min-w-0 space-y-2">
                                                        <div className="cursor-pointer" onClick={() => handleToggleCarrier(carrier.id)}>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <p className="font-medium text-sm">{carrier.name}</p>
                                                                {carrier.scac_code && (
                                                                    <Badge variant="outline" className="text-xs">
                                                                        {carrier.scac_code}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            {carrier.service_type && (
                                                                <p className="text-xs text-slate-500 capitalize">{carrier.service_type}</p>
                                                            )}
                                                            {carrier.contact_email && (
                                                                <div className="flex items-center gap-1 mt-1">
                                                                    <Mail className="w-3 h-3 text-slate-400" />
                                                                    <p className="text-xs text-slate-600">{carrier.contact_email}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                        {selectedCarriers.has(carrier.id) && (
                                                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                                <Label className="text-xs text-slate-600 min-w-fit">Ownership:</Label>
                                                                <Select
                                                                    value={ownershipTypes.get(carrier.id) || 'rocket_csp'}
                                                                    onValueChange={(value) => handleOwnershipTypeChange(carrier.id, value)}
                                                                >
                                                                    <SelectTrigger className="h-7 text-xs">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="rocket_csp">Rocket CSP</SelectItem>
                                                                        <SelectItem value="rocket_blanket">Rocket Blanket</SelectItem>
                                                                        <SelectItem value="customer_direct">Customer Direct</SelectItem>
                                                                        <SelectItem value="priority1_blanket">Priority 1 Blanket</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>

                        <Button
                            onClick={handleAddSelected}
                            disabled={selectedCarriers.size === 0 || addCarrierMutation.isPending}
                            className="w-full"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add {selectedCarriers.size > 0 ? `${selectedCarriers.size} ` : ''}Selected
                        </Button>
                    </div>

                    <div className="flex flex-col space-y-4 min-h-0">
                        <div>
                            <Label className="text-sm font-semibold">Assigned Carriers ({assignedCarriers.length})</Label>
                            <p className="text-xs text-slate-500 mb-3">Carriers participating in this event</p>
                        </div>

                        <div className="flex-1 min-h-0 border rounded-lg">
                            <ScrollArea className="h-full">
                                <div className="p-3">
                                    {assignedCarriers.length === 0 ? (
                                        <p className="text-sm text-slate-500 text-center py-8">
                                            No carriers assigned yet
                                        </p>
                                    ) : (
                                        <div className="space-y-3">
                                            {assignedCarriers.map((assignment) => (
                                                <div key={assignment.id} className="border rounded-lg p-3 space-y-2">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <p className="font-medium text-sm">{assignment.carrier.name}</p>
                                                                {assignment.carrier.scac_code && (
                                                                    <Badge variant="outline" className="text-xs">
                                                                        {assignment.carrier.scac_code}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <Badge
                                                                variant={assignment.status === 'awarded' ? 'default' : 'outline'}
                                                                className="text-xs capitalize"
                                                            >
                                                                {assignment.status}
                                                            </Badge>
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleRemoveCarrier(assignment.id)}
                                                            disabled={removeCarrierMutation.isPending}
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </Button>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <Label className="text-xs text-slate-600 min-w-fit">Ownership:</Label>
                                                        <Select
                                                            value={assignment.ownership_type || 'rocket_csp'}
                                                            onValueChange={(value) => updateOwnershipTypeMutation.mutate({
                                                                assignmentId: assignment.id,
                                                                ownershipType: value
                                                            })}
                                                        >
                                                            <SelectTrigger className="h-7 text-xs">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="rocket_csp">Rocket CSP</SelectItem>
                                                                <SelectItem value="rocket_blanket">Rocket Blanket</SelectItem>
                                                                <SelectItem value="customer_direct">Customer Direct</SelectItem>
                                                                <SelectItem value="priority1_blanket">Priority 1 Blanket</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    {assignment.carrier.contact_email && (
                                                        <div className="flex items-center gap-2 text-xs text-slate-600">
                                                            <Mail className="w-3 h-3" />
                                                            <span>{assignment.carrier.contact_email}</span>
                                                        </div>
                                                    )}

                                                    {assignment.carrier.contact_phone && (
                                                        <div className="flex items-center gap-2 text-xs text-slate-600">
                                                            <Phone className="w-3 h-3" />
                                                            <span>{assignment.carrier.contact_phone}</span>
                                                        </div>
                                                    )}

                                                    {assignment.notes && (
                                                        <p className="text-xs text-slate-500 mt-2">{assignment.notes}</p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Done
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
