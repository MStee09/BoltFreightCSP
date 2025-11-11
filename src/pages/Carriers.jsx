import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Carrier } from "../api/entities";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "../utils";
import { supabase } from "../api/supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/ui/tooltip";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "../components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Checkbox } from "../components/ui/checkbox";
import { Label } from "../components/ui/label";
import { Skeleton } from "../components/ui/skeleton";
import {
  PlusCircle,
  Search,
  Eye,
  FileText,
  TrendingUp,
  Star,
  SlidersHorizontal,
  Calendar as CalendarIcon
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { toast } from "sonner";
import CarrierPerformanceDrawer from "../components/carriers/CarrierPerformanceDrawer";
import QbrScheduleDialog from "../components/carriers/QbrScheduleDialog";

export default function CarriersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCarrierTypes, setSelectedCarrierTypes] = useState([]);
  const [selectedOwner, setSelectedOwner] = useState("all");
  const [sortBy, setSortBy] = useState("on_time_desc");
  const [hoveredCarrierId, setHoveredCarrierId] = useState(null);
  const [performanceDrawerCarrier, setPerformanceDrawerCarrier] = useState(null);
  const [qbrDialogCarrier, setQbrDialogCarrier] = useState(null);
  const [isScrolled, setIsScrolled] = useState(false);

  const { data: carriers = [], isLoading } = useQuery({
    queryKey: ["carriers"],
    queryFn: () => Carrier.list("-created_date"),
    initialData: [],
  });

  const { data: userPins = [] } = useQuery({
    queryKey: ['user_pins', user?.id],
    queryFn: async () => {
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

  const togglePinMutation = useMutation({
    mutationFn: async ({ carrierId, isPinned }) => {
      if (isPinned) {
        const pin = userPins.find(p => p.ref_id === carrierId);
        if (pin) {
          const { error } = await supabase
            .from('user_pins')
            .delete()
            .eq('id', pin.id);
          if (error) throw error;
        }
      } else {
        const { error } = await supabase
          .from('user_pins')
          .insert({
            user_id: user.id,
            pin_type: 'carrier',
            ref_id: carrierId
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['user_pins']);
      toast.success('Pin updated');
    },
    onError: () => {
      toast.error('Failed to update pin');
    }
  });

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 200);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const uniqueCarrierTypes = useMemo(() => {
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
    return ['all', ...Array.from(owners)];
  }, [carriers]);

  const processedCarriers = useMemo(() => {
    let filtered = carriers.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.scac_code?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = selectedCarrierTypes.length === 0 ||
                         (c.carrier_type && selectedCarrierTypes.includes(c.carrier_type));

      const matchesOwner = selectedOwner === 'all' || c.account_owner === selectedOwner;

      return matchesSearch && matchesType && matchesOwner;
    });

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'on_time_desc':
          return (b.on_time_pct || 0) - (a.on_time_pct || 0);
        case 'claims_asc':
          return (a.claims_pct || 0) - (b.claims_pct || 0);
        case 'invoice_variance_asc':
          return (a.invoice_variance_pct || 0) - (b.invoice_variance_pct || 0);
        default:
          return 0;
      }
    });

    const pinned = filtered.filter(c => userPins.some(p => p.ref_id === c.id));
    const unpinned = filtered.filter(c => !userPins.some(p => p.ref_id === c.id));

    return [...pinned, ...unpinned];
  }, [carriers, searchTerm, selectedCarrierTypes, selectedOwner, sortBy, userPins]);

  const summaryStats = useMemo(() => {
    const active = processedCarriers.filter(c => c.status === 'active');
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
  }, [processedCarriers]);

  const getPerformanceBadge = (value, type) => {
    if (type === 'onTime') {
      if (value > 95) return 'bg-green-100 text-green-800 border-green-200';
      if (value >= 90) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      return 'bg-red-100 text-red-800 border-red-200';
    } else {
      if (value < 1) return 'bg-green-100 text-green-800 border-green-200';
      if (value <= 2) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  const getQbrBadge = (date) => {
    if (!date) return null;
    const today = new Date();
    const daysUntil = differenceInDays(new Date(date), today);

    if (daysUntil < 0) {
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Overdue</Badge>;
    } else if (daysUntil <= 30) {
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Due Soon</Badge>;
    } else {
      return <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">{format(new Date(date), 'MMM d')}</Badge>;
    }
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleTogglePin = (e, carrierId) => {
    e.stopPropagation();
    const isPinned = userPins.some(p => p.ref_id === carrierId);
    togglePinMutation.mutate({ carrierId, isPinned });
  };

  const handleToggleCarrierType = (type) => {
    setSelectedCarrierTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const clearFilters = () => {
    setSelectedCarrierTypes([]);
    setSelectedOwner('all');
    setSortBy('on_time_desc');
  };

  const FilterSheet = () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="lg:hidden">
          <SlidersHorizontal className="w-4 h-4 mr-2" />
          Filters
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          <div>
            <Label className="text-sm font-semibold mb-3 block">Service Type</Label>
            <div className="space-y-2">
              {uniqueCarrierTypes.map(type => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    id={`mobile-${type}`}
                    checked={selectedCarrierTypes.includes(type)}
                    onCheckedChange={() => handleToggleCarrierType(type)}
                  />
                  <label htmlFor={`mobile-${type}`} className="text-sm capitalize cursor-pointer">
                    {type.replace('_', ' ')}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-sm font-semibold mb-3 block">Owner</Label>
            <Select value={selectedOwner} onValueChange={setSelectedOwner}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {uniqueOwners.map(owner => (
                  <SelectItem key={owner} value={owner} className="capitalize">
                    {owner === 'all' ? 'All Owners' : owner}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-semibold mb-3 block">Sort By</Label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="on_time_desc">On-Time % ↓</SelectItem>
                <SelectItem value="claims_asc">Claims % ↑</SelectItem>
                <SelectItem value="invoice_variance_asc">Invoice Variance % ↑</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline" className="w-full" onClick={clearFilters}>
            Clear Filters
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
      {isScrolled && (
        <div className="fixed top-0 left-0 right-0 z-40 bg-white border-b shadow-sm py-3 px-6 lg:px-8">
          <div className="max-w-[1600px] mx-auto flex items-center justify-between text-sm">
            <div className="flex items-center gap-6">
              <span className="font-semibold">Carriers</span>
              <div className="flex items-center gap-4 text-slate-600">
                <span>Active <strong>{summaryStats.activeCount}</strong></span>
                <span className="text-slate-300">•</span>
                <span>Avg On-Time <strong>{summaryStats.avgOnTime}%</strong></span>
                <span className="text-slate-300">•</span>
                <span>Avg Claims <strong>{summaryStats.avgClaims}%</strong></span>
                <span className="text-slate-300">•</span>
                <span>QBRs Due <strong>{summaryStats.qbrsDue}</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Carriers</h1>
          <p className="text-slate-600 mt-1">Manage your carrier partners and performance.</p>
        </div>
        <Button asChild className="bg-blue-600 hover:bg-blue-700">
          <Link to={createPageUrl("CarrierDetail?new=true")}>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Carrier
          </Link>
        </Button>
      </div>

      <div className="mb-6 flex flex-col lg:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search carriers by name or SCAC..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="hidden lg:flex items-center gap-3">
          <div className="flex items-center gap-2 border rounded-lg px-3 py-2">
            <span className="text-sm text-slate-600 whitespace-nowrap">Service Type:</span>
            {uniqueCarrierTypes.length === 0 ? (
              <span className="text-sm text-slate-400">None</span>
            ) : (
              uniqueCarrierTypes.map(type => (
                <label key={type} className="flex items-center gap-1.5 cursor-pointer">
                  <Checkbox
                    checked={selectedCarrierTypes.includes(type)}
                    onCheckedChange={() => handleToggleCarrierType(type)}
                  />
                  <span className="text-sm capitalize">{type.replace('_', ' ')}</span>
                </label>
              ))
            )}
          </div>

          <Select value={selectedOwner} onValueChange={setSelectedOwner}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Owner" />
            </SelectTrigger>
            <SelectContent>
              {uniqueOwners.map(owner => (
                <SelectItem key={owner} value={owner} className="capitalize">
                  {owner === 'all' ? 'All Owners' : owner}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="on_time_desc">On-Time % ↓</SelectItem>
              <SelectItem value="claims_asc">Claims % ↑</SelectItem>
              <SelectItem value="invoice_variance_asc">Invoice Variance % ↑</SelectItem>
            </SelectContent>
          </Select>

          {(selectedCarrierTypes.length > 0 || selectedOwner !== 'all' || sortBy !== 'on_time_desc') && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear
            </Button>
          )}
        </div>

        <FilterSheet />
      </div>

      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
        <CardContent className="p-0">
          <div className="space-y-1">
            {isLoading ? (
              Array(5).fill(0).map((_, i) => (
                <div key={i} className="p-5 border-b last:border-b-0">
                  <Skeleton className="h-20 w-full" />
                </div>
              ))
            ) : processedCarriers.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                No carriers found. Try adjusting your filters.
              </div>
            ) : (
              processedCarriers.map(carrier => {
                const isPinned = userPins.some(p => p.ref_id === carrier.id);
                const isHovered = hoveredCarrierId === carrier.id;

                return (
                  <div
                    key={carrier.id}
                    className="relative min-h-[100px] p-5 border-b last:border-b-0 hover:bg-slate-50 transition-colors"
                    onMouseEnter={() => setHoveredCarrierId(carrier.id)}
                    onMouseLeave={() => setHoveredCarrierId(null)}
                  >
                    <div className="flex items-start gap-4">
                      <button
                        onClick={(e) => handleTogglePin(e, carrier.id)}
                        className="mt-1"
                      >
                        <Star
                          className={`w-5 h-5 transition-colors ${
                            isPinned
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-slate-300 hover:text-yellow-400'
                          }`}
                        />
                      </button>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Avatar className="h-12 w-12 cursor-pointer">
                              {carrier.logo_url && <AvatarImage src={carrier.logo_url} alt={carrier.name} />}
                              <AvatarFallback className="bg-slate-100 text-slate-700 font-semibold">
                                {getInitials(carrier.name)}
                              </AvatarFallback>
                            </Avatar>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-xs">
                              <p>Owner: {carrier.account_owner || 'N/A'}</p>
                              <p>Last Updated: {carrier.updated_date ? format(new Date(carrier.updated_date), 'MMM d, yyyy') : 'N/A'}</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <div className="flex-1 min-w-0 pr-32">
                        <h3 className="text-lg font-bold text-slate-900 mb-1">
                          {carrier.name}
                        </h3>

                        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                          {carrier.carrier_type && (
                            <span className="capitalize">{carrier.carrier_type.replace('_', ' ')}</span>
                          )}
                          {carrier.account_owner && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span>{carrier.account_owner}</span>
                            </>
                          )}
                          {carrier.next_qbr_date && (
                            <>
                              <span className="text-slate-300">•</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setQbrDialogCarrier(carrier);
                                }}
                                className="flex items-center gap-1 hover:text-slate-900"
                              >
                                <CalendarIcon className="w-3.5 h-3.5" />
                                <span>QBR:</span>
                                {getQbrBadge(carrier.next_qbr_date)}
                              </button>
                            </>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 mt-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs text-slate-600">On-Time:</span>
                                  <Badge className={getPerformanceBadge(carrier.on_time_pct || 0, 'onTime')}>
                                    {(carrier.on_time_pct || 0).toFixed(1)}%
                                  </Badge>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>Data sourced from carrier performance feed</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs text-slate-600">Claims:</span>
                                  <Badge className={getPerformanceBadge(carrier.claims_pct || 0, 'claims')}>
                                    {(carrier.claims_pct || 0).toFixed(1)}%
                                  </Badge>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>Data sourced from carrier performance feed</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs text-slate-600">Invoice Var:</span>
                                  <Badge className={getPerformanceBadge(carrier.invoice_variance_pct || 0, 'claims')}>
                                    {(carrier.invoice_variance_pct || 0).toFixed(1)}%
                                  </Badge>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>Data sourced from carrier performance feed</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>

                      <div className={`absolute right-5 top-5 flex items-center gap-1 bg-white rounded-md shadow-sm border p-1 transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(createPageUrl(`CarrierDetail?id=${carrier.id}`));
                                }}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View Profile</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(createPageUrl(`Tariffs?carrier=${carrier.id}`));
                                }}
                              >
                                <FileText className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Tariffs Linked</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPerformanceDrawerCarrier(carrier);
                                }}
                              >
                                <TrendingUp className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Performance Report</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      <CarrierPerformanceDrawer
        carrier={performanceDrawerCarrier}
        open={!!performanceDrawerCarrier}
        onOpenChange={(open) => !open && setPerformanceDrawerCarrier(null)}
      />

      <QbrScheduleDialog
        carrier={qbrDialogCarrier}
        open={!!qbrDialogCarrier}
        onOpenChange={(open) => !open && setQbrDialogCarrier(null)}
      />
    </div>
  );
}
