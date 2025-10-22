
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
import { Upload, X, FileText, Calendar as CalendarIcon } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { useToast } from '../ui/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

const STAGES = ["discovery", "data_room_ready", "rfp_sent", "qa_round", "round_1", "final_offers", "awarded", "implementation", "validation", "live", "renewal_watch"];
const MOCK_USER_ID = '00000000-0000-0000-0000-000000000000';

export default function NewEventSheet({ isOpen, onOpenChange, customers: customersProp = [] }) {
    const { toast } = useToast();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const fileInputRef = useRef(null);
    const [newEvent, setNewEvent] = useState({
        title: '',
        customer_id: '',
        stage: 'discovery',
        priority: 'medium',
        description: '',
        assigned_to: '',
        due_date: null
    });

    const { data: customers = [], isLoading: isLoadingCustomers } = useQuery({
        queryKey: ['customers'],
        queryFn: () => Customer.list(),
        enabled: isOpen,
        initialData: customersProp
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
    }, [isOpen, user]);

    const createEventMutation = useMutation({
        mutationFn: async (eventData) => {
            const createdEvent = await CSPEvent.create(eventData);

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
            setNewEvent({ title: '', customer_id: '', stage: 'discovery', priority: 'medium', description: '', assigned_to: '', due_date: null });
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
        if (!newEvent.title || !newEvent.customer_id) {
            toast({
                title: "Validation Error",
                description: "Please fill in the event title and select a customer.",
                variant: "destructive",
            });
            return;
        }
        setIsLoading(true);
        createEventMutation.mutate(newEvent);
    };

    const handleValueChange = (field, value) => {
        setNewEvent(prev => ({ ...prev, [field]: value }));
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
            <SheetContent className="sm:max-w-lg">
                <SheetHeader>
                    <SheetTitle>Create New CSP Event</SheetTitle>
                    <SheetDescription>Start a new customer savings project in your pipeline.</SheetDescription>
                </SheetHeader>
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
                                {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
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
                                {STAGES.map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, ' ')}</SelectItem>)}
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
                        <Label htmlFor="assigned_to">Assigned To</Label>
                        <Input
                            id="assigned_to"
                            value={newEvent.assigned_to || user?.email || ''}
                            disabled
                            className="bg-slate-50 text-slate-600"
                        />
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
                                    {newEvent.due_date ? format(new Date(newEvent.due_date), "PPP") : "Select due date"}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={newEvent.due_date ? new Date(newEvent.due_date) : undefined}
                                    onSelect={(date) => handleValueChange('due_date', date ? format(date, 'yyyy-MM-dd') : null)}
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
                <SheetFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isLoading || !newEvent.title || !newEvent.customer_id}>
                        {isLoading ? 'Creating...' : 'Create Event'}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
