import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Customer, Carrier, Tariff } from '../../api/entities';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function EditTariffDialog({
  open,
  onOpenChange,
  tariff,
  preselectedCspEventId = null,
  preselectedCustomerId = null,
  preselectedCarrierIds = [],
  onSuccess
}) {
    const queryClient = useQueryClient();

    const [version, setVersion] = useState('');
    const [status, setStatus] = useState('active');
    const [ownershipType, setOwnershipType] = useState('rocket_csp');
    const [mode, setMode] = useState('');
    const [effectiveDate, setEffectiveDate] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [customerId, setCustomerId] = useState('');
    const [customerIds, setCustomerIds] = useState([]);
    const [carrierIds, setCarrierIds] = useState([]);
    const [isBlanketTariff, setIsBlanketTariff] = useState(false);

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
        if (tariff && open) {
            setVersion(tariff.version || '');
            setStatus(tariff.status || 'proposed');
            setOwnershipType(tariff.ownership_type || 'customer_direct');
            setMode(tariff.mode || '');
            setEffectiveDate(tariff.effective_date || '');
            setExpiryDate(tariff.expiry_date || '');
            setCustomerId(tariff.customer_id || '');
            setCustomerIds(tariff.customer_ids || []);
            setCarrierIds(tariff.carrier_ids || []);
            setIsBlanketTariff(tariff.is_blanket_tariff || false);
        } else if (!tariff && open) {
            setVersion('');
            setStatus('active');
            setOwnershipType('rocket_csp');
            setMode('');
            setEffectiveDate('');
            setExpiryDate('');
            setCustomerId(preselectedCustomerId || '');
            setCustomerIds([]);
            setCarrierIds(preselectedCarrierIds || []);
            setIsBlanketTariff(false);
        }
    }, [tariff, open, preselectedCustomerId, preselectedCarrierIds]);

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
        const data = {
            version,
            status,
            ownership_type: ownershipType,
            mode,
            effective_date: effectiveDate,
            expiry_date: expiryDate,
            customer_id: customerId,
            customer_ids: customerIds,
            carrier_ids: carrierIds,
            csp_event_id: preselectedCspEventId || tariff?.csp_event_id || '',
            is_blanket_tariff: isBlanketTariff,
        };
        updateMutation.mutate(data);
    };

    const handleCarrierToggle = (carrierId) => {
        setCarrierIds(prev =>
            prev.includes(carrierId)
                ? prev.filter(id => id !== carrierId)
                : [...prev, carrierId]
        );
    };

    const handleCustomerToggle = (customerId) => {
        setCustomerIds(prev =>
            prev.includes(customerId)
                ? prev.filter(id => id !== customerId)
                : [...prev, customerId]
        );
    };

    const handleSelectAllCustomers = () => {
        if (customerIds.length === customers.length) {
            setCustomerIds([]);
        } else {
            setCustomerIds(customers.map(c => c.id));
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto pointer-events-auto">
                <DialogHeader>
                    <DialogTitle>{tariff ? 'Edit Tariff Details' : 'Create New Tariff'}</DialogTitle>
                    <DialogDescription>
                        {tariff ? 'Update the tariff information below.' : 'Enter the details for the new tariff linked to the awarded CSP event.'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 pointer-events-auto">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="version">Version *</Label>
                            <Input
                                id="version"
                                value={version}
                                onChange={(e) => setVersion(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="status">Status *</Label>
                            <Select value={status} onValueChange={setStatus}>
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
                            <Select value={ownershipType} onValueChange={setOwnershipType}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="customer_direct">Direct</SelectItem>
                                    <SelectItem value="rocket_csp">Rocket CSP</SelectItem>
                                    <SelectItem value="rocket_blanket">Rocket Blanket</SelectItem>
                                    <SelectItem value="priority1_blanket">Priority 1 Blanket</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="mode">Service Type *</Label>
                            <Select value={mode} onValueChange={setMode}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select service type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="LTL">LTL</SelectItem>
                                    <SelectItem value="Home Delivery">Home Delivery</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 h-10">
                                <Checkbox
                                    id="is_blanket_tariff"
                                    checked={isBlanketTariff}
                                    onCheckedChange={setIsBlanketTariff}
                                />
                                <Label htmlFor="is_blanket_tariff" className="cursor-pointer">Blanket Tariff</Label>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="effective_date">Effective Date *</Label>
                            <Input
                                id="effective_date"
                                type="date"
                                value={effectiveDate}
                                onChange={(e) => setEffectiveDate(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="expiry_date">Expiry Date *</Label>
                            <Input
                                id="expiry_date"
                                type="date"
                                value={expiryDate}
                                onChange={(e) => setExpiryDate(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    {!isBlanketTariff ? (
                        <div className="space-y-2">
                            <Label htmlFor="customer_id">Customer *</Label>
                            <Select value={customerId} onValueChange={setCustomerId}>
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
                                    {customerIds.length === customers.length ? 'Deselect All' : 'Select All'}
                                </Button>
                            </div>
                            <div className="border rounded-lg p-4 space-y-2 max-h-48 overflow-y-auto">
                                {customers.map(customer => (
                                    <div key={customer.id} className="flex items-center gap-2">
                                        <Checkbox
                                            id={`customer-${customer.id}`}
                                            checked={customerIds.includes(customer.id)}
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
                                        checked={carrierIds.includes(carrier.id)}
                                        onCheckedChange={() => handleCarrierToggle(carrier.id)}
                                    />
                                    <Label htmlFor={`carrier-${carrier.id}`} className="cursor-pointer flex-1">
                                        {carrier.name}
                                    </Label>
                                </div>
                            ))}
                        </div>
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
