
import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Customer, Carrier, Tariff, CSPEvent, Task, Interaction, Alert, Shipment, LostOpportunity, ReportSnapshot } from "../api/entities";
import { createPageUrl } from "../utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { PlusCircle, Search, TrendingUp, TrendingDown } from "lucide-react";
import { Skeleton } from "../components/ui/skeleton";
import { format, formatDistanceToNow } from "date-fns";
import CustomerDetailSheet from "../components/customers/CustomerDetailSheet";
import { Checkbox } from "../components/ui/checkbox";

export default function CustomersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const { data: customers = [], isLoading: isLoadingCustomers } = useQuery({ queryKey: ["customers"], queryFn: () => Customer.list("-created_date"), initialData: [] });
  const { data: tariffs = [], isLoading: isLoadingTariffs } = useQuery({ queryKey: ["tariffs"], queryFn: () => Tariff.list(), initialData: [] });
  const { data: cspEvents = [], isLoading: isLoadingEvents } = useQuery({ queryKey: ["csp_events"], queryFn: () => CSPEvent.list(), initialData: [] });
  const { data: tasks = [], isLoading: isLoadingTasks } = useQuery({ queryKey: ["tasks"], queryFn: () => Task.list(), initialData: [] });
  const { data: interactions = [], isLoading: isLoadingInteractions } = useQuery({ queryKey: ["interactions"], queryFn: () => Interaction.list("-created_date"), initialData: [] });

  const isLoading = isLoadingCustomers || isLoadingTariffs || isLoadingEvents || isLoadingTasks || isLoadingInteractions;

  const customerData = useMemo(() => {
    return customers.map(customer => {
      const activeTariff = tariffs.find(t => t.customer_id === customer.id && t.status === 'active');
      const nextCspEvent = cspEvents.find(e => e.customer_id === customer.id && e.status === 'in_progress');
      const openTasksCount = tasks.filter(t => t.entity_id === customer.id && t.entity_type === 'customer' && t.status === 'open').length;
      const marginTrend = (customer.margin_30d || 0) - (customer.margin_60d || 0);
      const lastInteraction = interactions.find(i => i.entity_id === customer.id && i.entity_type === 'customer');

      return {
        ...customer,
        activeTariff: activeTariff ? `${activeTariff.version}` : 'N/A',
        nextCspDueDate: nextCspEvent?.due_date ? format(new Date(nextCspEvent.due_date), "MMM d, yyyy") : 'N/A',
        usagePercentage: 98.5, // Dummy data
        marginTrend: marginTrend,
        openTasksCount: openTasksCount,
        lastTouchDate: lastInteraction ? formatDistanceToNow(new Date(lastInteraction.created_date), { addSuffix: true }) : 'N/A',
      };
    });
  }, [customers, tariffs, cspEvents, tasks, interactions]);

  const filteredCustomers = customerData.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.account_owner?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleRowClick = (customerId) => {
      setSelectedCustomerId(customerId);
      setIsSheetOpen(true);
  };

  return (
    <>
      <div className="p-6 lg:p-8 max-w-full mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Customers</h1>
            <p className="text-slate-600 mt-1">Manage all your customer accounts and relationships.</p>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Customer
          </Button>
        </div>

        <div className="bg-white/80 backdrop-blur rounded-2xl shadow-lg border-t border-slate-100">
          <div className="p-4 border-b border-slate-100">
            <div className="flex items-center">
              <Search className="h-4 w-4 text-slate-500 mr-2" />
              <Input 
                placeholder="Search customers or owners..." 
                className="max-w-sm border-0 focus-visible:ring-0 shadow-none bg-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 text-xs uppercase tracking-wider text-slate-500 hover:bg-slate-50/50">
                  <TableHead className="p-4"><Checkbox /></TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Segment</TableHead>
                  <TableHead>Active Tariff</TableHead>
                  <TableHead>Next CSP Due</TableHead>
                  <TableHead>Usage %</TableHead>
                  <TableHead>Margin Trend</TableHead>
                  <TableHead>Last Touch</TableHead>
                  <TableHead>Owner</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? Array(8).fill(0).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={9}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
                )) : filteredCustomers.map(customer => {
                  const segmentColors = {
                    'Enterprise': 'bg-purple-100 text-purple-700 border-purple-200',
                    'Mid-Market': 'bg-blue-100 text-blue-700 border-blue-200',
                    'SMB': 'bg-green-100 text-green-700 border-green-200'
                  };
                  return (
                    <TableRow key={customer.id} onClick={() => handleRowClick(customer.id)} className="cursor-pointer hover:bg-slate-50">
                      <TableCell className="p-4" onClick={e => e.stopPropagation()}><Checkbox /></TableCell>
                      <TableCell className="font-medium text-slate-900">{customer.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${segmentColors[customer.segment] || 'bg-slate-100 text-slate-700'} font-medium`}>
                          {customer.segment || 'Mid-Market'}
                        </Badge>
                      </TableCell>
                      <TableCell>{customer.activeTariff}</TableCell>
                      <TableCell>{customer.nextCspDueDate}</TableCell>
                      <TableCell>{customer.usagePercentage}%</TableCell>
                      <TableCell className={`flex items-center gap-1 ${customer.marginTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {customer.marginTrend >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        {customer.marginTrend.toFixed(1)}%
                      </TableCell>
                      <TableCell>{customer.lastTouchDate}</TableCell>
                      <TableCell>{customer.account_owner}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
      <CustomerDetailSheet 
        customerId={selectedCustomerId}
        isOpen={isSheetOpen}
        onOpenChange={setIsSheetOpen}
      />
    </>
  );
}
