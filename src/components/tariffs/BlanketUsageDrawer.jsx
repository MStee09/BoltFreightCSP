import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Customer, Carrier } from '../../api/entities';
import { supabase } from '../../api/supabaseClient';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '../ui/drawer';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { ScrollArea } from '../ui/scroll-area';
import { Search, Plus, X, ExternalLink, Download, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import { createPageUrl } from '../../utils';
import { toast } from 'sonner';

export default function BlanketUsageDrawer({ isOpen, onOpenChange, tariff, carrier }) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);

  const { data: allCustomers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => Customer.list(),
    initialData: []
  });

  const assignedCustomers = tariff?.customer_ids
    ? allCustomers.filter(c => tariff.customer_ids.includes(c.id))
    : [];

  const availableCustomers = allCustomers.filter(
    c => !tariff?.customer_ids?.includes(c.id)
  );

  const filteredAssignedCustomers = assignedCustomers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addCustomerMutation = useMutation({
    mutationFn: async (customerId) => {
      const updatedCustomerIds = [...(tariff.customer_ids || []), customerId];
      const { data, error } = await supabase
        .from('tariffs')
        .update({ customer_ids: updatedCustomerIds })
        .eq('id', tariff.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['tariffs']);
      toast.success('Customer added to blanket tariff');
      setAddCustomerOpen(false);
    },
    onError: (error) => {
      toast.error(`Failed to add customer: ${error.message}`);
    }
  });

  const removeCustomerMutation = useMutation({
    mutationFn: async (customerId) => {
      const updatedCustomerIds = (tariff.customer_ids || []).filter(id => id !== customerId);
      const { data, error } = await supabase
        .from('tariffs')
        .update({ customer_ids: updatedCustomerIds })
        .eq('id', tariff.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['tariffs']);
      toast.success('Customer removed from blanket tariff');
    },
    onError: (error) => {
      toast.error(`Failed to remove customer: ${error.message}`);
    }
  });

  const exportList = () => {
    const csv = [
      ['Customer Name', 'Segment', 'Status'].join(','),
      ...assignedCustomers.map(c => [
        `"${c.name}"`,
        `"${c.segment || ''}"`,
        `"${c.status || ''}"`,
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `blanket_tariff_customers_${tariff?.tariff_reference_id || 'export'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!tariff) return null;

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-2xl mx-auto max-h-[90vh]">
        <DrawerHeader className="border-b">
          <div className="flex items-start justify-between">
            <div>
              <DrawerTitle className="text-xl font-bold flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-orange-600" />
                Blanket Tariff Usage
              </DrawerTitle>
              <DrawerDescription className="mt-2 space-y-1">
                <div className="font-mono font-semibold text-slate-900">{tariff.tariff_reference_id || tariff.version}</div>
                <div className="flex items-center gap-4 text-sm">
                  <span><strong>Carrier:</strong> {carrier?.name || '—'}</span>
                  <span><strong>Ownership:</strong> <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Blanket</Badge></span>
                </div>
                {tariff.effective_date && tariff.expiry_date && (
                  <div className="text-sm">
                    <strong>Active Dates:</strong> {format(new Date(tariff.effective_date), 'MMM dd, yyyy')} – {format(new Date(tariff.expiry_date), 'MMM dd, yyyy')}
                  </div>
                )}
              </DrawerDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportList}
                disabled={assignedCustomers.length === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(createPageUrl(`TariffDetail?id=${tariff.id}`), '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View Details
              </Button>
            </div>
          </div>
        </DrawerHeader>

        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Applied To ({assignedCustomers.length} {assignedCustomers.length === 1 ? 'customer' : 'customers'})
              </h3>
              <p className="text-sm text-slate-500">Customers using this blanket tariff</p>
            </div>
            <Popover open={addCustomerOpen} onOpenChange={setAddCustomerOpen}>
              <PopoverTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Customer
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="end">
                <Command>
                  <CommandInput placeholder="Search customers..." />
                  <CommandList>
                    <CommandEmpty>No customers found.</CommandEmpty>
                    <CommandGroup>
                      <ScrollArea className="h-[200px]">
                        {availableCustomers.map((customer) => (
                          <CommandItem
                            key={customer.id}
                            onSelect={() => addCustomerMutation.mutate(customer.id)}
                            className="cursor-pointer"
                          >
                            <div className="flex flex-col">
                              <span className="font-medium">{customer.name}</span>
                              {customer.segment && (
                                <span className="text-xs text-slate-500">{customer.segment}</span>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </ScrollArea>
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <ScrollArea className="h-[400px] border rounded-lg">
            {filteredAssignedCustomers.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                {searchTerm ? 'No matching customers found' : 'No customers assigned yet'}
              </div>
            ) : (
              <div className="divide-y">
                {filteredAssignedCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-slate-900">{customer.name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        {customer.segment && (
                          <Badge variant="outline" className="text-xs">
                            {customer.segment}
                          </Badge>
                        )}
                        {customer.status && (
                          <Badge variant="secondary" className="text-xs capitalize">
                            {customer.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(createPageUrl(`CustomerDetail?id=${customer.id}`), '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          if (window.confirm(`Remove ${customer.name} from this blanket tariff?`)) {
                            removeCustomerMutation.mutate(customer.id);
                          }
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
