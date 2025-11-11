import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Carrier, Tariff } from "../api/entities";
import { createPageUrl } from "../utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { PlusCircle, Search, ArrowRight, Filter, X, ArrowUpDown, Star } from "lucide-react";
import { Skeleton } from "../components/ui/skeleton";
import { format, differenceInDays } from "date-fns";
import { Checkbox } from "../components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "../components/ui/dropdown-menu";
import { supabase } from "../api/supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";

export default function CarriersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");
  const [serviceTypeFilter, setServiceTypeFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [sortColumn, setSortColumn] = useState('on_time');
  const [sortDirection, setSortDirection] = useState('desc');
  const [userPins, setUserPins] = useState(new Set());
  const [hoveredRowId, setHoveredRowId] = useState(null);

  const { data: carriers = [], isLoading: isLoadingCarriers } = useQuery({
    queryKey: ["carriers"],
    queryFn: () => Carrier.list("-created_date"),
    initialData: [],
  });

  const { data: tariffs = [], isLoading: isLoadingTariffs } = useQuery({
    queryKey: ["tariffs"],
    queryFn: () => Tariff.list(),
    initialData: [],
  });

  const isLoading = isLoadingCarriers || isLoadingTariffs;

  const { data: userPinsData = [] } = useQuery({
    queryKey: ["user_pins_carriers", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('user_pins')
        .select('*')
        .eq('user_id', user.id)
        .eq('pin_type', 'carrier');
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    initialData: []
  });

  React.useEffect(() => {
    if (userPinsData) {
      const pins = new Set(userPinsData.map(p => p.ref_id));
      setUserPins(pins);
    }
  }, [userPinsData]);

  const togglePin = async (carrierId) => {
    if (!user?.id) return;

    const isPinned = userPins.has(carrierId);

    try {
      if (isPinned) {
        const { error } = await supabase
          .from('user_pins')
          .delete()
          .eq('user_id', user.id)
          .eq('pin_type', 'carrier')
          .eq('ref_id', carrierId);
        if (error) throw error;
        toast.success('Carrier unpinned');
      } else {
        const { error } = await supabase
          .from('user_pins')
          .insert({ user_id: user.id, pin_type: 'carrier', ref_id: carrierId });
        if (error) throw error;
        toast.success('Carrier pinned to top');
      }

      const updatedPins = new Set(userPins);
      if (isPinned) {
        updatedPins.delete(carrierId);
      } else {
        updatedPins.add(carrierId);
      }
      setUserPins(updatedPins);
    } catch (error) {
      console.error('Error toggling pin:', error);
      toast.error('Failed to update pin');
    }
  };

  const carrierData = useMemo(() => {
    return carriers.map(carrier => {
      const activeTariffsCount = tariffs.filter(t =>
        (t.carrier_id === carrier.id || (t.carrier_ids && t.carrier_ids.includes(carrier.id))) &&
        t.status === 'active'
      ).length;

      return {
        ...carrier,
        activeTariffsCount
      };
    });
  }, [carriers, tariffs]);

  const uniqueServiceTypes = useMemo(() => {
    const types = new Set();
    carriers.forEach(c => {
      if (c.carrier_type) types.add(c.carrier_type);
    });
    return Array.from(types);
  }, [carriers]);

  const uniqueOwners = useMemo(() => {
    const owners = new Set();
    carriers.forEach(c => {
      if (c.account_owner) owners.add(c.account_owner);
    });
    return Array.from(owners);
  }, [carriers]);

  const filteredCarriers = useMemo(() => {
    let filtered = carrierData.filter(c =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.scac_code?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (serviceTypeFilter !== 'all') {
      filtered = filtered.filter(c => c.carrier_type === serviceTypeFilter);
    }

    if (ownerFilter !== 'all') {
      filtered = filtered.filter(c => c.account_owner === ownerFilter);
    }

    if (sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        let valueA, valueB;

        if (sortColumn === 'on_time') {
          valueA = a.on_time_pct || 0;
          valueB = b.on_time_pct || 0;
        } else if (sortColumn === 'claims') {
          valueA = a.claims_pct || 0;
          valueB = b.claims_pct || 0;
        } else if (sortColumn === 'invoice_variance') {
          valueA = a.invoice_variance_pct || 0;
          valueB = b.invoice_variance_pct || 0;
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
  }, [carrierData, searchTerm, userPins, serviceTypeFilter, ownerFilter, sortColumn, sortDirection]);

  const summaryStats = useMemo(() => {
    const active = filteredCarriers.filter(c => c.status === 'active');
    const avgOnTime = active.length > 0
      ? active.reduce((sum, c) => sum + (c.on_time_pct || 0), 0) / active.length
      : 0;
    const avgClaims = active.length > 0
      ? active.reduce((sum, c) => sum + (c.claims_pct || 0), 0) / active.length
      : 0;

    const today = new Date();
    const qbrsDue = active.filter(c => {
      if (!c.next_qbr_date) return false;
      const daysUntil = differenceInDays(new Date(c.next_qbr_date), today);
      return daysUntil >= 0 && daysUntil <= 30;
    }).length;

    return {
      activeCount: active.length,
      avgOnTime: avgOnTime.toFixed(1),
      avgClaims: avgClaims.toFixed(1),
      qbrsDue
    };
  }, [filteredCarriers]);

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const getPerformanceBadgeColor = (value, type) => {
    if (type === 'onTime') {
      if (value > 95) return 'bg-green-100 text-green-700 border-green-200';
      if (value >= 90) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      return 'bg-red-100 text-red-700 border-red-200';
    } else {
      if (value < 1) return 'bg-green-100 text-green-700 border-green-200';
      if (value <= 2) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      return 'bg-red-100 text-red-700 border-red-200';
    }
  };

  const getQbrBadge = (date) => {
    if (!date) return null;
    const today = new Date();
    const daysUntil = differenceInDays(new Date(date), today);

    if (daysUntil < 0) {
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">Overdue</Badge>;
    } else if (daysUntil <= 30) {
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs">Due Soon</Badge>;
    } else {
      return <span className="text-sm text-slate-600">{format(new Date(date), 'MMM d, yyyy')}</span>;
    }
  };

  const handleRowClick = (carrierId) => {
    navigate(createPageUrl(`CarrierDetail?id=${carrierId}`));
  };

  return (
    <div className="p-6 lg:p-8 max-w-full mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Carriers</h1>
          <p className="text-slate-600 mt-1">
            Active {summaryStats.activeCount} • Avg On-Time {summaryStats.avgOnTime}% • Avg Claims {summaryStats.avgClaims}% • QBRs Due {summaryStats.qbrsDue}
          </p>
        </div>
        <Button
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => navigate(createPageUrl("CarrierDetail?new=true"))}
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          New Carrier
        </Button>
      </div>

      <div className="mb-4 flex items-center gap-2 flex-wrap">
        <span className="text-sm text-slate-600 font-medium">Filters:</span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant={serviceTypeFilter !== 'all' ? 'default' : 'outline'} size="sm" className="h-8">
              <Filter className="w-3.5 h-3.5 mr-1" />
              Service Type: {serviceTypeFilter === 'all' ? 'All' : serviceTypeFilter.replace('_', ' ')}
              {serviceTypeFilter !== 'all' && <X className="w-3 h-3 ml-1" onClick={(e) => { e.stopPropagation(); setServiceTypeFilter('all'); }} />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setServiceTypeFilter('all')}>All Types</DropdownMenuItem>
            <DropdownMenuSeparator />
            {uniqueServiceTypes.map(type => (
              <DropdownMenuItem key={type} onClick={() => setServiceTypeFilter(type)} className="capitalize">
                {type.replace('_', ' ')}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant={ownerFilter !== 'all' ? 'default' : 'outline'} size="sm" className="h-8">
              <Filter className="w-3.5 h-3.5 mr-1" />
              Owner: {ownerFilter === 'all' ? 'All' : ownerFilter}
              {ownerFilter !== 'all' && <X className="w-3 h-3 ml-1" onClick={(e) => { e.stopPropagation(); setOwnerFilter('all'); }} />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setOwnerFilter('all')}>All Owners</DropdownMenuItem>
            <DropdownMenuSeparator />
            {uniqueOwners.map(owner => (
              <DropdownMenuItem key={owner} onClick={() => setOwnerFilter(owner)}>
                {owner}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8">
              <ArrowUpDown className="w-3.5 h-3.5 mr-1" />
              Sort: {sortColumn === 'on_time' ? 'On-Time %' : sortColumn === 'claims' ? 'Claims %' : 'Invoice Var %'} {sortDirection === 'desc' ? '↓' : '↑'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => { setSortColumn('on_time'); setSortDirection('desc'); }}>
              On-Time % ↓
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setSortColumn('claims'); setSortDirection('asc'); }}>
              Claims % ↑
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setSortColumn('invoice_variance'); setSortDirection('asc'); }}>
              Invoice Variance % ↑
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="bg-white/80 backdrop-blur rounded-2xl shadow-lg border-t border-slate-100">
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center">
            <Search className="h-4 w-4 text-slate-500 mr-2" />
            <Input
              placeholder="Search carriers by name or SCAC..."
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
                <TableHead className="w-8"></TableHead>
                <TableHead>Carrier</TableHead>
                <TableHead>Service Type</TableHead>
                <TableHead>Active Tariffs</TableHead>
                <TableHead>Next QBR</TableHead>
                <TableHead>
                  <button
                    onClick={() => handleSort('on_time')}
                    className="flex items-center gap-1 hover:text-slate-900 transition-colors"
                  >
                    On-Time %
                    {sortColumn === 'on_time' && (
                      <ArrowUpDown className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                    )}
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    onClick={() => handleSort('claims')}
                    className="flex items-center gap-1 hover:text-slate-900 transition-colors"
                  >
                    Claims %
                    {sortColumn === 'claims' && (
                      <ArrowUpDown className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                    )}
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    onClick={() => handleSort('invoice_variance')}
                    className="flex items-center gap-1 hover:text-slate-900 transition-colors"
                  >
                    Invoice Var %
                    {sortColumn === 'invoice_variance' && (
                      <ArrowUpDown className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                    )}
                  </button>
                </TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? Array(8).fill(0).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={12}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
              )) : filteredCarriers.map(carrier => {
                const serviceTypeColors = {
                  'asset': 'bg-blue-100 text-blue-700 border-blue-200',
                  'brokerage': 'bg-purple-100 text-purple-700 border-purple-200',
                  'ltl': 'bg-green-100 text-green-700 border-green-200',
                  'home_delivery_ltl': 'bg-orange-100 text-orange-700 border-orange-200'
                };

                return (
                  <TableRow
                    key={carrier.id}
                    onClick={() => handleRowClick(carrier.id)}
                    className={`cursor-pointer hover:bg-slate-50 ${userPins.has(carrier.id) ? 'bg-blue-50/30' : ''}`}
                    onMouseEnter={() => setHoveredRowId(carrier.id)}
                    onMouseLeave={() => setHoveredRowId(null)}
                  >
                    <TableCell className="p-4" onClick={e => e.stopPropagation()}><Checkbox /></TableCell>
                    <TableCell className="p-4" onClick={e => e.stopPropagation()}>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePin(carrier.id);
                              }}
                              className="text-slate-400 hover:text-blue-600 transition-colors"
                            >
                              <Star className={`w-4 h-4 ${userPins.has(carrier.id) ? 'fill-blue-600 text-blue-600' : ''}`} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {userPins.has(carrier.id) ? 'Unpin carrier' : 'Pin carrier to top'}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium text-slate-900">{carrier.name}</div>
                        {carrier.service_type && (
                          <div className="text-xs text-slate-500 mt-0.5">{carrier.service_type}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {carrier.carrier_type ? (
                        <Badge variant="outline" className={`${serviceTypeColors[carrier.carrier_type] || 'bg-slate-100 text-slate-700'} font-medium capitalize`}>
                          {carrier.carrier_type.replace('_', ' ')}
                        </Badge>
                      ) : (
                        <span className="text-slate-400">N/A</span>
                      )}
                    </TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      {carrier.activeTariffsCount > 0 ? (
                        <button
                          onClick={() => navigate(createPageUrl(`Tariffs?carrier=${carrier.id}`))}
                          className="cursor-pointer underline decoration-dotted underline-offset-4 text-blue-600 hover:text-blue-800"
                        >
                          {carrier.activeTariffsCount}
                        </button>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {carrier.next_qbr_date ? (
                        getQbrBadge(carrier.next_qbr_date)
                      ) : (
                        <span className="text-slate-400">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="outline" className={`${getPerformanceBadgeColor(carrier.on_time_pct || 0, 'onTime')} font-medium cursor-help`}>
                              {(carrier.on_time_pct || 0).toFixed(1)}%
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Data sourced from carrier performance feed</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="outline" className={`${getPerformanceBadgeColor(carrier.claims_pct || 0, 'claims')} font-medium cursor-help`}>
                              {(carrier.claims_pct || 0).toFixed(1)}%
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Data sourced from carrier performance feed</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="outline" className={`${getPerformanceBadgeColor(carrier.invoice_variance_pct || 0, 'claims')} font-medium cursor-help`}>
                              {(carrier.invoice_variance_pct || 0).toFixed(1)}%
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Data sourced from carrier performance feed</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-700">{carrier.account_owner || 'N/A'}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-600">
                        {carrier.updated_date ? format(new Date(carrier.updated_date), 'MMM d, yyyy') : 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRowClick(carrier.id)}
                        className={`transition-opacity ${hoveredRowId === carrier.id ? 'opacity-100' : 'opacity-0'}`}
                      >
                        View <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
