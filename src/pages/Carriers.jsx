import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Carrier, Tariff } from "../api/entities";
import { createPageUrl } from "../utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { PlusCircle, Search, ArrowRight, Filter, X, ArrowUpDown, Star, Trash2 } from "lucide-react";
import { Skeleton } from "../components/ui/skeleton";
import { format, differenceInDays } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "../components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../components/ui/alert-dialog";
import { supabase } from "../api/supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export default function CarriersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [sortColumn, setSortColumn] = useState('active_tariffs');
  const [sortDirection, setSortDirection] = useState('desc');

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };
  const [userPins, setUserPins] = useState(new Set());
  const [hoveredRowId, setHoveredRowId] = useState(null);
  const [carrierToDelete, setCarrierToDelete] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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
    const today = new Date();
    return carriers.map(carrier => {
      const carrierTariffs = tariffs.filter(t =>
        t.carrier_id === carrier.id || (t.carrier_ids && t.carrier_ids.includes(carrier.id))
      );
      const activeTariffs = carrierTariffs.filter(t => {
        const expiryDate = t.expiry_date ? new Date(t.expiry_date) : null;
        return t.status === 'active' && (!expiryDate || expiryDate > today);
      });
      const expiringTariffs = carrierTariffs.filter(t => {
        const expiryDate = t.expiry_date ? new Date(t.expiry_date) : null;
        const daysUntilExpiry = expiryDate ? differenceInDays(expiryDate, today) : null;
        return t.status === 'active' && daysUntilExpiry !== null && daysUntilExpiry <= 90 && daysUntilExpiry > 0;
      });

      return {
        ...carrier,
        activeTariffsCount: activeTariffs.length,
        expiringTariffsCount: expiringTariffs.length
      };
    });
  }, [carriers, tariffs]);

  const handleDeleteClick = (carrier) => {
    setCarrierToDelete(carrier);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!carrierToDelete) return;

    try {
      await Carrier.delete(carrierToDelete.id);
      toast.success('Carrier deleted successfully');
      queryClient.invalidateQueries(['carriers']);
      setShowDeleteDialog(false);
      setCarrierToDelete(null);
    } catch (error) {
      toast.error(error.message || 'Failed to delete carrier');
    }
  };

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

    if (ownerFilter !== 'all') {
      filtered = filtered.filter(c => c.account_owner === ownerFilter);
    }

    filtered = [...filtered].sort((a, b) => {
      if (sortColumn === 'active_tariffs') {
        const valueA = a.activeTariffsCount || 0;
        const valueB = b.activeTariffsCount || 0;
        if (sortDirection === 'asc') {
          return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
        } else {
          return valueA < valueB ? 1 : valueA > valueB ? -1 : 0;
        }
      } else if (sortColumn === 'last_updated') {
        const dateA = a.updated_date ? new Date(a.updated_date).getTime() : 0;
        const dateB = b.updated_date ? new Date(b.updated_date).getTime() : 0;
        if (sortDirection === 'asc') {
          return dateA > dateB ? 1 : dateA < dateB ? -1 : 0;
        } else {
          return dateA < dateB ? 1 : dateA > dateB ? -1 : 0;
        }
      } else if (sortColumn === 'name') {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        if (sortDirection === 'asc') {
          return nameA.localeCompare(nameB);
        } else {
          return nameB.localeCompare(nameA);
        }
      }
      return 0;
    });

    const pinned = filtered.filter(c => userPins.has(c.id));
    const unpinned = filtered.filter(c => !userPins.has(c.id));

    return [...pinned, ...unpinned];
  }, [carrierData, searchTerm, userPins, ownerFilter, sortColumn, sortDirection]);

  const summaryStats = useMemo(() => {
    const active = filteredCarriers.filter(c => c.status === 'active');
    return {
      activeCount: active.length,
      totalCount: filteredCarriers.length
    };
  }, [filteredCarriers]);

  const handleRowClick = (carrierId) => {
    navigate(createPageUrl(`CarrierDetail?id=${carrierId}`));
  };

  return (
    <div className="p-6 lg:p-8 max-w-full mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Carriers</h1>
          <p className="text-slate-600 mt-1">
            {summaryStats.totalCount} carriers • {summaryStats.activeCount} active
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
              Sort: {sortColumn === 'active_tariffs' ? 'Active Tariffs' : sortColumn === 'last_updated' ? 'Last Updated' : 'Carrier A-Z'} {sortDirection === 'desc' ? '↓' : '↑'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => { setSortColumn('active_tariffs'); setSortDirection('desc'); }}>
              Active Tariffs ↓
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setSortColumn('last_updated'); setSortDirection('desc'); }}>
              Last Updated ↓
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setSortColumn('name'); setSortDirection('asc'); }}>
              Carrier A–Z
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
                <TableHead className="w-8"></TableHead>
                <TableHead>
                  <button
                    onClick={() => handleSort('name')}
                    className="flex items-center gap-1 hover:text-slate-900 transition-colors"
                  >
                    Carrier
                    {sortColumn === 'name' && (
                      <ArrowUpDown className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                    )}
                  </button>
                </TableHead>
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
                <TableHead>Coverage</TableHead>
                <TableHead>
                  <button
                    onClick={() => handleSort('last_updated')}
                    className="flex items-center gap-1 hover:text-slate-900 transition-colors"
                  >
                    Last Updated
                    {sortColumn === 'last_updated' && (
                      <ArrowUpDown className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                    )}
                  </button>
                </TableHead>
                <TableHead>Owner</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? Array(8).fill(0).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
              )) : filteredCarriers.map(carrier => {
                const coverageLabels = {
                  'national': 'National',
                  'regional': 'Regional',
                  'ocean': 'Ocean',
                  'international': 'International',
                  'local': 'Local'
                };

                return (
                  <TableRow
                    key={carrier.id}
                    onClick={() => handleRowClick(carrier.id)}
                    className={`cursor-pointer hover:bg-slate-50 ${userPins.has(carrier.id) ? 'bg-blue-50/30' : ''}`}
                    onMouseEnter={() => setHoveredRowId(carrier.id)}
                    onMouseLeave={() => setHoveredRowId(null)}
                  >
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
                          <div className="text-xs text-slate-500 mt-0.5 capitalize">{carrier.service_type}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        {carrier.activeTariffsCount > 0 ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 font-medium">
                            {carrier.activeTariffsCount} Active
                          </Badge>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                        {carrier.expiringTariffsCount > 0 && (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 font-medium">
                            {carrier.expiringTariffsCount} Expiring
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {carrier.coverage_type ? (
                        <span className="text-sm text-slate-700 capitalize">
                          {coverageLabels[carrier.coverage_type] || carrier.coverage_type}
                        </span>
                      ) : (
                        <span className="text-slate-400">N/A</span>
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
                      <div className={`flex items-center gap-1 transition-opacity ${hoveredRowId === carrier.id ? 'opacity-100' : 'opacity-0'}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRowClick(carrier.id)}
                        >
                          View <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteClick(carrier);
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete Carrier</TooltipContent>
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

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Carrier</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{carrierToDelete?.name}"? This action cannot be undone and will remove all associated data including tariffs and relationships.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete Carrier
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
