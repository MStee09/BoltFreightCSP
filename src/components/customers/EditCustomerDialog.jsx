import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Customer } from '../../api/entities';
import { useToast } from '../ui/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createCspReviewEvent, calculateNextReviewDate } from '../../utils/calendarHelpers';
import { createPageUrl } from '../../utils';

export default function EditCustomerDialog({ customer, isOpen, onOpenChange }) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isCreating = !customer;
    const [formData, setFormData] = useState({
        name: '',
        segment: 'Mid-Market',
        status: 'active',
        annual_revenue: '',
        primary_contact_name: '',
        primary_contact_email: '',
        primary_contact_phone: '',
        notes: '',
        csp_strategy: '',
        csp_review_frequency: 'annual',
    });

    useEffect(() => {
        if (customer) {
            setFormData({
                name: customer.name || '',
                segment: customer.segment || 'Mid-Market',
                status: customer.status || 'active',
                annual_revenue: customer.annual_revenue || '',
                primary_contact_name: customer.primary_contact_name || '',
                primary_contact_email: customer.primary_contact_email || '',
                primary_contact_phone: customer.primary_contact_phone || '',
                notes: customer.notes || '',
                csp_strategy: customer.csp_strategy || '',
                csp_review_frequency: customer.csp_review_frequency || 'annual',
            });
        }
    }, [customer]);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const updateData = {
                ...formData,
                annual_revenue: formData.annual_revenue ? parseFloat(formData.annual_revenue) : null,
            };

            let resultCustomer;

            if (isCreating) {
                if (formData.csp_review_frequency) {
                    const nextReviewDate = calculateNextReviewDate(formData.csp_review_frequency);
                    updateData.next_csp_review_date = nextReviewDate;
                }
                resultCustomer = await Customer.create(updateData);

                if (formData.csp_review_frequency) {
                    await createCspReviewEvent(resultCustomer);
                }

                toast({
                    title: "Success!",
                    description: "Customer created successfully.",
                });

                queryClient.invalidateQueries(['customers']);
                queryClient.invalidateQueries(['calendar_events']);

                const returnToNewEvent = sessionStorage.getItem('returnToNewEvent');
                if (returnToNewEvent === 'true') {
                    const savedFormData = sessionStorage.getItem('newEventFormData');
                    if (savedFormData) {
                        const parsedData = JSON.parse(savedFormData);
                        parsedData.event.customer_id = resultCustomer.id;
                        sessionStorage.setItem('newEventFormData', JSON.stringify(parsedData));
                    }
                    navigate(createPageUrl('Pipeline'));
                } else {
                    navigate(createPageUrl(`CustomerDetail?id=${resultCustomer.id}`));
                }
            } else {
                const frequencyChanged = customer.csp_review_frequency !== formData.csp_review_frequency;

                if (formData.csp_review_frequency && frequencyChanged) {
                    const nextReviewDate = calculateNextReviewDate(formData.csp_review_frequency);
                    updateData.next_csp_review_date = nextReviewDate;
                    updateData.last_csp_review_date = new Date().toISOString().split('T')[0];
                }

                resultCustomer = await Customer.update(customer.id, updateData);

                if (formData.csp_review_frequency && frequencyChanged) {
                    await createCspReviewEvent(resultCustomer);
                }

                toast({
                    title: "Success!",
                    description: "Customer updated successfully.",
                });

                queryClient.invalidateQueries(['customer', customer.id]);
                queryClient.invalidateQueries(['customers']);
                queryClient.invalidateQueries(['calendar_events']);
                onOpenChange(false);
            }
        } catch (error) {
            toast({
                title: "Error",
                description: error.message || `Failed to ${isCreating ? 'create' : 'update'} customer.`,
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isCreating ? 'Create New Customer' : 'Edit Customer'}</DialogTitle>
                    <DialogDescription>
                        {isCreating ? 'Add a new customer to your database.' : 'Update customer information and contact details.'}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Customer Name *</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => handleChange('name', e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="annual_revenue">Annual Revenue ($)</Label>
                            <Input
                                id="annual_revenue"
                                type="number"
                                value={formData.annual_revenue}
                                onChange={(e) => handleChange('annual_revenue', e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="segment">Revenue Tier</Label>
                                <Select value={formData.segment} onValueChange={(value) => handleChange('segment', value)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Enterprise">Enterprise</SelectItem>
                                        <SelectItem value="Mid-Market">Mid-Market</SelectItem>
                                        <SelectItem value="SMB">SMB</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-slate-500">Helps prioritize bid preparation efforts</p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="status">Status</Label>
                                <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="inactive">Inactive</SelectItem>
                                        <SelectItem value="prospect">Prospect</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="pt-4 border-t">
                            <h3 className="text-sm font-semibold mb-3">Primary Contact</h3>
                            <div className="space-y-3">
                                <div className="space-y-2">
                                    <Label htmlFor="primary_contact_name">Contact Name</Label>
                                    <Input
                                        id="primary_contact_name"
                                        value={formData.primary_contact_name}
                                        onChange={(e) => handleChange('primary_contact_name', e.target.value)}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="primary_contact_email">Email</Label>
                                        <Input
                                            id="primary_contact_email"
                                            type="email"
                                            value={formData.primary_contact_email}
                                            onChange={(e) => handleChange('primary_contact_email', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="primary_contact_phone">Phone</Label>
                                        <Input
                                            id="primary_contact_phone"
                                            value={formData.primary_contact_phone}
                                            onChange={(e) => handleChange('primary_contact_phone', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="csp_strategy">CSP Strategy</Label>
                            <Textarea
                                id="csp_strategy"
                                value={formData.csp_strategy}
                                onChange={(e) => handleChange('csp_strategy', e.target.value)}
                                rows={3}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="csp_review_frequency">CSP Review Frequency</Label>
                            <Select
                                value={formData.csp_review_frequency}
                                onValueChange={(value) => handleChange('csp_review_frequency', value)}
                            >
                                <SelectTrigger id="csp_review_frequency">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="monthly">Monthly</SelectItem>
                                    <SelectItem value="quarterly">Quarterly</SelectItem>
                                    <SelectItem value="semi_annual">Semi-Annual</SelectItem>
                                    <SelectItem value="annual">Annual</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-slate-500">How often should we review CSP opportunities with this customer?</p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea
                                id="notes"
                                value={formData.notes}
                                onChange={(e) => handleChange('notes', e.target.value)}
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
