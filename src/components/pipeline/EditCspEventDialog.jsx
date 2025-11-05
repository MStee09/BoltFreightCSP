import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Customer, CSPEvent, Tariff } from '../../api/entities';
import { supabase } from '../../api/supabaseClient';
import { createHoneymoonEvents } from '../../utils/calendarHelpers';
import { format } from 'date-fns';
import { CSP_STAGES, formatCspStage } from '../../utils';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useToast } from '../ui/use-toast';
import { Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { Checkbox } from '../ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { cn } from '../../lib/utils';


export default function EditCspEventDialog({ isOpen, onOpenChange, eventId }) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        title: '',
        customer_id: '',
        stage: 'discovery',
        priority: 'medium',
        description: '',
        assigned_to: '',
        go_live_date: '',
        honeymoon_monitoring: false,
        total_shipments: '',
        data_timeframe_months: '',
        data_start_date: null,
        data_end_date: null,
        projected_monthly_spend: '',
        projected_annual_spend: '',
        projected_monthly_revenue: '',
        projected_annual_revenue: '',
        minimum_annual_spend_threshold: ''
    });

    const { data: event, isLoading: isLoadingEvent } = useQuery({
        queryKey: ['csp_event', eventId],
        queryFn: () => CSPEvent.get(eventId),
        enabled: !!eventId && isOpen,
    });

    const { data: customers = [] } = useQuery({
        queryKey: ['customers'],
        queryFn: () => Customer.list(),
        initialData: []
    });

    const { data: users = [] } = useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_all_users');
            if (error) throw error;
            return data || [];
        },
        enabled: isOpen
    });

    useEffect(() => {
        if (event) {
            setFormData({
                title: event.title || '',
                customer_id: event.customer_id || '',
                stage: event.stage || 'discovery',
                priority: event.priority || 'medium',
                description: event.notes || '',
                assigned_to: event.assigned_to || '',
                go_live_date: event.go_live_date || '',
                honeymoon_monitoring: event.honeymoon_monitoring || false,
                total_shipments: event.total_shipments || '',
                data_timeframe_months: event.data_timeframe_months || '',
                data_start_date: event.data_start_date || null,
                data_end_date: event.data_end_date || null,
                projected_monthly_spend: event.projected_monthly_spend || '',
                projected_annual_spend: event.projected_annual_spend || '',
                projected_monthly_revenue: event.projected_monthly_revenue || '',
                projected_annual_revenue: event.projected_annual_revenue || '',
                minimum_annual_spend_threshold: event.minimum_annual_spend_threshold || ''
            });
        }
    }, [event]);

    const updateEventMutation = useMutation({
        mutationFn: async (data) => {
            const { description, ...rest } = data;
            const updateData = {
                ...rest,
                notes: description,
                go_live_date: rest.go_live_date || null,
                due_date: rest.due_date || null
            };
            const updatedEvent = await CSPEvent.update(eventId, updateData);

            if (data.stage === 'awarded' && event.stage !== 'awarded') {
                const customer = customers.find(c => c.id === data.customer_id);
                const today = new Date();
                const oneYearFromNow = new Date(today);
                oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

                await Tariff.create({
                    customer_id: data.customer_id,
                    version: `${customer?.name || 'Event'} - ${format(today, 'yyyy-MM-dd')}`,
                    ownership_type: 'Direct',
                    status: 'proposed',
                    effective_date: format(today, 'yyyy-MM-dd'),
                    expiry_date: format(oneYearFromNow, 'yyyy-MM-dd'),
                    is_blanket_tariff: false,
                    customer_ids: [],
                    csp_event_id: eventId
                });

                queryClient.invalidateQueries({ queryKey: ['tariffs'] });
            }

            if (data.stage === 'live' && event.stage !== 'live' && data.honeymoon_monitoring) {
                const customer = customers.find(c => c.id === data.customer_id);
                await createHoneymoonEvents(updatedEvent, customer);
            }

            return updatedEvent;
        },
        onSuccess: (updatedEvent, variables) => {
            queryClient.invalidateQueries({ queryKey: ['csp_events'] });
            queryClient.invalidateQueries({ queryKey: ['csp_event', eventId] });
            queryClient.invalidateQueries({ queryKey: ['calendar_events'] });

            const message = variables.stage === 'awarded' && event.stage !== 'awarded'
                ? "CSP event updated and tariff created successfully."
                : "CSP event updated successfully.";

            toast({
                title: "Success!",
                description: message,
            });
            onOpenChange(false);
        },
        onError: (error) => {
            toast({
                title: "Error",
                description: error.message || "Failed to update CSP event.",
                variant: "destructive",
            });
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.title || !formData.customer_id) {
            toast({
                title: "Validation Error",
                description: "Title and customer are required.",
                variant: "destructive",
            });
            return;
        }
        updateEventMutation.mutate(formData);
    };

    const handleValueChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };


    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit CSP Event</DialogTitle>
                    <DialogDescription>Update the details of this customer savings project</DialogDescription>
                </DialogHeader>
                {isLoadingEvent ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Event Title</Label>
                            <Input
                                id="title"
                                value={formData.title}
                                onChange={(e) => handleValueChange('title', e.target.value)}
                                placeholder="e.g., Q3 LTL Sourcing Event"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="customer">Customer</Label>
                            <Select
                                value={formData.customer_id}
                                onValueChange={(value) => handleValueChange('customer_id', value)}
                            >
                                <SelectTrigger id="customer">
                                    <SelectValue placeholder="Select a customer" />
                                </SelectTrigger>
                                <SelectContent>
                                    {customers.map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="stage">Stage</Label>
                                <Select
                                    value={formData.stage}
                                    onValueChange={(value) => handleValueChange('stage', value)}
                                >
                                    <SelectTrigger id="stage">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CSP_STAGES.map(s => (
                                            <SelectItem key={s} value={s}>
                                                {formatCspStage(s)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="priority">Priority</Label>
                                <Select
                                    value={formData.priority}
                                    onValueChange={(value) => handleValueChange('priority', value)}
                                >
                                    <SelectTrigger id="priority">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">Low</SelectItem>
                                        <SelectItem value="medium">Medium</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                        <SelectItem value="urgent">Urgent</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="assigned_to">Assigned To</Label>
                            <Select
                                value={formData.assigned_to}
                                onValueChange={(value) => handleValueChange('assigned_to', value)}
                            >
                                <SelectTrigger id="assigned_to">
                                    <SelectValue placeholder="Select a user" />
                                </SelectTrigger>
                                <SelectContent>
                                    {users.length > 0 ? (
                                        users.map(user => (
                                            <SelectItem key={user.id} value={user.email}>
                                                {user.email}
                                            </SelectItem>
                                        ))
                                    ) : (
                                        <div className="px-2 py-1.5 text-sm text-slate-500">No users available</div>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => handleValueChange('description', e.target.value)}
                                placeholder="Add any relevant details..."
                                rows={4}
                            />
                        </div>

                        <div className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <h3 className="text-sm font-semibold text-slate-900">Volume & Spend Projections</h3>
                            <p className="text-xs text-slate-600">Used to determine if carriers will participate based on spend thresholds</p>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label htmlFor="total_shipments" className="text-xs">Total Shipments</Label>
                                    <Input
                                        id="total_shipments"
                                        type="number"
                                        value={formData.total_shipments}
                                        onChange={(e) => handleValueChange('total_shipments', e.target.value)}
                                        placeholder="e.g., 5000"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="data_timeframe_months" className="text-xs">Timeframe (Months)</Label>
                                    <Input
                                        id="data_timeframe_months"
                                        type="number"
                                        value={formData.data_timeframe_months}
                                        onChange={(e) => handleValueChange('data_timeframe_months', e.target.value)}
                                        placeholder="e.g., 12"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label htmlFor="data_start_date" className="text-xs">Data Start Date</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                id="data_start_date"
                                                variant="outline"
                                                size="sm"
                                                className={cn(
                                                    "w-full justify-start text-left font-normal",
                                                    !formData.data_start_date && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-3 w-3" />
                                                {formData.data_start_date ? format(new Date(formData.data_start_date), "PP") : "Start"}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={formData.data_start_date ? new Date(formData.data_start_date) : undefined}
                                                onSelect={(date) => handleValueChange('data_start_date', date ? format(date, 'yyyy-MM-dd') : null)}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="data_end_date" className="text-xs">Data End Date</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                id="data_end_date"
                                                variant="outline"
                                                size="sm"
                                                className={cn(
                                                    "w-full justify-start text-left font-normal",
                                                    !formData.data_end_date && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-3 w-3" />
                                                {formData.data_end_date ? format(new Date(formData.data_end_date), "PP") : "End"}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={formData.data_end_date ? new Date(formData.data_end_date) : undefined}
                                                onSelect={(date) => handleValueChange('data_end_date', date ? format(date, 'yyyy-MM-dd') : null)}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label htmlFor="projected_monthly_spend" className="text-xs">Monthly Spend ($)</Label>
                                    <Input
                                        id="projected_monthly_spend"
                                        type="number"
                                        value={formData.projected_monthly_spend}
                                        onChange={(e) => handleValueChange('projected_monthly_spend', e.target.value)}
                                        placeholder="e.g., 50000"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="projected_annual_spend" className="text-xs">Annual Spend ($)</Label>
                                    <Input
                                        id="projected_annual_spend"
                                        type="number"
                                        value={formData.projected_annual_spend}
                                        onChange={(e) => handleValueChange('projected_annual_spend', e.target.value)}
                                        placeholder="e.g., 600000"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label htmlFor="projected_monthly_revenue" className="text-xs">Monthly Revenue ($)</Label>
                                    <Input
                                        id="projected_monthly_revenue"
                                        type="number"
                                        value={formData.projected_monthly_revenue}
                                        onChange={(e) => handleValueChange('projected_monthly_revenue', e.target.value)}
                                        placeholder="e.g., 55000"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="projected_annual_revenue" className="text-xs">Annual Revenue ($)</Label>
                                    <Input
                                        id="projected_annual_revenue"
                                        type="number"
                                        value={formData.projected_annual_revenue}
                                        onChange={(e) => handleValueChange('projected_annual_revenue', e.target.value)}
                                        placeholder="e.g., 660000"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="minimum_annual_spend_threshold" className="text-xs">Carrier Min. Annual Spend Threshold ($)</Label>
                                <Input
                                    id="minimum_annual_spend_threshold"
                                    type="number"
                                    value={formData.minimum_annual_spend_threshold}
                                    onChange={(e) => handleValueChange('minimum_annual_spend_threshold', e.target.value)}
                                    placeholder="e.g., 500000"
                                />
                                <p className="text-xs text-slate-500">Minimum annual spend carriers require to participate</p>
                            </div>
                        </div>

                        {formData.stage === 'live' && (
                            <div className="space-y-3 pt-3 border-t">
                                <div className="space-y-2">
                                    <Label htmlFor="go_live_date">Go Live Date</Label>
                                    <Input
                                        id="go_live_date"
                                        type="date"
                                        value={formData.go_live_date}
                                        onChange={(e) => handleValueChange('go_live_date', e.target.value)}
                                    />
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="honeymoon_monitoring"
                                        checked={formData.honeymoon_monitoring}
                                        onCheckedChange={(checked) => handleValueChange('honeymoon_monitoring', checked)}
                                    />
                                    <Label htmlFor="honeymoon_monitoring" className="cursor-pointer font-normal">
                                        Enable honeymoon period monitoring (30, 60, 90 day check-ins)
                                    </Label>
                                </div>
                            </div>
                        )}

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={updateEventMutation.isLoading}>
                                {updateEventMutation.isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    'Save Changes'
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
