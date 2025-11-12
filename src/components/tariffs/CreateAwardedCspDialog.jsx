import React, { useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Customer, CSPEvent, Carrier } from '../../api/entities';
import { supabase } from '../../api/supabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Calendar as CalendarIcon, Award, Upload, X, FileText, ExternalLink, Check, ChevronsUpDown } from 'lucide-react';
import { useToast } from '../ui/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { Badge } from '../ui/badge';
import { createPageUrl } from '../../utils';

const MOCK_USER_ID = '00000000-0000-0000-0000-000000000000';

export default function CreateAwardedCspDialog({
  isOpen,
  onOpenChange,
  onCspCreated,
  preselectedCustomerId = null
}) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    title: '',
    customer_id: preselectedCustomerId || '',
    carrier_ids: [],
    description: '',
    assigned_to: '',
    due_date: null
  });

  const [file, setFile] = useState(null);
  const [carrierSearchOpen, setCarrierSearchOpen] = useState(false);
  const [carrierSearchValue, setCarrierSearchValue] = useState('');

  const { data: customers = [], isLoading: isLoadingCustomers } = useQuery({
    queryKey: ['customers'],
    queryFn: () => Customer.list(),
    enabled: isOpen
  });

  const { data: carriers = [], isLoading: isLoadingCarriers } = useQuery({
    queryKey: ['carriers'],
    queryFn: () => Carrier.list(),
    enabled: isOpen
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

  const createCspEventMutation = useMutation({
    mutationFn: async (eventData) => {
      const userId = user?.id || MOCK_USER_ID;

      const payload = {
        title: eventData.title,
        customer_id: eventData.customer_id,
        stage: 'awarded',
        priority: 'high',
        description: eventData.description || `Awarded tariff ready for implementation. ${actionType === 'upload' ? 'Created via document upload.' : 'Created via manual entry.'}`,
        assigned_to: eventData.assigned_to || userId,
        due_date: eventData.due_date,
        created_by: userId,
        updated_by: userId
      };

      const { data, error } = await supabase
        .from('csp_events')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['csp-events'] });
      toast({
        title: 'CSP Event Created',
        description: `"${data.title}" has been created in Awarded stage and is ready for tariff implementation.`,
      });

      if (onCspCreated) {
        onCspCreated({ ...data, file });
      }

      handleReset();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create CSP event',
        variant: 'destructive',
      });
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.title || !formData.customer_id) {
      toast({
        title: 'Validation Error',
        description: 'Please provide event title and select a customer',
        variant: 'destructive',
      });
      return;
    }

    if (formData.carrier_ids.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please select at least one carrier',
        variant: 'destructive',
      });
      return;
    }

    createCspEventMutation.mutate(formData);
  };

  const handleReset = () => {
    setFormData({
      title: '',
      customer_id: preselectedCustomerId || '',
      carrier_ids: [],
      description: '',
      assigned_to: '',
      due_date: null
    });
    setFile(null);
    setCarrierSearchValue('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCarrierSelect = (carrierId) => {
    if (!formData.carrier_ids.includes(carrierId)) {
      setFormData(prev => ({
        ...prev,
        carrier_ids: [...prev.carrier_ids, carrierId]
      }));
    }
    setCarrierSearchOpen(false);
    setCarrierSearchValue('');
  };

  const handleCarrierRemove = (carrierId) => {
    setFormData(prev => ({
      ...prev,
      carrier_ids: prev.carrier_ids.filter(id => id !== carrierId)
    }));
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        toast({
          title: 'Invalid File Type',
          description: 'Please upload a PDF file',
          variant: 'destructive',
        });
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleFileRemove = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCancel = () => {
    handleReset();
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-green-600" />
            <DialogTitle>Create Awarded CSP Event</DialogTitle>
          </div>
          <DialogDescription>
            Document this tariff as an awarded CSP event ready for implementation.
            This ensures proper tracking and compliance with procurement processes.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 px-1">
          <div className="space-y-2">
            <Label htmlFor="title">Event Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Q1 2025 LTL Rate Renewal - Swift Transport"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer_id">Customer *</Label>
            <Select
              value={formData.customer_id}
              onValueChange={(value) => setFormData({ ...formData, customer_id: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Carrier(s) *</Label>

            {formData.carrier_ids.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.carrier_ids.map(carrierId => {
                  const carrier = carriers.find(c => c.id === carrierId);
                  return carrier ? (
                    <Badge key={carrierId} variant="secondary" className="pl-2 pr-1">
                      {carrier.name}
                      <button
                        type="button"
                        onClick={() => handleCarrierRemove(carrierId)}
                        className="ml-1 hover:bg-slate-300 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ) : null;
                })}
              </div>
            )}

            <Popover open={carrierSearchOpen} onOpenChange={setCarrierSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={carrierSearchOpen}
                  className="w-full justify-between"
                >
                  Search and select carriers...
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0 z-[100]" align="start" side="bottom" sideOffset={4}>
                <Command>
                  <CommandInput
                    placeholder="Type carrier name..."
                    value={carrierSearchValue}
                    onValueChange={setCarrierSearchValue}
                  />
                  <CommandList>
                    <CommandEmpty>
                      <div className="p-4 text-center space-y-2">
                        <p className="text-sm text-slate-600">No carrier found with that name</p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleReset();
                            onOpenChange(false);
                            setTimeout(() => {
                              navigate(createPageUrl('CarrierDetail?new=true'));
                            }, 100);
                          }}
                          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Create new carrier
                        </button>
                      </div>
                    </CommandEmpty>
                    <CommandGroup>
                      {carriers
                        .filter(carrier => !formData.carrier_ids.includes(carrier.id))
                        .map((carrier) => (
                          <CommandItem
                            key={carrier.id}
                            value={carrier.name}
                            onSelect={() => handleCarrierSelect(carrier.id)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.carrier_ids.includes(carrier.id) ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {carrier.name}
                          </CommandItem>
                        ))}
                      <div className="border-t border-slate-200 mt-1 pt-1">
                        <CommandItem
                          onSelect={() => {
                            handleReset();
                            onOpenChange(false);
                            setTimeout(() => {
                              navigate(createPageUrl('CarrierDetail?new=true'));
                            }, 100);
                          }}
                          className="text-blue-600 font-medium cursor-pointer"
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Add New Carrier
                        </CommandItem>
                      </div>
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assigned_to">Assigned To</Label>
            <Select
              value={formData.assigned_to}
              onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Assign to user (defaults to you)" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="due_date">Implementation Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.due_date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.due_date ? format(formData.due_date, 'PPP') : 'Select date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[100]" align="start" side="bottom" sideOffset={4}>
                <Calendar
                  mode="single"
                  selected={formData.due_date}
                  onSelect={(date) => setFormData({ ...formData, due_date: date })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Additional notes about this awarded tariff..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">Tariff Document (Optional)</Label>
            <div className="space-y-2">
              {!file ? (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    id="file"
                    accept=".pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload PDF Document
                  </Button>
                  <p className="text-xs text-slate-500">
                    You can upload the tariff PDF now or add it later
                  </p>
                </>
              ) : (
                <div className="flex items-center gap-2 p-3 border rounded-md bg-slate-50">
                  <FileText className="w-5 h-5 text-slate-600" />
                  <span className="flex-1 text-sm truncate">{file.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleFileRemove}
                    className="h-6 w-6 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-800">
            <div className="font-medium mb-1">Stage: Awarded</div>
            <div>This CSP event will be created in the "Awarded" stage, indicating the tariff has been finalized and is ready for implementation and activation.</div>
          </div>
        </form>

        <DialogFooter className="flex-shrink-0 mt-4">
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={createCspEventMutation.isPending}>
            {createCspEventMutation.isPending ? 'Creating...' : 'Create CSP Event & Continue'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
