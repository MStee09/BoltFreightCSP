import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Customer, Carrier, Tariff } from '../../api/entities';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Textarea } from '../ui/textarea';
import { Loader2, ExternalLink, Plus, AlertTriangle, Lock, Info } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { Alert, AlertDescription } from '../ui/alert';
import { supabase } from '../../api/supabaseClient';
import { toast } from 'sonner';
import { createPageUrl } from '../../utils';

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
    const navigate = useNavigate();

    const [status, setStatus] = useState('active');
    const [ownershipType, setOwnershipType] = useState('rocket_csp');
    const [rocketCspSubtype, setRocketCspSubtype] = useState('rocket_owned');
    const [mode, setMode] = useState('');
    const [effectiveDate, setEffectiveDate] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [customerId, setCustomerId] = useState('');
    const [customerIds, setCustomerIds] = useState([]);
    const [carrierId, setCarrierId] = useState('');
    const [isBlanketTariff, setIsBlanketTariff] = useState(false);
    const [credentialUsername, setCredentialUsername] = useState('');
    const [credentialPassword, setCredentialPassword] = useState('');
    const [shipperNumber, setShipperNumber] = useState('');
    const [carrierPortalUrl, setCarrierPortalUrl] = useState('');
    const [originalCarrierPortalUrl, setOriginalCarrierPortalUrl] = useState('');
    const [showUpdateCarrierPrompt, setShowUpdateCarrierPrompt] = useState(false);
    const [pendingSubmit, setPendingSubmit] = useState(false);
    const [updateReason, setUpdateReason] = useState('');
    const [ownershipChangeWarning, setOwnershipChangeWarning] = useState(false);
    const [activeTariffWarning, setActiveTariffWarning] = useState('');
    const [billingCompanyName, setBillingCompanyName] = useState('');
    const [billingAddressLine1, setBillingAddressLine1] = useState('');
    const [billingAddressLine2, setBillingAddressLine2] = useState('');
    const [billingCity, setBillingCity] = useState('');
    const [billingState, setBillingState] = useState('');
    const [billingPostalCode, setBillingPostalCode] = useState('');
    const [billingCountry, setBillingCountry] = useState('USA');
    const [billingContactName, setBillingContactName] = useState('');
    const [billingContactEmail, setBillingContactEmail] = useState('');
    const [billingContactPhone, setBillingContactPhone] = useState('');
    const [notes, setNotes] = useState('');
    const [reviewDate, setReviewDate] = useState('');

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
        if (!open) return;

        if (tariff) {
            // Auto-set status to active if effective date has passed
            const effectiveDatePassed = tariff.effective_date && new Date(tariff.effective_date) <= new Date();
            setStatus(effectiveDatePassed && tariff.status === 'proposed' ? 'active' : (tariff.status || 'proposed'));

            setOwnershipType(tariff.ownership_type || 'customer_direct');
            setRocketCspSubtype(tariff.rocket_csp_subtype || 'rocket_owned');
            setMode(tariff.mode || '');
            setEffectiveDate(tariff.effective_date || '');
            setExpiryDate(tariff.expiry_date || '');

            // If it's a Rocket blanket tariff without a customer_id, set it to Rocket Shipping
            if (tariff.is_blanket_tariff && (tariff.ownership_type === 'rocket_blanket' || tariff.ownership_type === 'rocket_csp') && !tariff.customer_id) {
                const rocketCustomer = customers.find(c => c.name === 'Rocket Shipping');
                setCustomerId(rocketCustomer?.id || '');
            } else {
                setCustomerId(tariff.customer_id || '');
            }

            setCustomerIds(tariff.customer_ids || []);

            // Handle both carrier_id and carrier_ids (array)
            const firstCarrierId = tariff.carrier_id || (tariff.carrier_ids && tariff.carrier_ids[0]) || '';
            setCarrierId(firstCarrierId);

            setIsBlanketTariff(tariff.is_blanket_tariff || false);
            setCredentialUsername(tariff.credential_username || '');
            setCredentialPassword(tariff.credential_password || '');
            setShipperNumber(tariff.shipper_number || '');
            setCarrierPortalUrl(tariff.carrier_portal_url || '');
            setOriginalCarrierPortalUrl(tariff.carrier_portal_url || '');
            setBillingCompanyName(tariff.billing_company_name || '');
            setBillingAddressLine1(tariff.billing_address_line1 || '');
            setBillingAddressLine2(tariff.billing_address_line2 || '');
            setBillingCity(tariff.billing_city || '');
            setBillingState(tariff.billing_state || '');
            setBillingPostalCode(tariff.billing_postal_code || '');
            setBillingCountry(tariff.billing_country || 'USA');
            setBillingContactName(tariff.billing_contact_name || '');
            setBillingContactEmail(tariff.billing_contact_email || '');
            setBillingContactPhone(tariff.billing_contact_phone || '');
            setNotes(tariff.notes || '');
            setReviewDate(tariff.review_date || '');
        } else {
            setStatus('proposed');
            setOwnershipType('rocket_csp');
            setRocketCspSubtype('rocket_owned');
            setMode('');
            setEffectiveDate('');
            setExpiryDate('');
            setCustomerId(preselectedCustomerId || '');
            setCustomerIds([]);
            setCarrierId(preselectedCarrierIds?.[0] || '');
            setIsBlanketTariff(false);
            setCredentialUsername('');
            setCredentialPassword('');
            setShipperNumber('');
            setCarrierPortalUrl('');
            setOriginalCarrierPortalUrl('');
            setBillingCompanyName('');
            setBillingAddressLine1('');
            setBillingAddressLine2('');
            setBillingCity('');
            setBillingState('');
            setBillingPostalCode('');
            setBillingCountry('USA');
            setBillingContactName('');
            setBillingContactEmail('');
            setBillingContactPhone('');
            setNotes('');
            setReviewDate('');
        }

        setUpdateReason('');
        setOwnershipChangeWarning(false);
        setActiveTariffWarning('');
    }, [open]);

    useEffect(() => {
        if (carrierId && carriers.length > 0) {
            const selectedCarrier = carriers.find(c => c.id === carrierId);
            if (selectedCarrier && selectedCarrier.portal_login_url) {
                if (!carrierPortalUrl || carrierPortalUrl === originalCarrierPortalUrl) {
                    setCarrierPortalUrl(selectedCarrier.portal_login_url);
                    setOriginalCarrierPortalUrl(selectedCarrier.portal_login_url);
                }
            }
        }
    }, [carrierId, carriers]);

    useEffect(() => {
        if (tariff && ownershipType !== tariff.ownership_type) {
            setOwnershipChangeWarning(true);
        } else {
            setOwnershipChangeWarning(false);
        }
    }, [ownershipType, tariff]);

    useEffect(() => {
        if (ownershipType === 'rocket_csp' && rocketCspSubtype === 'blanket') {
            setIsBlanketTariff(true);
        } else if (ownershipType !== 'rocket_csp') {
            setIsBlanketTariff(false);
        }
    }, [ownershipType, rocketCspSubtype]);

    useEffect(() => {
        if (status === 'active' && tariff?.tariff_family_id) {
            checkForActiveTariffs();
        }
    }, [status, tariff]);

    const checkForActiveTariffs = async () => {
        if (!tariff?.tariff_family_id) return;

        try {
            const { data, error } = await supabase
                .from('tariffs')
                .select('id, version, tariff_reference_id')
                .eq('tariff_family_id', tariff.tariff_family_id)
                .eq('status', 'active')
                .neq('id', tariff.id)
                .limit(1);

            if (error) throw error;

            if (data && data.length > 0) {
                const activeTariff = data[0];
                const displayName = activeTariff.tariff_reference_id || activeTariff.version;
                setActiveTariffWarning(`Setting this to active will auto-supersede: ${displayName}`);
            } else {
                setActiveTariffWarning('');
            }
        } catch (error) {
            console.error('Error checking active tariffs:', error);
        }
    };

    const updateMutation = useMutation({
        mutationFn: async (data) => {
            try {
                const result = tariff ? await Tariff.update(tariff.id, data) : await Tariff.create(data);
                return result;
            } catch (error) {
                console.error('Tariff mutation error:', error);
                throw error;
            }
        },
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
            console.error('Tariff update/create failed:', error);
            toast.error(`Failed to ${tariff ? 'update' : 'create'} tariff: ` + (error?.message || 'Unknown error'));
        },
    });

    const handleSubmit = async (e, skipCarrierUpdate = false) => {
        e?.preventDefault();

        if (tariff && !updateReason?.trim()) {
            toast.error('Update reason is required');
            return;
        }

        const selectedCarrier = carriers.find(c => c.id === carrierId);
        const carrierHasDifferentUrl = selectedCarrier && selectedCarrier.portal_login_url !== carrierPortalUrl;
        const userChangedUrl = carrierPortalUrl && carrierPortalUrl !== originalCarrierPortalUrl;

        if (!skipCarrierUpdate && carrierHasDifferentUrl && userChangedUrl && carrierPortalUrl) {
            setPendingSubmit(true);
            setShowUpdateCarrierPrompt(true);
            return;
        }

        // Auto-set status to active if effective date has passed
        let finalStatus = status;
        if (effectiveDate && new Date(effectiveDate) <= new Date() && status === 'proposed') {
            finalStatus = 'active';
        }

        // Handle Rocket CSP subtype
        let finalOwnershipType = ownershipType;
        let finalRocketCspSubtype = null;

        if (ownershipType === 'rocket_csp') {
            finalRocketCspSubtype = rocketCspSubtype;
        }

        const data = {
            status: finalStatus,
            ownership_type: finalOwnershipType,
            rocket_csp_subtype: finalRocketCspSubtype,
            mode,
            effective_date: effectiveDate,
            expiry_date: expiryDate || null,
            customer_id: customerId || null,
            customer_ids: customerIds,
            carrier_id: carrierId || null,
            carrier_ids: carrierId ? [carrierId] : [],
            csp_event_id: preselectedCspEventId || tariff?.csp_event_id || null,
            is_blanket_tariff: isBlanketTariff,
            credential_username: credentialUsername,
            credential_password: credentialPassword,
            shipper_number: shipperNumber,
            carrier_portal_url: carrierPortalUrl,
            billing_company_name: billingCompanyName || null,
            billing_address_line1: billingAddressLine1 || null,
            billing_address_line2: billingAddressLine2 || null,
            billing_city: billingCity || null,
            billing_state: billingState || null,
            billing_postal_code: billingPostalCode || null,
            billing_country: billingCountry || 'USA',
            billing_contact_name: billingContactName || null,
            billing_contact_email: billingContactEmail || null,
            billing_contact_phone: billingContactPhone || null,
            notes: notes || null,
            review_date: reviewDate || null,
            updated_reason: updateReason || null,
        };
        updateMutation.mutate(data);
    };

    const handleUpdateCarrier = async () => {
        try {
            await supabase
                .from('carriers')
                .update({ portal_login_url: carrierPortalUrl })
                .eq('id', carrierId);

            queryClient.invalidateQueries({ queryKey: ['carriers'] });
            toast.success('Carrier portal URL updated');
        } catch (error) {
            toast.error('Failed to update carrier: ' + error.message);
        }
        setShowUpdateCarrierPrompt(false);
        setPendingSubmit(false);
        handleSubmit(null, true);
    };

    const handleSkipCarrierUpdate = () => {
        setShowUpdateCarrierPrompt(false);
        setPendingSubmit(false);
        handleSubmit(null, true);
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
                            {activeTariffWarning && (
                                <Alert className="mt-2 bg-amber-50 border-amber-200">
                                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                                    <AlertDescription className="text-xs text-amber-800">
                                        {activeTariffWarning}
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="ownership_type" className="flex items-center gap-1">
                                Ownership *
                                {tariff?.tariff_family_id && (
                                    <Lock className="h-3 w-3 text-gray-400" title="Changing ownership creates new family" />
                                )}
                            </Label>
                            <Select value={ownershipType} onValueChange={setOwnershipType}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="customer_direct">Customer Direct</SelectItem>
                                    <SelectItem value="rocket_csp">Rocket CSP</SelectItem>
                                    <SelectItem value="customer_csp">Customer CSP</SelectItem>
                                    <SelectItem value="priority_1_csp">Priority 1 CSP</SelectItem>
                                </SelectContent>
                            </Select>
                            {ownershipChangeWarning && (
                                <Alert className="mt-2 bg-blue-50 border-blue-200">
                                    <Info className="h-4 w-4 text-blue-600" />
                                    <AlertDescription className="text-xs text-blue-800">
                                        Ownership change will create a new tariff family
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>

                        {ownershipType === 'rocket_csp' && (
                            <div className="space-y-2">
                                <Label htmlFor="rocket_csp_subtype">Rocket CSP Type *</Label>
                                <Select value={rocketCspSubtype} onValueChange={setRocketCspSubtype}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="rocket_owned">Rocket Owned CSP</SelectItem>
                                        <SelectItem value="blanket">Blanket Tariff</SelectItem>
                                        <SelectItem value="care_of">C/O (Care Of)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-slate-500">
                                    {rocketCspSubtype === 'rocket_owned' && 'Rocket negotiated and owns this tariff'}
                                    {rocketCspSubtype === 'blanket' && 'Multi-customer blanket tariff'}
                                    {rocketCspSubtype === 'care_of' && 'Customer-owned with Rocket managing and adding margin'}
                                </p>
                            </div>
                        )}

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

                    <div className="grid grid-cols-3 gap-4">
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
                            <Label htmlFor="expiry_date">Expiry Date</Label>
                            <Input
                                id="expiry_date"
                                type="date"
                                value={expiryDate}
                                onChange={(e) => setExpiryDate(e.target.value)}
                                placeholder="Auto-defaults to +12 months"
                            />
                            <p className="text-xs text-gray-500">+12mo default</p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="review_date">Review Date</Label>
                            <Input
                                id="review_date"
                                type="date"
                                value={reviewDate}
                                onChange={(e) => setReviewDate(e.target.value)}
                            />
                            <p className="text-xs text-gray-500">For renewal planning</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes">Comments / Notes</Label>
                        <Textarea
                            id="notes"
                            placeholder="Context, negotiation details, special instructions..."
                            rows={3}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="resize-none"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="customer_id">Customer *</Label>
                        <Select
                            value={customerId}
                            onValueChange={setCustomerId}
                            disabled={isBlanketTariff && (ownershipType === 'rocket_blanket' || ownershipType === 'rocket_csp')}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select a customer" />
                            </SelectTrigger>
                            <SelectContent>
                                {customers.sort((a, b) => a.name.localeCompare(b.name)).map(customer => (
                                    <SelectItem key={customer.id} value={customer.id}>
                                        {customer.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {isBlanketTariff && (ownershipType === 'rocket_blanket' || ownershipType === 'rocket_csp') && (
                            <p className="text-xs text-gray-500">Rocket blanket tariffs are owned by Rocket Shipping</p>
                        )}
                    </div>

                    {isBlanketTariff && (
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
                                {customers.sort((a, b) => a.name.localeCompare(b.name)).map(customer => (
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
                        <Label htmlFor="carrier_id">Carrier *</Label>
                        <Select value={carrierId} onValueChange={setCarrierId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a carrier" />
                            </SelectTrigger>
                            <SelectContent>
                                {carriers.sort((a, b) => a.name.localeCompare(b.name)).map(carrier => (
                                    <SelectItem key={carrier.id} value={carrier.id}>
                                        {carrier.name}
                                    </SelectItem>
                                ))}
                                <div className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-slate-100 border-t border-slate-200 mt-1"
                                     onClick={() => {
                                         onOpenChange(false);
                                         navigate(createPageUrl('CarrierDetail?new=true'));
                                     }}>
                                    <Plus className="mr-2 h-4 w-4 text-blue-600" />
                                    <span className="text-blue-600 font-medium">Add New Carrier</span>
                                </div>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-4 border-t pt-4">
                        <h3 className="font-semibold text-sm text-slate-700">Carrier Portal Credentials</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="credential_username">Username</Label>
                                <Input
                                    id="credential_username"
                                    value={credentialUsername}
                                    onChange={(e) => setCredentialUsername(e.target.value)}
                                    placeholder="Portal login username"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="credential_password">Password</Label>
                                <Input
                                    id="credential_password"
                                    type="password"
                                    value={credentialPassword}
                                    onChange={(e) => setCredentialPassword(e.target.value)}
                                    placeholder="Portal password"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="shipper_number">Shipper Number/Code</Label>
                            <Input
                                id="shipper_number"
                                value={shipperNumber}
                                onChange={(e) => setShipperNumber(e.target.value)}
                                placeholder="Shipper identification number"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="carrier_portal_url">Carrier Login URL</Label>
                            <Input
                                id="carrier_portal_url"
                                type="url"
                                value={carrierPortalUrl}
                                onChange={(e) => setCarrierPortalUrl(e.target.value)}
                                placeholder="https://carrier-portal.com/login"
                            />
                            {carrierPortalUrl && (
                                <a
                                    href={carrierPortalUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1"
                                >
                                    <ExternalLink className="w-3 h-3" />
                                    Test link
                                </a>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4 border-t pt-4">
                        <h3 className="text-sm font-semibold text-slate-700">Billing Information</h3>
                        <p className="text-xs text-slate-500">Invoice routing and payment contact details</p>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2 space-y-2">
                                <Label htmlFor="billing_company_name">Company Name</Label>
                                <Input
                                    id="billing_company_name"
                                    value={billingCompanyName}
                                    onChange={(e) => setBillingCompanyName(e.target.value)}
                                    placeholder="e.g., ABC Logistics Inc."
                                />
                            </div>

                            <div className="col-span-2 space-y-2">
                                <Label htmlFor="billing_address_line1">Address Line 1</Label>
                                <Input
                                    id="billing_address_line1"
                                    value={billingAddressLine1}
                                    onChange={(e) => setBillingAddressLine1(e.target.value)}
                                    placeholder="Street address"
                                />
                            </div>

                            <div className="col-span-2 space-y-2">
                                <Label htmlFor="billing_address_line2">Address Line 2</Label>
                                <Input
                                    id="billing_address_line2"
                                    value={billingAddressLine2}
                                    onChange={(e) => setBillingAddressLine2(e.target.value)}
                                    placeholder="Suite, floor, etc. (optional)"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="billing_city">City</Label>
                                <Input
                                    id="billing_city"
                                    value={billingCity}
                                    onChange={(e) => setBillingCity(e.target.value)}
                                    placeholder="City"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="billing_state">State</Label>
                                <Input
                                    id="billing_state"
                                    value={billingState}
                                    onChange={(e) => setBillingState(e.target.value)}
                                    placeholder="State"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="billing_postal_code">ZIP/Postal Code</Label>
                                <Input
                                    id="billing_postal_code"
                                    value={billingPostalCode}
                                    onChange={(e) => setBillingPostalCode(e.target.value)}
                                    placeholder="ZIP code"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="billing_country">Country</Label>
                                <Input
                                    id="billing_country"
                                    value={billingCountry}
                                    onChange={(e) => setBillingCountry(e.target.value)}
                                    placeholder="Country"
                                />
                            </div>

                            <div className="col-span-2 border-t pt-4 mt-2">
                                <h4 className="text-sm font-medium text-slate-700 mb-3">Billing Contact</h4>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="billing_contact_name">Contact Name</Label>
                                <Input
                                    id="billing_contact_name"
                                    value={billingContactName}
                                    onChange={(e) => setBillingContactName(e.target.value)}
                                    placeholder="Full name"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="billing_contact_phone">Phone</Label>
                                <Input
                                    id="billing_contact_phone"
                                    type="tel"
                                    value={billingContactPhone}
                                    onChange={(e) => setBillingContactPhone(e.target.value)}
                                    placeholder="(555) 123-4567"
                                />
                            </div>

                            <div className="col-span-2 space-y-2">
                                <Label htmlFor="billing_contact_email">Email</Label>
                                <Input
                                    id="billing_contact_email"
                                    type="email"
                                    value={billingContactEmail}
                                    onChange={(e) => setBillingContactEmail(e.target.value)}
                                    placeholder="billing@company.com"
                                />
                            </div>
                        </div>
                    </div>

                    {tariff && (
                        <div className="space-y-2">
                            <Label htmlFor="update_reason">Update Reason *</Label>
                            <Textarea
                                id="update_reason"
                                value={updateReason}
                                onChange={(e) => setUpdateReason(e.target.value)}
                                placeholder="Explain why this change is being made..."
                                rows={3}
                                required
                            />
                            <p className="text-xs text-gray-500">Required for audit trail</p>
                        </div>
                    )}

                    <Alert className="bg-gray-50 border-gray-200">
                        <Info className="h-4 w-4 text-gray-600" />
                        <AlertDescription className="text-xs text-gray-700">
                            <strong>Data Governance:</strong> Only 1 active tariff per family. Family IDs are immutable. Changing ownership creates a new family. All changes are audited.
                        </AlertDescription>
                    </Alert>

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

            <AlertDialog open={showUpdateCarrierPrompt} onOpenChange={setShowUpdateCarrierPrompt}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Update Carrier Portal URL?</AlertDialogTitle>
                        <AlertDialogDescription>
                            You've changed the Carrier Login URL. Would you like to update this URL for the carrier record as well? This will make it the default for future tariffs with this carrier.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={handleSkipCarrierUpdate}>
                            No, just this tariff
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={handleUpdateCarrier}>
                            Yes, update carrier too
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Dialog>
    );
}
