
import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Customer, Carrier, Tariff, CSPEvent, Task, Interaction, Alert, Shipment, LostOpportunity, ReportSnapshot } from "../api/entities";
import { createPageUrl } from "../utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { PlusCircle, Search, TrendingUp, TrendingDown, Star, Eye, FileText, BarChart3, ArrowUpDown, Filter, X, Trash2 } from "lucide-react";
import { Skeleton } from "../components/ui/skeleton";
import { format, formatDistanceToNow, differenceInDays } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/ui/tooltip";
import { supabase } from "../api/supabaseClient";
import { useUserRole } from "../hooks/useUserRole";
import { toast } from "sonner";
import TariffSummaryDrawer from "../components/customers/TariffSummaryDrawer";
import CustomerMetricsDrawer from "../components/customers/CustomerMetricsDrawer";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "../components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../components/ui/alert-dialog";
import { useQueryClient } from "@tanstack/react-query";

export default function CustomersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const { userProfile } = useUserRole();
  const [userPins, setUserPins] = useState(new Set());
  const [selectedTariff, setSelectedTariff] = useState(null);
  const [showTariffDrawer, setShowTariffDrawer] = useState(false);
  const [selectedCustomerForMetrics, setSelectedCustomerForMetrics] = useState(null);
  const [showMetricsDrawer, setShowMetricsDrawer] = useState(false);
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [segmentFilter, setSegmentFilter] = useState('all');
  const [hoveredRowId, setHoveredRowId] = useState(null);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: customers = [], isLoading: isLoadingCustomers } = useQuery({ queryKey: ["customers"], queryFn: () => Customer.list("-created_date"), initialData: [] });
  const { data: tariffs = [], isLoading: isLoadingTariffs } = useQuery({ queryKey: ["tariffs"], queryFn: () => Tariff.list(), initialData: [] });
  const { data: cspEvents = [], isLoading: isLoadingEvents } = useQuery({ queryKey: ["csp_events"], queryFn: () => CSPEvent.list(), initialData: [] });
  const { data: tasks = [], isLoading: isLoadingTasks } = useQuery({ queryKey: ["tasks"], queryFn: () => Task.list(), initialData: [] });
  const { data: interactions = [], isLoading: isLoadingInteractions } = useQuery({ queryKey: ["interactions"], queryFn: () => Interaction.list("-created_date"), initialData: [] });

  const isLoading = isLoadingCustomers || isLoadingTariffs || isLoadingEvents || isLoadingTasks || isLoadingInteractions;

  const { data: carriers = [] } = useQuery({ queryKey: ["carriers"], queryFn: () => Carrier.list(), initialData: [] });

  const { data: userProfiles = [] } = useQuery({
    queryKey: ["user_profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("id, first_name, last_name");
      if (error) throw error;
      return data || [];
    },
    initialData: [],
  });

  const { data: userPinsData = [] } = useQuery({
    queryKey: ["user_pins_customers", userProfile?.id],
    queryFn: async () => {
      if (!userProfile?.id) return [];
      const { data, error } = await supabase
        .from('user_pins')
        .select('*')
        .eq('user_id', userProfile.id)
        .eq('pin_type', 'customer');
      if (error) throw error;
      return data || [];
    },
    enabled: !!userProfile?.id,
    initialData: []
  });

  React.useEffect(() => {
    if (userPinsData) {
      const pins = new Set(userPinsData.map(p => p.ref_id));
      setUserPins(pins);
    }
  }, [userPinsData]);

  const togglePin = async (customerId) => {
    if (!userProfile?.id) return;

    const isPinned = userPins.has(customerId);

    try {
      if (isPinned) {
        const { error } = await supabase
          .from('user_pins')
          .delete()
          .eq('user_id', userProfile.id)
          .eq('pin_type', 'customer')
          .eq('ref_id', customerId);
        if (error) throw error;
        toast.success('Customer unpinned');
      } else {
        const { error } = await supabase
          .from('user_pins')
          .insert({ user_id: userProfile.id, pin_type: 'customer', ref_id: customerId });
        if (error) throw error;
        toast.success('Customer pinned to top');
      }

      const updatedPins = new Set(userPins);
      if (isPinned) {
        updatedPins.delete(customerId);
      } else {
        updatedPins.add(customerId);
      }
      setUserPins(updatedPins);
    } catch (error) {
      console.error('Error toggling pin:', error);
      toast.error('Failed to update pin');
    }
  };

  const customerData = useMemo(() => {
    const today = new Date();
    return customers.map(customer => {
      const customerTariffs = tariffs.filter(t => t.customer_id === customer.id);
      const activeTariffs = customerTariffs.filter(t => {
        const expiryDate = t.expiry_date ? new Date(t.expiry_date) : null;
        return t.status === 'active' && (!expiryDate || expiryDate > today);
      });
      const expiringTariffs = customerTariffs.filter(t => {
        const expiryDate = t.expiry_date ? new Date(t.expiry_date) : null;
        const daysUntilExpiry = expiryDate ? differenceInDays(expiryDate, today) : null;
        return t.status === 'active' && daysUntilExpiry !== null && daysUntilExpiry <= 90 && daysUntilExpiry > 0;
      });
      const activeTariff = activeTariffs[0];
      const nextCspEvent = cspEvents.find(e => e.customer_id === customer.id && e.status === 'in_progress');
      const renewalCspEvents = cspEvents.filter(e =>
        e.customer_id === customer.id &&
        e.related_tariff_family_id &&
        activeTariff?.tariff_family_id === e.related_tariff_family_id
      );
      const openTasksCount = tasks.filter(t => t.entity_id === customer.id && t.entity_type === 'customer' && t.status === 'open').length;
      const marginTrend = (customer.margin_30d || 0) - (customer.margin_60d || 0);
      const lastInteraction = interactions.find(i => i.entity_id === customer.id && i.entity_type === 'customer');

      return {
        ...customer,
        activeTariff: activeTariff,
        activeTariffsCount: activeTariffs.length,
        expiringTariffsCount: expiringTariffs.length,
        activeTariffDisplay: activeTariff ? `${activeTariff.version}` : 'N/A',
        nextCspEvent: nextCspEvent,
        renewalCspEvents: renewalCspEvents,
        nextCspDueDate: nextCspEvent?.due_date ? format(new Date(nextCspEvent.due_date), "MMM d, yyyy") : 'N/A',
        lastInteraction: lastInteraction,
        usagePercentage: 98.5,
        marginTrend: marginTrend,
        openTasksCount: openTasksCount,
        lastTouchDate: lastInteraction ? formatDistanceToNow(new Date(lastInteraction.created_date), { addSuffix: true }) : 'N/A',
      };
    });
  }, [customers, tariffs, cspEvents, tasks, interactions]);

  const filteredCustomers = useMemo(() => {
    let filtered = customerData.filter(c =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (ownerFilter !== 'all') {
      filtered = filtered.filter(c => c.csp_owner_id === ownerFilter);
    }

    if (segmentFilter !== 'all') {
      filtered = filtered.filter(c => c.segment === segmentFilter);
    }

    if (sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        let valueA, valueB;

        if (sortColumn === 'name') {
          valueA = (a.name || '').toLowerCase();
          valueB = (b.name || '').toLowerCase();
          if (sortDirection === 'asc') {
            return valueA.localeCompare(valueB);
          } else {
            return valueB.localeCompare(valueA);
          }
        } else if (sortColumn === 'marginTrend') {
          valueA = a.marginTrend || 0;
          valueB = b.marginTrend || 0;
        } else if (sortColumn === 'lastTouch') {
          const dateA = a.lastInteraction?.created_date ? new Date(a.lastInteraction.created_date) : new Date(0);
          const dateB = b.lastInteraction?.created_date ? new Date(b.lastInteraction.created_date) : new Date(0);
          valueA = dateA.getTime();
          valueB = dateB.getTime();
        } else {
          return 0;
        }

        if (sortDirection === 'asc') {
          return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
        } else {
          return valueA < valueB ? 1 : valueA > valueB ? -1 : 0;
        }
      });
    }

    const pinned = filtered.filter(c => userPins.has(c.id));
    const unpinned = filtered.filter(c => !userPins.has(c.id));

    return [...pinned, ...unpinned];
  }, [customerData, searchTerm, userPins, ownerFilter, segmentFilter, sortColumn, sortDirection]);

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleDeleteClick = (customer) => {
    setCustomerToDelete(customer);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!customerToDelete) return;

    try {
      await Customer.delete(customerToDelete.id);
      toast.success('Customer deleted successfully');
      queryClient.invalidateQueries(['customers']);
      setShowDeleteDialog(false);
      setCustomerToDelete(null);
    } catch (error) {
      toast.error(error.message || 'Failed to delete customer');
    }
  };

  const uniqueOwners = useMemo(() => {
    const owners = new Set();
    customers.forEach(c => {
      if (c.csp_owner_id) owners.add(c.csp_owner_id);
    });
    return Array.from(owners).map(id => userProfiles.find(u => u.id === id)).filter(Boolean);
  }, [customers, userProfiles]);

  const uniqueSegments = useMemo(() => {
    const segments = new Set();
    customers.forEach(c => {
      if (c.segment) segments.add(c.segment);
    });
    return Array.from(segments);
  }, [customers]);
  
  const handleRowClick = (customerId) => {
      navigate(createPageUrl(`CustomerDetail?id=${customerId}`));
  };

  return (
    <>
      <div className="p-6 lg:p-8 max-w-full mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Customers</h1>
            <p className="text-slate-600 mt-1">Manage all your customer accounts and relationships.</p>
          </div>
          <Button
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => navigate(createPageUrl("CustomerDetail?new=true"))}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            New Customer
          </Button>
        </div>

        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <span className="text-sm text-slate-600 font-medium">Filters:</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant={ownerFilter !== 'all' ? 'default' : 'outline'} size="sm" className="h-8">
                <Filter className="w-3.5 h-3.5 mr-1" />
                Owner: {ownerFilter === 'all' ? 'All' : userProfiles.find(u => u.id === ownerFilter)?.first_name || 'Unknown'}
                {ownerFilter !== 'all' && <X className="w-3 h-3 ml-1" onClick={(e) => { e.stopPropagation(); setOwnerFilter('all'); }} />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setOwnerFilter('all')}>All Owners</DropdownMenuItem>
              <DropdownMenuSeparator />
              {uniqueOwners.map(owner => (
                <DropdownMenuItem key={owner.id} onClick={() => setOwnerFilter(owner.id)}>
                  {owner.first_name} {owner.last_name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant={segmentFilter !== 'all' ? 'default' : 'outline'} size="sm" className="h-8">
                <Filter className="w-3.5 h-3.5 mr-1" />
                Segment: {segmentFilter === 'all' ? 'All' : segmentFilter}
                {segmentFilter !== 'all' && <X className="w-3 h-3 ml-1" onClick={(e) => { e.stopPropagation(); setSegmentFilter('all'); }} />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setSegmentFilter('all')}>All Segments</DropdownMenuItem>
              <DropdownMenuSeparator />
              {uniqueSegments.map(segment => (
                <DropdownMenuItem key={segment} onClick={() => setSegmentFilter(segment)}>
                  {segment}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
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
                  <TableHead className="w-8"></TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort('name')}
                      className="flex items-center gap-1 hover:text-slate-900 transition-colors"
                    >
                      Customer
                      {sortColumn === 'name' && (
                        <ArrowUpDown className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                      )}
                    </button>
                  </TableHead>
                  <TableHead>Segment</TableHead>
                  <TableHead>Active Tariffs</TableHead>
                  <TableHead>Next CSP Due</TableHead>
                  <TableHead>Usage %</TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort('marginTrend')}
                      className="flex items-center gap-1 hover:text-slate-900 transition-colors"
                    >
                      Margin Trend
                      {sortColumn === 'marginTrend' && (
                        <ArrowUpDown className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                      )}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort('lastTouch')}
                      className="flex items-center gap-1 hover:text-slate-900 transition-colors"
                    >
                      Last Touch
                      {sortColumn === 'lastTouch' && (
                        <ArrowUpDown className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                      )}
                    </button>
                  </TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? Array(8).fill(0).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
                )) : filteredCustomers.map(customer => {
                  const segmentColors = {
                    'Enterprise': 'bg-purple-100 text-purple-700 border-purple-200',
                    'Mid-Market': 'bg-blue-100 text-blue-700 border-blue-200',
                    'SMB': 'bg-green-100 text-green-700 border-green-200'
                  };

                  const tariff = customer.activeTariff;
                  const carrier = tariff ? carriers.find(c => c.id === tariff.carrier_id) : null;

                  const getCspStageBadge = (stage) => {
                    const stageColors = {
                      'draft': 'bg-slate-100 text-slate-700 border-slate-300',
                      'rfp_issued': 'bg-blue-100 text-blue-700 border-blue-300',
                      'under_review': 'bg-yellow-100 text-yellow-700 border-yellow-300',
                      'awarded': 'bg-green-100 text-green-700 border-green-300',
                      'implementation': 'bg-purple-100 text-purple-700 border-purple-300'
                    };
                    const stageLabels = {
                      'draft': 'Draft',
                      'rfp_issued': 'RFP Issued',
                      'under_review': 'Under Review',
                      'awarded': 'Awarded',
                      'implementation': 'Implementation'
                    };
                    return <Badge variant="outline" className={`text-xs ${stageColors[stage] || stageColors.draft}`}>
                      {stageLabels[stage] || 'In Progress'}
                    </Badge>;
                  };

                  return (
                    <TableRow
                      key={customer.id}
                      onClick={() => handleRowClick(customer.id)}
                      className={`cursor-pointer hover:bg-slate-50 ${userPins.has(customer.id) ? 'bg-blue-50/30' : ''}`}
                      onMouseEnter={() => setHoveredRowId(customer.id)}
                      onMouseLeave={() => setHoveredRowId(null)}
                    >
                      <TableCell className="p-4" onClick={e => e.stopPropagation()}>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  togglePin(customer.id);
                                }}
                                className="text-slate-400 hover:text-blue-600 transition-colors"
                              >
                                <Star className={`w-4 h-4 ${userPins.has(customer.id) ? 'fill-blue-600 text-blue-600' : ''}`} />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {userPins.has(customer.id) ? 'Unpin customer' : 'Pin customer to top'}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="font-medium text-slate-900">{customer.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${segmentColors[customer.segment] || 'bg-slate-100 text-slate-700'} font-medium`}>
                          {customer.segment || 'Mid-Market'}
                        </Badge>
                      </TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          {customer.activeTariffsCount > 0 ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 font-medium">
                              {customer.activeTariffsCount} Active
                            </Badge>
                          ) : (
                            <span className="text-slate-400">N/A</span>
                          )}
                          {customer.expiringTariffsCount > 0 && (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 font-medium">
                              {customer.expiringTariffsCount} Expiring
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {customer.renewalCspEvents?.length > 0 ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const renewalCsp = customer.renewalCspEvents[0];
                                    navigate(createPageUrl(`CspEventDetail?id=${renewalCsp.id}`));
                                  }}
                                  className="inline-flex flex-col items-start gap-1"
                                >
                                  <span className="text-xs text-slate-500">Renewal CSP</span>
                                  {getCspStageBadge(customer.renewalCspEvents[0].stage)}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Click to view renewal CSP event</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          customer.nextCspDueDate
                        )}
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help">{customer.usagePercentage}%</span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Derived from shipment data feed</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className={`flex items-center gap-1 cursor-help ${customer.marginTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {customer.marginTrend >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                {customer.marginTrend.toFixed(1)}%
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Derived from shipment data feed</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell>{customer.lastTouchDate}</TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <div className={`flex items-center justify-end gap-0.5 transition-opacity ${hoveredRowId === customer.id ? 'opacity-100' : 'opacity-0'}`}>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => handleRowClick(customer.id)}
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Open Customer</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => navigate(createPageUrl(`Tariffs?customer=${customer.id}&ownership=rocket_csp&status=active`))}
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>View Tariffs</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => {
                                    setSelectedCustomerForMetrics(customer);
                                    setShowMetricsDrawer(true);
                                  }}
                                >
                                  <BarChart3 className="w-3.5 h-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Open Metrics</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteClick(customer);
                                  }}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete Customer</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <TariffSummaryDrawer
        isOpen={showTariffDrawer}
        onOpenChange={setShowTariffDrawer}
        tariff={selectedTariff}
      />

      <CustomerMetricsDrawer
        isOpen={showMetricsDrawer}
        onOpenChange={setShowMetricsDrawer}
        customer={selectedCustomerForMetrics}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{customerToDelete?.name}"? This action cannot be undone and will remove all associated data including tariffs, CSP events, and interactions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete Customer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
