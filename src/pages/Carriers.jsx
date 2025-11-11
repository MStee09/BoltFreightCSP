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
import { format } from "date-fns";
import { Checkbox } from "../components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "../components/ui/dropdown-menu";
import { supabase } from "../api/supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";

export default function CarriersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");
  const [ownershipTypeFilter, setOwnershipTypeFilter] = useState([]);
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [sortColumn, setSortColumn] = useState('active_tariffs');
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

      const ownershipType = tariffs.find(t =>
        (t.carrier_id === carrier.id || (t.carrier_ids && t.carrier_ids.includes(carrier.id))) &&
        t.ownership_type
      )?.ownership_type || null;

      return {
        ...carrier,
        activeTariffsCount,
        ownershipType
      };
    });
  }, [carriers, tariffs]);

  const uniqueOwnershipTypes = useMemo(() => {
    const types = new Set();
    carrierData.forEach(c => {
      if (c.ownershipType) types.add(c.ownershipType);
    });
    return Array.from(types);
  }, [carrierData]);

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

    if (ownershipTypeFilter.length > 0) {
      filtered = filtered.filter(c => c.ownershipType && ownershipTypeFilter.includes(c.ownershipType));
    }

    if (ownerFilter !== 'all') {
      filtered = filtered.filter(c => c.account_owner === ownerFilter);
    }

    if (sortColumn === 'active_tariffs') {
      filtered = [...filtered].sort((a, b) => {
        const valueA = a.activeTariffsCount || 0;
        const valueB = b.activeTariffsCount || 0;

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
  }, [carrierData, searchTerm, userPins, ownershipTypeFilter, ownerFilter, sortColumn, sortDirection]);

  const summaryStats = useMemo(() => {
    const active = filteredCarriers.filter(c => c.status === 'active');
    const blanket = carrierData.filter(c => c.ownershipType === 'rocket_blanket').length;
    const customerDirect = carrierData.filter(c => c.ownershipType === 'customer_direct').length;

    return {
      activeCount: active.length,
      blanket,
      customerDirect
    };
  }, [filteredCarriers, carrierData]);

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const toggleOwnershipType = (type) => {
    setOwnershipTypeFilter(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleRowClick = (carrierId) => {
    navigate(createPageUrl(`CarrierDetail?id=${carrierId}`));
  };

  const ownershipTypeLabels = {
    'rocket_blanket': 'Rocket Blanket',
    'rocket_csp': 'Rocket CSP',
    'customer_blanket': 'Customer Blanket',
    'customer_direct': 'Customer Direct'
  };

  const ownershipTypeColors = {
    'rocket_blanket': 'bg-blue-100 text-blue-700 border-blue-200',
    'rocket_csp': 'bg-purple-100 text-purple-700 border-purple-200',
    'customer_blanket': 'bg-green-100 text-green-700 border-green-200',
    'customer_direct': 'bg-orange-100 text-orange-700 border-orange-200'
  };

  return (
    <div className="p-6 lg:p-8 max-w-full mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Carriers</h1>
          <p className="text-slate-600 mt-1">
            Active {summaryStats.activeCount} • Blanket {summaryStats.blanket} • Customer Direct {summaryStats.customerDirect}
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
            <Button variant={ownershipTypeFilter.length > 0 ? 'default' : 'outline'} size="sm" className="h-8">
              <Filter className="w-3.5 h-3.5 mr-1" />
              Ownership: {ownershipTypeFilter.length === 0 ? 'All' : `${ownershipTypeFilter.length} selected`}
              {ownershipTypeFilter.length > 0 && (
                <X className="w-3 h-3 ml-1" onClick={(e) => { e.stopPropagation(); setOwnershipTypeFilter([]); }} />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <div className="p-2 space-y-2">
              {uniqueOwnershipTypes.map(type => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    id={`ownership-${type}`}
                    checked={ownershipTypeFilter.includes(type)}
                    onCheckedChange={() => toggleOwnershipType(type)}
                  />
                  <label htmlFor={`ownership-${type}`} className="text-sm cursor-pointer">
                    {ownershipTypeLabels[type] || type}
                  </label>
                </div>
              ))}
            </div>
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
              Sort: Active Tariffs {sortDirection === 'desc' ? '↓' : '↑'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => { setSortColumn('active_tariffs'); setSortDirection('desc'); }}>
              Active Tariffs ↓
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setSortColumn('active_tariffs'); setSortDirection('asc'); }}>
              Active Tariffs ↑
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
                <TableHead>Ownership Type</TableHead>
                <TableHead>
                  <button
                    onClick={() => handleSort('active_tariffs')}
                    className="flex items-center gap-1 hover:text-slate-900 transition-colors"
                  >
                    Active Tariffs
                    {sortColumn === 'active_tariffs' && (
                      <ArrowUpDown className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                    )}
                  </button>
                </TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? Array(8).fill(0).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
              )) : filteredCarriers.map(carrier => {
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
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          {carrier.logo_url && <AvatarImage src={carrier.logo_url} alt={carrier.name} />}
                          <AvatarFallback className="bg-slate-100 text-slate-700 text-xs font-semibold">
                            {getInitials(carrier.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-slate-900">{carrier.name}</div>
                          {carrier.service_type && (
                            <div className="text-xs text-slate-500 mt-0.5">{carrier.service_type}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {carrier.ownershipType ? (
                        <Badge variant="outline" className={`${ownershipTypeColors[carrier.ownershipType] || 'bg-slate-100 text-slate-700'} font-medium`}>
                          {ownershipTypeLabels[carrier.ownershipType] || carrier.ownershipType}
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
                      <span className="text-sm text-slate-600">
                        {carrier.updated_date ? format(new Date(carrier.updated_date), 'MMM d, yyyy') : 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-700">{carrier.account_owner || 'N/A'}</span>
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
