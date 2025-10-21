import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Customer, Carrier, Tariff, CSPEvent, Task, Interaction, Alert, Shipment, LostOpportunity, ReportSnapshot } from '../../api/entities';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '../ui/sheet';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Skeleton } from '../ui/skeleton';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

export default function EditCarrierSheet({ carrierId, isOpen, onOpenChange }) {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({});

    const { data: carrier, isLoading } = useQuery({
        queryKey: ['carrier', carrierId],
        queryFn: () => Carrier.get(carrierId),
        enabled: !!carrierId && isOpen,
    });

    useEffect(() => {
        if (carrier) {
            setFormData({
                ...carrier,
                service_regions: carrier.service_regions ? carrier.service_regions.join(', ') : '',
                service_states: carrier.service_states ? carrier.service_states.join(', ') : '',
                service_countries: carrier.service_countries ? carrier.service_countries.join(', ') : 'US',
                equipment_types: carrier.equipment_types ? carrier.equipment_types.join(', ') : '',
                specializations: carrier.specializations ? carrier.specializations.join(', ') : '',
            });
        }
    }, [carrier]);

    const mutation = useMutation({
        mutationFn: (updatedData) => {
            const payload = {
                ...updatedData,
                service_regions: updatedData.service_regions ? updatedData.service_regions.split(',').map(s => s.trim()).filter(Boolean) : [],
                service_states: updatedData.service_states ? updatedData.service_states.split(',').map(s => s.trim().toUpperCase()).filter(Boolean) : [],
                service_countries: updatedData.service_countries ? updatedData.service_countries.split(',').map(s => s.trim().toUpperCase()).filter(Boolean) : ['US'],
                equipment_types: updatedData.equipment_types ? updatedData.equipment_types.split(',').map(s => s.trim()).filter(Boolean) : [],
                specializations: updatedData.specializations ? updatedData.specializations.split(',').map(s => s.trim()).filter(Boolean) : [],
            };
            return Carrier.update(carrierId, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['carrier', carrierId] });
            queryClient.invalidateQueries({ queryKey: ['carriers'] });
            onOpenChange(false);
        },
        onError: (error) => console.error("Update failed:", error),
    });

    const handleChange = (e) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleSubmit = () => {
        mutation.mutate(formData);
    };

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-xl w-full flex flex-col">
                <SheetHeader>
                    <SheetTitle>Edit Carrier</SheetTitle>
                    <SheetDescription>Update the details for this carrier partner.</SheetDescription>
                </SheetHeader>
                {isLoading ? (
                    <div className="space-y-4 p-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-24 w-full" />
                    </div>
                ) : (
                    <div className="flex-grow overflow-y-auto">
                        <Tabs defaultValue="basic" className="w-full">
                            <TabsList className="w-full">
                                <TabsTrigger value="basic" className="flex-1">Basic Info</TabsTrigger>
                                <TabsTrigger value="contact" className="flex-1">Contact Info</TabsTrigger>
                                <TabsTrigger value="network" className="flex-1">Service Network</TabsTrigger>
                            </TabsList>
                            <TabsContent value="basic" className="p-4 space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Carrier Name</Label>
                                    <Input id="name" value={formData.name || ''} onChange={handleChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="scac_code">SCAC Code</Label>
                                    <Input id="scac_code" value={formData.scac_code || ''} onChange={handleChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="service_type">Service Type</Label>
                                    <Input id="service_type" placeholder="e.g., LTL, FTL, Parcel" value={formData.service_type || ''} onChange={handleChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="website">Website</Label>
                                    <Input id="website" placeholder="https://..." value={formData.website || ''} onChange={handleChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="notes">General Notes</Label>
                                    <Textarea id="notes" placeholder="Any other relevant notes about this carrier" value={formData.notes || ''} onChange={handleChange} rows={3} />
                                </div>
                            </TabsContent>
                            <TabsContent value="contact" className="p-4 space-y-4">
                                <div className="border-b pb-4">
                                    <h3 className="text-sm font-semibold mb-3">Carrier Representative</h3>
                                    <div className="space-y-3">
                                        <div className="space-y-2">
                                            <Label htmlFor="carrier_rep_name">Rep Name</Label>
                                            <Input id="carrier_rep_name" value={formData.carrier_rep_name || ''} onChange={handleChange} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-2">
                                                <Label htmlFor="carrier_rep_email">Email</Label>
                                                <Input id="carrier_rep_email" type="email" value={formData.carrier_rep_email || ''} onChange={handleChange} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="carrier_rep_phone">Phone</Label>
                                                <Input id="carrier_rep_phone" value={formData.carrier_rep_phone || ''} onChange={handleChange} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold mb-3">Billing Contact</h3>
                                    <div className="space-y-3">
                                        <div className="space-y-2">
                                            <Label htmlFor="billing_contact_name">Name</Label>
                                            <Input id="billing_contact_name" value={formData.billing_contact_name || ''} onChange={handleChange} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-2">
                                                <Label htmlFor="billing_contact_email">Email</Label>
                                                <Input id="billing_contact_email" type="email" value={formData.billing_contact_email || ''} onChange={handleChange} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="billing_contact_phone">Phone</Label>
                                                <Input id="billing_contact_phone" value={formData.billing_contact_phone || ''} onChange={handleChange} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>
                            <TabsContent value="network" className="p-4 space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="coverage_type">Coverage Type</Label>
                                    <Select value={formData.coverage_type || 'regional'} onValueChange={(value) => setFormData(prev => ({ ...prev, coverage_type: value }))}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="local">Local</SelectItem>
                                            <SelectItem value="regional">Regional</SelectItem>
                                            <SelectItem value="national">National</SelectItem>
                                            <SelectItem value="international">International</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="service_regions">Service Regions (Comma-separated)</Label>
                                    <Textarea id="service_regions" placeholder="e.g., Upper Midwest, Northeast, Southeast" value={formData.service_regions || ''} onChange={handleChange} rows={2} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="service_states">Service States (Comma-separated)</Label>
                                    <Textarea id="service_states" placeholder="e.g., WI, MN, IL, IN, OH" value={formData.service_states || ''} onChange={handleChange} rows={2} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="service_countries">Countries (Comma-separated)</Label>
                                    <Input id="service_countries" placeholder="e.g., US, CA, MX" value={formData.service_countries || 'US'} onChange={handleChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="equipment_types">Equipment Types (Comma-separated)</Label>
                                    <Textarea id="equipment_types" placeholder="e.g., dry van, reefer, flatbed" value={formData.equipment_types || ''} onChange={handleChange} rows={2} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="specializations">Specializations (Comma-separated)</Label>
                                    <Textarea id="specializations" placeholder="e.g., hazmat, expedited, white glove" value={formData.specializations || ''} onChange={handleChange} rows={2} />
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                )}
                <SheetFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={mutation.isPending}>
                        {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}