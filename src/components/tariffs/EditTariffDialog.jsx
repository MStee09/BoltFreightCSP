import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Customer, Carrier, Tariff } from '../../api/entities';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function EditTariffDialog({ open, onOpenChange, tariff, preselectedCspEventId = null, onSuccess }) {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        version: '',
        status: 'active',
        ownership_type: 'rocket_csp',
        effective_date: '',
        expiry_date: '',
        customer_id: '',
        customer_ids: [],
        carrier_ids: [],
        csp_event_id: preselectedCspEventId || '',
        is_blanket_tariff: false,
        customer_contact_name: '',
        carrier_contact_name: '',
        credential_notes: '',
    });

    const { data: customers = [] } = useQuery({
        queryKey: ['customers'],
        queryFn: () => Customer.list(),
        initialData: []
    });

    const { data: carriers = [] } = useQuery({
        queryKey: ['carriers'],
        queryFn: () => Carrier.list(),
        initialData: []
    });

    useEffect(() => {
        if (tariff) {
            setFormData({
                version: tariff.version || '',
                status: tariff.status || 'proposed',
                ownership_type: tariff.ownership_type || 'Direct',
                effective_date: tariff.effective_date || '',
                expiry_date: tariff.expiry_date || '',
                customer_id: tariff.customer_id || '',
                customer_ids: tariff.customer_ids || [],
                carrier_ids: tariff.carrier_ids || [],
                csp_event_id: tariff.csp_event_id || '',
                is_blanket_tariff: tariff.is_blanket_tariff || false,
                customer_contact_name: tariff.customer_contact_name || '',
                carrier_contact_name: tariff.carrier_contact_name || '',
                credential_notes: tariff.credential_notes || '',
            });
        } else if (preselectedCspEventId) {
            setFormData(prev => ({
                ...prev,
                csp_event_id: preselectedCspEventId,
                status: 'active'
            }));
        }
    }, [tariff, preselectedCspEventId]);

    const updateMutation = useMutation({
        mutationFn: (data) => tariff ? Tariff.update(tariff.id, data) : Tariff.create(data),
        onSuccess: () => {
            if (tariff) {
                queryClient.invalidateQueries({ queryKey: ['tariff', tariff.id] });
            }
            queryClient.invalidateQueries({ queryKey: ['tariffs'] });
            toast.success(tariff ? 'Tariff updated successfully' : 'Tariff created successfully');
            onOpenChange(false);
            if (onSuccess) onSuccess();
        },
        onError: (error) => {
            toast.error(`Failed to ${tariff ? 'update' : 'create'} tariff: ` + error.message);
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        updateMutation.mutate(formData);
    };

    const handleCarrierToggle = (carrierId) => {
        setFormData(prev => ({
            ...prev,
            carrier_ids: prev.carrier_ids.includes(carrierId)
                ? prev.carrier_ids.filter(id => id !== carrierId)
                : [...prev.carrier_ids, carrierId]
        }));
    };

    const handleCustomerToggle = (customerId) => {
        setFormData(prev => ({
            ...prev,
            customer_ids: prev.customer_ids.includes(customerId)
                ? prev.customer_ids.filter(id => id !== customerId)
                : [...prev.customer_ids, customerId]
        }));
    };

    const handleSelectAllCustomers = () => {
        if (formData.customer_ids.length === customers.length) {
            setFormData(prev => ({ ...prev, customer_ids: [] }));
        } else {
            setFormData(prev => ({ ...prev, customer_ids: customers.map(c => c.id) }));
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{tariff ? 'Edit Tariff Details' : 'Create New Tariff'}</DialogTitle>
                    <DialogDescription>
                        {tariff ? 'Update the tariff information below.' : 'Enter the details for the new tariff linked to the awarded CSP event.'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="version">Version *</Label>
                            <Input
                                id="version"
                                value={formData.version}
                                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="status">Status *</Label>
                            <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="proposed">Proposed</SelectItem>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="expired">Expired</SelectItem>
                                    <SelectItem value="superseded">Superseded</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="ownership_type">Ownership *</Label>
                            <Select value={formData.ownership_type} onValueChange={(value) => setFormData({ ...formData, ownership_type: value })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Direct">Direct</SelectItem>
                                    <SelectItem value="Rocket CSP">Rocket CSP</SelectItem>
                                    <SelectItem value="Priority 1">Priority 1</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center gap-2 h-10">
                                <Checkbox
                                    id="is_blanket_tariff"
                                    checked={formData.is_blanket_tariff}
                                    onCheckedChange={(checked) => setFormData({ ...formData, is_blanket_tariff: checked })}
                                />
                                <Label htmlFor="is_blanket_tariff" className="cursor-pointer">Blanket Tariff</Label>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="effective_date">Effective Date *</Label>
                            <Input
                                id="effective_date"
                                type="date"
                                value={formData.effective_date}
                                onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="expiry_date">Expiry Date *</Label>
                            <Input
                                id="expiry_date"
                                type="date"
                                value={formData.expiry_date}
                                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    {!formData.is_blanket_tariff ? (
                        <div className="space-y-2">
                            <Label htmlFor="customer_id">Customer *</Label>
                            <Select value={formData.customer_id} onValueChange={(value) => setFormData({ ...formData, customer_id: value })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a customer" />
                                </SelectTrigger>
                                <SelectContent>
                                    {customers.map(customer => (
                                        <SelectItem key={customer.id} value={customer.id}>
                                            {customer.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>Customers *</Label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleSelectAllCustomers}
                                >
                                    {formData.customer_ids.length === customers.length ? 'Deselect All' : 'Select All'}
                                </Button>
                            </div>
                            <div className="border rounded-lg p-4 space-y-2 max-h-48 overflow-y-auto">
                                {customers.map(customer => (
                                    <div key={customer.id} className="flex items-center gap-2">
                                        <Checkbox
                                            id={`customer-${customer.id}`}
                                            checked={formData.customer_ids.includes(customer.id)}
                                            onCheckedChange={() => handleCustomerToggle(customer.id)}
                                        />
                                        <Label htmlFor={`customer-${customer.id}`} className="cursor-pointer flex-1">
                                            {customer.name}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Carriers *</Label>
                        <div className="border rounded-lg p-4 space-y-2 max-h-48 overflow-y-auto">
                            {carriers.map(carrier => (
                                <div key={carrier.id} className="flex items-center gap-2">
                                    <Checkbox
                                        id={`carrier-${carrier.id}`}
                                        checked={formData.carrier_ids.includes(carrier.id)}
                                        onCheckedChange={() => handleCarrierToggle(carrier.id)}
                                    />
                                    <Label htmlFor={`carrier-${carrier.id}`} className="cursor-pointer flex-1">
                                        {carrier.name}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="customer_contact_name">Customer Contact</Label>
                            <Input
                                id="customer_contact_name"
                                value={formData.customer_contact_name}
                                onChange={(e) => setFormData({ ...formData, customer_contact_name: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="carrier_contact_name">Carrier Contact</Label>
                            <Input
                                id="carrier_contact_name"
                                value={formData.carrier_contact_name}
                                onChange={(e) => setFormData({ ...formData, carrier_contact_name: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="credential_notes">Credential Notes</Label>
                        <Textarea
                            id="credential_notes"
                            value={formData.credential_notes}
                            onChange={(e) => setFormData({ ...formData, credential_notes: e.target.value })}
                            rows={4}
                            className="font-mono text-sm"
                        />
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={updateMutation.isPending}>
                            {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Save Changes
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
