
import React, { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Customer, Carrier, Tariff, CSPEvent, Task, Interaction, Alert, Shipment, LostOpportunity, ReportSnapshot, Document } from '../../api/entities';
import { supabase } from '../../api/supabaseClient';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '../ui/sheet';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Upload, X, FileText, Calendar as CalendarIcon, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../ui/card';
import { useToast } from '../ui/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { CSP_STAGES, formatCspStage } from '../../utils';
import { ScrollArea } from '../ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { CarrierBlockerWarning } from './CarrierBlockerWarning';

const MOCK_USER_ID = '00000000-0000-0000-0000-000000000000';

export default function NewEventSheet({ isOpen, onOpenChange, customers: customersProp = [] }) {
    const { toast } = useToast();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const [showNewCustomerDialog, setShowNewCustomerDialog] = useState(false);
    const [newCustomer, setNewCustomer] = useState({
        name: '',
        csp_strategy: '',
        status: 'active',
        notes: ''
    });
    const [newEvent, setNewEvent] = useState({
        title: '',
        customer_id: '',
        mode: '',
        stage: 'discovery',
        priority: 'medium',
        description: '',
        assigned_to: '',
        due_date: null,
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

    const { data: customers = [], isLoading: isLoadingCustomers } = useQuery({
        queryKey: ['customers'],
        queryFn: () => Customer.list(),
        enabled: isOpen,
        initialData: customersProp
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

    const [attachedFiles, setAttachedFiles] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen && user?.email && !newEvent.assigned_to) {
            setNewEvent(prev => ({
                ...prev,
                assigned_to: user.email
            }));
        }

        if (isOpen) {
            const savedFormData = sessionStorage.getItem('newEventFormData');
            const returnFromCustomer = sessionStorage.getItem('returnToNewEvent');

            if (savedFormData && returnFromCustomer === 'true') {
                const parsedData = JSON.parse(savedFormData);
                setNewEvent(parsedData.event);
                setAttachedFiles(parsedData.files || []);
                sessionStorage.removeItem('newEventFormData');
                sessionStorage.removeItem('returnToNewEvent');
            }
        }
    }, [isOpen, user]);

    const createCustomerMutation = useMutation({
        mutationFn: async (customerData) => {
            return await Customer.create(customerData);
        },
        onSuccess: (createdCustomer) => {
            queryClient.invalidateQueries({ queryKey: ['customers'] });
            setNewEvent(prev => ({ ...prev, customer_id: createdCustomer.id }));
            setShowNewCustomerDialog(false);
            setNewCustomer({
                name: '',
                account_owner: user?.email || '',
                csp_strategy: '',
                status: 'active',
                notes: ''
            });
            toast({
                title: "Success!",
                description: `Customer "${createdCustomer.name}" created successfully.`,
            });
        },
        onError: (error) => {
            toast({
                title: "Error",
                description: error.message || "Failed to create customer.",
                variant: "destructive",
            });
        }
    });

    const createEventMutation = useMutation({
        mutationFn: async (eventData) => {
            const { description, ...rest } = eventData;
            const createData = {
                ...rest,
                notes: description,
                due_date: rest.due_date || null,
                total_shipments: rest.total_shipments ? parseInt(rest.total_shipments) : null,
                data_timeframe_months: rest.data_timeframe_months ? parseInt(rest.data_timeframe_months) : null,
                projected_monthly_spend: rest.projected_monthly_spend ? parseFloat(rest.projected_monthly_spend) : null,
                projected_annual_spend: rest.projected_annual_spend ? parseFloat(rest.projected_annual_spend) : null,
                projected_monthly_revenue: rest.projected_monthly_revenue ? parseFloat(rest.projected_monthly_revenue) : null,
                projected_annual_revenue: rest.projected_annual_revenue ? parseFloat(rest.projected_annual_revenue) : null,
                minimum_annual_spend_threshold: rest.minimum_annual_spend_threshold ? parseFloat(rest.minimum_annual_spend_threshold) : null
            };
            const createdEvent = await CSPEvent.create(createData);

            if (attachedFiles.length > 0) {
                for (const file of attachedFiles) {
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${Date.now()}_${file.name}`;
                    const filePath = `${MOCK_USER_ID}/${fileName}`;

                    const { error: uploadError } = await supabase.storage
                        .from('documents')
                        .upload(filePath, file);

                    if (uploadError) throw uploadError;

                    await Document.create({
                        entity_type: 'csp_event',
                        entity_id: createdEvent.id,
                        customer_id: createdEvent.customer_id,
                        csp_event_id: createdEvent.id,
                        file_name: file.name,
                        file_path: filePath,
                        file_size: file.size,
                        file_type: file.type,
                        document_type: 'csp_event',
                        description: `Attached to CSP Event: ${createdEvent.title}`,
                        uploaded_by: 'Current User',
                    });
                }
            }

            await Interaction.create({
                entity_type: 'customer',
                entity_id: createdEvent.customer_id,
                interaction_type: 'csp_created',
                summary: `New CSP Event Created: ${createdEvent.title}`,
                details: `A new CSP event was initiated in the '${createdEvent.stage.replace(/_/g, ' ')}' stage.`,
                metadata: {
                    to_stage: createdEvent.stage,
                    csp_event_id: createdEvent.id
                }
            });
            return createdEvent;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['csp_events'] });
            queryClient.invalidateQueries({ queryKey: ['interactions'] });
            queryClient.invalidateQueries({ queryKey: ['documents'] });
            setIsLoading(false);
            onOpenChange(false);
            setNewEvent({ title: '', customer_id: '', stage: 'discovery', priority: 'medium', description: '', assigned_to: '', due_date: null, total_shipments: '', data_timeframe_months: '', data_start_date: null, data_end_date: null, projected_monthly_spend: '', projected_annual_spend: '', projected_monthly_revenue: '', projected_annual_revenue: '', minimum_annual_spend_threshold: '' });
            setAttachedFiles([]);
            toast({
                title: "Success!",
                description: "CSP Event created successfully.",
            });
        },
        onError: (error) => {
            setIsLoading(false);
            toast({
                title: "Error",
                description: error.message || "Failed to create CSP event.",
                variant: "destructive",
            });
        }
    });

    const handleSubmit = () => {
        if (!newEvent.title || !newEvent.customer_id || !newEvent.assigned_to) {
            toast({
                title: "Validation Error",
                description: "Please fill in the event title, select a customer, and assign an owner.",
                variant: "destructive",
            });
            return;
        }
        setIsLoading(true);
        createEventMutation.mutate(newEvent);
    };

    const handleValueChange = (field, value) => {
        if (field === 'customer_id' && value === 'CREATE_NEW') {
            setShowNewCustomerDialog(true);
            return;
        }
        setNewEvent(prev => ({ ...prev, [field]: value }));
    };

    const handleCreateCustomer = () => {
        if (!newCustomer.name) {
            toast({
                title: "Validation Error",
                description: "Please enter a customer name.",
                variant: "destructive",
            });
            return;
        }
        createCustomerMutation.mutate(newCustomer);
    };

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files || []);
        setAttachedFiles(prev => [...prev, ...files]);
    };

    const removeFile = (index) => {
        setAttachedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    };

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-lg flex flex-col">
                <SheetHeader>
                    <SheetTitle>Create New CSP Event</SheetTitle>
                    <SheetDescription>Start a new customer savings project in your pipeline.</SheetDescription>
                </SheetHeader>
                <ScrollArea className="flex-1 -mx-6 px-6">
                <div className="py-6 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Event Title</Label>
                        <Input id="title" value={newEvent.title} onChange={e => handleValueChange('title', e.target.value)} placeholder="e.g., Q3 LTL Sourcing Event" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="customer">Customer</Label>
                        <Select onValueChange={value => handleValueChange('customer_id', value)} value={newEvent.customer_id}>
                            <SelectTrigger id="customer">
                                <SelectValue placeholder="Select a customer" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="CREATE_NEW" className="text-blue-600 font-medium">
                                    <div className="flex items-center gap-2">
                                        <Plus className="w-4 h-4" />
                                        <span>Create New Customer</span>
                                    </div>
                                </SelectItem>
                                {customers.sort((a, b) => a.name.localeCompare(b.name)).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    {newEvent.customer_id && newEvent.customer_id !== 'CREATE_NEW' && (
                        <CarrierBlockerWarning customerId={newEvent.customer_id} selectedCarrierIds={[]} />
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="mode">Mode</Label>
                        <Select onValueChange={value => handleValueChange('mode', value)} value={newEvent.mode}>
                            <SelectTrigger id="mode">
                                <SelectValue placeholder="Select mode" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="LTL">LTL</SelectItem>
                                <SelectItem value="Full Truckload">Full Truckload</SelectItem>
                                <SelectItem value="Home Delivery">Home Delivery</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="stage">Initial Stage</Label>
                        <Select onValueChange={value => handleValueChange('stage', value)} defaultValue="discovery" value={newEvent.stage}>
                            <SelectTrigger id="stage">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {CSP_STAGES.map(s => <SelectItem key={s} value={s}>{formatCspStage(s)}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="priority">Priority</Label>
                        <Select onValueChange={value => handleValueChange('priority', value)} defaultValue="medium" value={newEvent.priority}>
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
                    <div className="space-y-2">
                        <Label htmlFor="assigned_to">Assigned To *</Label>
                        <Select onValueChange={value => handleValueChange('assigned_to', value)} value={newEvent.assigned_to} required>
                            <SelectTrigger id="assigned_to">
                                <SelectValue placeholder="Select a user" />
                            </SelectTrigger>
                            <SelectContent>
                                {users.length > 0 ? (
                                    users.sort((a, b) => a.email.localeCompare(b.email)).map(u => <SelectItem key={u.id} value={u.email}>{u.email}</SelectItem>)
                                ) : (
                                    <div className="p-2 text-sm text-slate-500">No users available</div>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="due_date">Expected Due Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    id="due_date"
                                    variant="outline"
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !newEvent.due_date && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {newEvent.due_date ? format(new Date(newEvent.due_date + 'T00:00:00'), "PPP") : "Select due date"}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={newEvent.due_date ? new Date(newEvent.due_date + 'T00:00:00') : undefined}
                                    onSelect={(date) => {
                                        if (date) {
                                            const year = date.getFullYear();
                                            const month = String(date.getMonth() + 1).padStart(2, '0');
                                            const day = String(date.getDate()).padStart(2, '0');
                                            handleValueChange('due_date', `${year}-${month}-${day}`);
                                        } else {
                                            handleValueChange('due_date', null);
                                        }
                                    }}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                     <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" value={newEvent.description} onChange={e => handleValueChange('description', e.target.value)} placeholder="Add any relevant details..." />
                    </div>
                    <div className="space-y-2">
                        <Label>Attach Documents</Label>
                        <div className="space-y-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full gap-2"
                            >
                                <Upload className="w-4 h-4" />
                                Add Files
                            </Button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                className="hidden"
                                onChange={handleFileSelect}
                            />
                            {attachedFiles.length > 0 && (
                                <div className="space-y-2">
                                    {attachedFiles.map((file, index) => (
                                        <Card key={index}>
                                            <CardContent className="p-3 flex items-center justify-between">
                                                <div className="flex items-center gap-2 flex-grow min-w-0">
                                                    <FileText className="w-4 h-4 text-slate-500 flex-shrink-0" />
                                                    <div className="min-w-0 flex-grow">
                                                        <p className="text-sm font-medium truncate">{file.name}</p>
                                                        <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
                                                    </div>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeFile(index)}
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                </ScrollArea>
                <SheetFooter className="mt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isLoading || !newEvent.title || !newEvent.customer_id || !newEvent.assigned_to}>
                        {isLoading ? 'Creating...' : 'Create Event'}
                    </Button>
                </SheetFooter>
            </SheetContent>

            <Dialog open={showNewCustomerDialog} onOpenChange={setShowNewCustomerDialog}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Create New Customer</DialogTitle>
                        <DialogDescription>Add a new customer to your database.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="customer_name">Customer Name *</Label>
                            <Input
                                id="customer_name"
                                value={newCustomer.name}
                                onChange={e => setNewCustomer(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="e.g., Acme Corporation"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="csp_strategy">CSP Strategy</Label>
                            <Textarea
                                id="csp_strategy"
                                value={newCustomer.csp_strategy}
                                onChange={e => setNewCustomer(prev => ({ ...prev, csp_strategy: e.target.value }))}
                                placeholder="Customer savings project strategy..."
                                rows={3}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="customer_notes">Notes</Label>
                            <Textarea
                                id="customer_notes"
                                value={newCustomer.notes}
                                onChange={e => setNewCustomer(prev => ({ ...prev, notes: e.target.value }))}
                                placeholder="Additional notes about this customer..."
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowNewCustomerDialog(false)}>Cancel</Button>
                        <Button onClick={handleCreateCustomer} disabled={createCustomerMutation.isPending || !newCustomer.name}>
                            {createCustomerMutation.isPending ? 'Creating...' : 'Create Customer'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Sheet>
    );
}
