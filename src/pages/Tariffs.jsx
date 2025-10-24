import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Customer, Carrier, Tariff, CSPEvent } from "../api/entities";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/ui/tooltip";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { PlusCircle, Search, Upload, ChevronDown, ChevronRight, AlertCircle, Eye, GitCompare, Download, FileText, Plus, Calendar, Link2, UploadCloud, RefreshCw, FileCheck, ArrowUpDown, Briefcase, FolderOpen, TrendingUp, Clock, X, Pin, User, Truck, Package } from "lucide-react";
import { format, isAfter, isBefore, differenceInDays } from "date-fns";
import { Skeleton } from "../components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { IfHasPermission } from "../components/auth/PermissionGuard";
import { useUserRole } from "../hooks/useUserRole";

const OWNERSHIP_TYPES = [
  { value: 'rocket_csp', label: 'Rocket CSP', color: 'bg-purple-50 border-l-4 border-l-purple-500' },
  { value: 'customer_direct', label: 'Customer Direct', color: 'bg-blue-50 border-l-4 border-l-blue-500' },
  { value: 'rocket_blanket', label: 'Rocket Blanket', color: 'bg-orange-50 border-l-4 border-l-orange-500' },
  { value: 'priority1_blanket', label: 'Priority 1 Blanket', color: 'bg-green-50 border-l-4 border-l-green-500' }
];

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'proposed', label: 'Proposed' },
  { value: 'expiring', label: 'Expiring < 90d' },
  { value: 'expired', label: 'Expired' },
  { value: 'superseded', label: 'Superseded' }
];

const MODE_FILTERS = [
  { value: 'all', label: 'All Modes' },
  { value: 'LTL', label: 'LTL' },
  { value: 'Home Delivery', label: 'Home Delivery' },
  { value: 'Truckload', label: 'Truckload' },
  { value: 'Parcel', label: 'Parcel' }
];

const SORT_OPTIONS = [
  { value: 'expiry_date', label: 'Expiry Date' },
  { value: 'days_left', label: 'Days Left' },
  { value: 'customer_name', label: 'Customer Name' },
  { value: 'carrier_name', label: 'Carrier Name' }
];

export default function TariffsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [ownershipTab, setOwnershipTab] = useState("rocket_csp");
  const [filtersByTab, setFiltersByTab] = useState({
    rocket_csp: 'all',
    customer_direct: 'all',
    rocket_blanket: 'all',
    priority1_blanket: 'all'
  });
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [expandedCarriers, setExpandedCarriers] = useState(new Set());
  const [showHistory, setShowHistory] = useState(false);
  const [expandedFamilyHistory, setExpandedFamilyHistory] = useState(new Set());
  const [collapsedFamilies, setCollapsedFamilies] = useState(new Set());
  const [modeFilter, setModeFilter] = useState('all');
  const [showMyAccountsOnly, setShowMyAccountsOnly] = useState(false);
  const [pinnedCustomers, setPinnedCustomers] = useState(new Set());
  const [sortBy, setSortBy] = useState('expiry_date');
  const [showArchived, setShowArchived] = useState(false);
  const [hoveredRowId, setHoveredRowId] = useState(null);
  const [sortColumn, setSortColumn] = useState('expiry_date');
  const [sortDirection, setSortDirection] = useState('asc');

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const statusFilter = filtersByTab[ownershipTab];

  const handleTabChange = (newTab) => {
    setOwnershipTab(newTab);
  };

  const handleStatusFilterChange = (newFilter) => {
    setFiltersByTab(prev => ({
      ...prev,
      [ownershipTab]: newFilter
    }));
  };

  const { data: tariffs = [], isLoading: isTariffsLoading } = useQuery({
    queryKey: ["tariffs"],
    queryFn: () => Tariff.list("-effective_date"),
    initialData: [],
  });

  const { data: customers = [], isLoading: isCustomersLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: () => Customer.list(),
    initialData: [],
  });

  const { data: carriers = [], isLoading: isCarriersLoading } = useQuery({
    queryKey: ["carriers"],
    queryFn: () => Carrier.list(),
    initialData: [],
  });

  const { data: cspEvents = [], isLoading: isCspEventsLoading } = useQuery({
    queryKey: ["csp_events"],
    queryFn: () => CSPEvent.list(),
    initialData: [],
  });

  const isLoading = isTariffsLoading || isCustomersLoading || isCarriersLoading || isCspEventsLoading;

  const getStatusBadge = (tariff) => {
    const today = new Date();
    const expiryDate = tariff.expiry_date ? new Date(tariff.expiry_date) : null;
    const daysUntilExpiry = expiryDate ? differenceInDays(expiryDate, today) : null;

    if (tariff.status === 'expired' || (expiryDate && isBefore(expiryDate, today))) {
      return <Badge variant="secondary" className="bg-slate-100 text-slate-600">Expired</Badge>;
    }
    if (tariff.status === 'superseded') {
      return <Badge variant="outline" className="text-slate-500">Superseded</Badge>;
    }
    if (tariff.status === 'proposed') {
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Proposed</Badge>;
    }
    if (daysUntilExpiry !== null && daysUntilExpiry <= 90 && daysUntilExpiry > 0) {
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Expiring ({daysUntilExpiry}d)</Badge>;
    }
    return <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>;
  };

  const getOwnershipColor = (ownershipType) => {
    const type = OWNERSHIP_TYPES.find(t => t.value === ownershipType);
    return type?.color || 'bg-slate-50 border-l-4 border-l-slate-300';
  };

  const getOwnershipBorderColor = (ownershipType) => {
    const colorMap = {
      'rocket_csp': 'border-l-purple-400',
      'customer_direct': 'border-l-blue-400',
      'rocket_blanket': 'border-l-orange-400',
      'priority1_blanket': 'border-l-green-400'
    };
    return colorMap[ownershipType] || 'border-l-slate-300';
  };

  const filteredTariffs = useMemo(() => {
    return tariffs.filter(t => {
      if (t.ownership_type !== ownershipTab) return false;

      const customer = customers.find(c => c.id === t.customer_id);

      if (showMyAccountsOnly && customer?.account_owner !== 'Current User') return false;

      if (modeFilter !== 'all' && t.mode !== modeFilter) return false;

      const searchCarriers = (t.carrier_ids || []).map(cid => carriers.find(c => c.id === cid)?.name).join(' ').toLowerCase() || '';
      const cspEvent = cspEvents.find(e => e.id === t.csp_event_id);
      const searchTermLower = searchTerm.toLowerCase();

      const matchesSearch = !searchTerm || (
        (customer?.name?.toLowerCase().includes(searchTermLower)) ||
        searchCarriers.includes(searchTermLower) ||
        (t.version?.toLowerCase().includes(searchTermLower)) ||
        (t.tariff_family_id?.toLowerCase().includes(searchTermLower)) ||
        (cspEvent?.title?.toLowerCase().includes(searchTermLower))
      );

      if (!matchesSearch) return false;

      const today = new Date();
      const expiryDate = t.expiry_date ? new Date(t.expiry_date) : null;
      const daysUntilExpiry = expiryDate ? differenceInDays(expiryDate, today) : null;

      if (statusFilter === 'all') {
        return t.status === 'active' || t.status === 'proposed' ||
               (expiryDate && daysUntilExpiry !== null && daysUntilExpiry <= 90 && daysUntilExpiry > 0);
      }
      if (statusFilter === 'active') {
        return t.status === 'active' && (!expiryDate || isAfter(expiryDate, today));
      }
      if (statusFilter === 'proposed') return t.status === 'proposed';
      if (statusFilter === 'expiring') {
        return expiryDate && daysUntilExpiry !== null && daysUntilExpiry <= 90 && daysUntilExpiry > 0;
      }
      if (statusFilter === 'expired') {
        return t.status === 'expired' || (expiryDate && isBefore(expiryDate, today));
      }
      if (statusFilter === 'superseded') return t.status === 'superseded';

      return true;
    });
  }, [tariffs, ownershipTab, statusFilter, searchTerm, customers, carriers, cspEvents, modeFilter, showMyAccountsOnly]);

  const groupedTariffs = useMemo(() => {
    const groups = {};

    filteredTariffs.forEach(tariff => {
      let groupKey, groupName, subGroupKey, subGroupName;

      if (ownershipTab === 'rocket_blanket' || ownershipTab === 'priority1_blanket') {
        const carrier = carriers.find(c => tariff.carrier_ids?.includes(c.id));
        groupKey = carrier?.id || 'unknown';
        groupName = carrier ? `${carrier.name} Blanket` : 'Unknown Carrier';
        subGroupKey = tariff.tariff_family_id || tariff.id;
        subGroupName = 'Tariff Family';
      } else {
        const customer = customers.find(c => c.id === tariff.customer_id);
        groupKey = customer?.id || 'unknown';
        groupName = customer?.name || 'Unknown Customer';

        const carrier = carriers.find(c => tariff.carrier_ids?.includes(c.id));
        subGroupKey = tariff.tariff_family_id || tariff.id;
        subGroupName = carrier?.name || 'Unknown Carrier';
      }

      if (!groups[groupKey]) {
        groups[groupKey] = {
          name: groupName,
          key: groupKey,
          families: {}
        };
      }

      if (!groups[groupKey].families[subGroupKey]) {
        groups[groupKey].families[subGroupKey] = {
          familyId: subGroupKey,
          carrierName: subGroupName,
          versions: []
        };
      }

      groups[groupKey].families[subGroupKey].versions.push(tariff);
    });

    Object.values(groups).forEach(group => {
      Object.values(group.families).forEach(family => {
        const today = new Date();

        family.versions.sort((a, b) => {
          let valueA, valueB;

          if (sortColumn === 'expiry_date' || sortColumn === 'effective_date') {
            valueA = new Date(a[sortColumn] || '9999-12-31');
            valueB = new Date(b[sortColumn] || '9999-12-31');
          } else if (sortColumn === 'version' || sortColumn === 'version_number') {
            valueA = a.version_number || a.version || '';
            valueB = b.version_number || b.version || '';
          } else {
            return 0;
          }

          if (sortDirection === 'asc') {
            return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
          } else {
            return valueA < valueB ? 1 : valueA > valueB ? -1 : 0;
          }
        });

        family.hasLiveVersions = family.versions.some(v => {
          const expiryDate = v.expiry_date ? new Date(v.expiry_date) : null;
          const daysUntilExpiry = expiryDate ? differenceInDays(expiryDate, today) : null;
          return v.status === 'active' || v.status === 'proposed' ||
                 (expiryDate && daysUntilExpiry !== null && daysUntilExpiry <= 90 && daysUntilExpiry > 0);
        });
      });
    });

    const filteredGroups = Object.values(groups).map(group => {
      const liveFamilies = {};
      Object.entries(group.families).forEach(([key, family]) => {
        if (statusFilter === 'all' || statusFilter === 'active' || statusFilter === 'proposed' || statusFilter === 'expiring') {
          if (family.hasLiveVersions || searchTerm) {
            liveFamilies[key] = family;
          }
        } else {
          liveFamilies[key] = family;
        }
      });
      return { ...group, families: liveFamilies };
    }).filter(group => Object.keys(group.families).length > 0);

    const pinnedGroups = filteredGroups.filter(g => pinnedCustomers.has(g.key));
    const unpinnedGroups = filteredGroups.filter(g => !pinnedCustomers.has(g.key));

    if (sortBy === 'customer_name') {
      unpinnedGroups.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'expiry_date' || sortBy === 'days_left') {
      unpinnedGroups.sort((a, b) => {
        const aEarliestExpiry = Math.min(...Object.values(a.families).flatMap(f =>
          f.versions.map(v => v.expiry_date ? new Date(v.expiry_date).getTime() : Infinity)
        ));
        const bEarliestExpiry = Math.min(...Object.values(b.families).flatMap(f =>
          f.versions.map(v => v.expiry_date ? new Date(v.expiry_date).getTime() : Infinity)
        ));
        return aEarliestExpiry - bEarliestExpiry;
      });
    }

    return [...pinnedGroups, ...unpinnedGroups];
  }, [filteredTariffs, ownershipTab, customers, carriers, sortColumn, sortDirection, sortBy, pinnedCustomers]);

  const toggleGroup = (groupKey) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedGroups(newExpanded);
  };

  const toggleCarriers = (tariffId) => {
    const newExpanded = new Set(expandedCarriers);
    if (newExpanded.has(tariffId)) {
      newExpanded.delete(tariffId);
    } else {
      newExpanded.add(tariffId);
    }
    setExpandedCarriers(newExpanded);
  };

  const toggleFamily = (familyId) => {
    const newCollapsed = new Set(collapsedFamilies);
    if (newCollapsed.has(familyId)) {
      newCollapsed.delete(familyId);
    } else {
      newCollapsed.add(familyId);
    }
    setCollapsedFamilies(newCollapsed);
  };

  const getRowColorClass = (tariff) => {
    const today = new Date();
    const expiryDate = tariff.expiry_date ? new Date(tariff.expiry_date) : null;
    const daysUntilExpiry = expiryDate ? differenceInDays(expiryDate, today) : null;

    if (tariff.status === 'expired' || (expiryDate && daysUntilExpiry !== null && daysUntilExpiry < 0)) {
      return 'bg-slate-100 text-slate-600';
    }
    if (expiryDate && daysUntilExpiry !== null && daysUntilExpiry <= 90 && daysUntilExpiry >= 0) {
      return 'bg-yellow-50';
    }
    return 'bg-white';
  };

  const getCspEventBadge = (tariff) => {
    if (tariff.csp_event_id) {
      const cspEvent = cspEvents.find(e => e.id === tariff.csp_event_id);
      if (cspEvent) {
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1">
                  <Link2 className="w-3 h-3" />
                  {cspEvent.title}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Created from CSP event: {cspEvent.title}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      }
      return (
        <Badge variant="outline" className="text-xs bg-slate-50 text-slate-600 border-slate-200 flex items-center gap-1">
          <Link2 className="w-3 h-3" />
          RFP Event
        </Badge>
      );
    }
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200 flex items-center gap-1">
              <UploadCloud className="w-3 h-3" />
              Manual Upload
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Uploaded directly by user (not API-synced)</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const totalCount = groupedTariffs.reduce((sum, g) => sum + Object.values(g.families || {}).reduce((familySum, family) => familySum + (family.versions?.length || 0), 0), 0);

  const getTabCounts = useMemo(() => {
    const counts = {};
    OWNERSHIP_TYPES.forEach(type => {
      counts[type.value] = tariffs.filter(t => t.ownership_type === type.value).length;
    });
    return counts;
  }, [tariffs]);

  const expiringCount = useMemo(() => {
    const today = new Date();
    return filteredTariffs.filter(t => {
      const expiryDate = t.expiry_date ? new Date(t.expiry_date) : null;
      const daysUntilExpiry = expiryDate ? differenceInDays(expiryDate, today) : null;
      return expiryDate && daysUntilExpiry !== null && daysUntilExpiry <= 90 && daysUntilExpiry > 0;
    }).length;
  }, [filteredTariffs]);

  const tabSummary = useMemo(() => {
    const today = new Date();
    const currentTabTariffs = tariffs.filter(t => t.ownership_type === ownershipTab);

    const familyMap = new Map();
    currentTabTariffs.forEach(t => {
      const familyId = t.tariff_family_id || t.id;
      if (!familyMap.has(familyId)) {
        familyMap.set(familyId, []);
      }
      familyMap.get(familyId).push(t);
    });

    let activeCount = 0;
    let expiringCount = 0;
    let proposedCount = 0;

    familyMap.forEach(versions => {
      const hasActive = versions.some(t => {
        const expiryDate = t.expiry_date ? new Date(t.expiry_date) : null;
        return t.status === 'active' && (!expiryDate || isAfter(expiryDate, today));
      });
      const hasExpiring = versions.some(t => {
        const expiryDate = t.expiry_date ? new Date(t.expiry_date) : null;
        const daysUntilExpiry = expiryDate ? differenceInDays(expiryDate, today) : null;
        return expiryDate && daysUntilExpiry !== null && daysUntilExpiry <= 90 && daysUntilExpiry > 0;
      });
      const hasProposed = versions.some(t => t.status === 'proposed');

      if (hasActive) activeCount++;
      if (hasExpiring) expiringCount++;
      if (hasProposed) proposedCount++;
    });

    return { activeCount, expiringCount, proposedCount };
  }, [tariffs, ownershipTab]);

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Tariffs</h1>
          <p className="text-slate-600 mt-1">Manage customer and carrier pricing agreements</p>
        </div>
        <div className="flex gap-3">
          <IfHasPermission permission="tariffs.upload">
            <Link to={createPageUrl("/tariff-upload")}>
              <Button variant="outline">
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </Button>
            </Link>
          </IfHasPermission>
          <IfHasPermission permission="tariffs.create">
            <Button>
              <PlusCircle className="w-4 h-4 mr-2" />
              New Tariff
            </Button>
          </IfHasPermission>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Search by customer, carrier, family ID, CSP event, or version..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-slate-600 font-medium">Quick Filters:</span>

          <Button
            variant={modeFilter !== 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setModeFilter(modeFilter === 'all' ? 'LTL' : 'all')}
            className="h-8 flex items-center gap-1"
          >
            <Truck className="w-3.5 h-3.5" />
            Mode
            {modeFilter !== 'all' && (
              <>
                : {modeFilter}
                <X className="w-3 h-3 ml-1" onClick={(e) => { e.stopPropagation(); setModeFilter('all'); }} />
              </>
            )}
          </Button>

          <Button
            variant={showMyAccountsOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowMyAccountsOnly(!showMyAccountsOnly)}
            className={`h-8 flex items-center gap-1 ${showMyAccountsOnly ? 'bg-blue-600' : ''}`}
          >
            <User className="w-3.5 h-3.5" />
            My Accounts
          </Button>

          <div className="h-4 w-px bg-slate-300 mx-1" />

          <Button
            variant="outline"
            size="sm"
            onClick={() => {}}
            className="h-8 flex items-center gap-1"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            Sort: {SORT_OPTIONS.find(o => o.value === sortBy)?.label}
          </Button>
        </div>
      </div>

      <Tabs value={ownershipTab} onValueChange={handleTabChange} className="mb-6">
        <TabsList className="grid w-full grid-cols-4 h-auto p-1">
          {OWNERSHIP_TYPES.map(type => {
            const count = getTabCounts[type.value] || 0;
            return (
              <TabsTrigger
                key={type.value}
                value={type.value}
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm py-3 flex items-center gap-2"
              >
                <span>{type.label}</span>
                <Badge variant="secondary" className="text-xs">
                  {count}
                </Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.map(filter => (
            <Button
              key={filter.value}
              variant={statusFilter === filter.value ? "default" : "outline"}
              size="sm"
              onClick={() => handleStatusFilterChange(filter.value)}
              className="h-8"
            >
              {filter.label}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {expiringCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusFilterChange('expiring')}
              className="flex items-center gap-1 bg-yellow-50 text-yellow-800 border-yellow-300 hover:bg-yellow-100 h-8"
            >
              <AlertCircle className="w-3 h-3" />
              {expiringCount} Expiring Soon
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
            className={`h-8 flex items-center gap-2 ${showHistory ? 'bg-blue-50 text-blue-700 border-blue-300' : ''}`}
          >
            <input
              type="checkbox"
              checked={showHistory}
              onChange={() => {}}
              className="w-3.5 h-3.5"
            />
            Include history
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="sticky top-0 bg-white z-10 border-b">
          <CardTitle className="text-lg flex items-center justify-between">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className={`text-sm ${OWNERSHIP_TYPES.find(t => t.value === ownershipTab)?.color.replace('bg-', 'bg-').replace('border-l-4 border-l-', 'border-')}`}>
                  {OWNERSHIP_TYPES.find(t => t.value === ownershipTab)?.label}
                </Badge>
                <span className="text-sm font-normal text-slate-500">
                  {totalCount} {totalCount === 1 ? 'Tariff' : 'Tariffs'}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm font-normal text-slate-600">
                {tabSummary.activeCount > 0 && (
                  <span className="text-green-700">{tabSummary.activeCount} Active</span>
                )}
                {tabSummary.expiringCount > 0 && (
                  <span className="text-yellow-700">{tabSummary.expiringCount} Expiring</span>
                )}
                {tabSummary.proposedCount > 0 && (
                  <span className="text-blue-700">{tabSummary.proposedCount} Proposed</span>
                )}
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : groupedTariffs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500">No tariffs found matching your criteria</p>
            </div>
          ) : (
            <>
              <div className="sticky top-0 z-20 bg-white border-b px-4 py-2 -mx-6 -mt-6 mb-4 flex items-center gap-3 text-sm">
                <Badge variant="outline" className="font-medium">
                  {OWNERSHIP_TYPES.find(t => t.value === ownershipTab)?.label}
                </Badge>
                <span className="text-slate-600">
                  Active <span className="font-semibold text-green-700">{tabSummary.activeCount}</span> •
                  Expiring <span className="font-semibold text-yellow-700">{tabSummary.expiringCount}</span> •
                  Proposed <span className="font-semibold text-blue-700">{tabSummary.proposedCount}</span>
                </span>
                <span className="text-slate-500 ml-auto">
                  Showing Families 1–{groupedTariffs.length} of {groupedTariffs.length}
                </span>
              </div>

              <div className="space-y-4">
                {groupedTariffs.map(group => {
                const isExpanded = expandedGroups.has(group.key);
                const isPinned = pinnedCustomers.has(group.key);
                return (
                  <div key={group.key} className={`border rounded-lg overflow-hidden group/card ${isPinned ? 'border-blue-300 bg-blue-50/30' : ''}`}>
                    <div className="group/header">
                      <button
                        onClick={() => toggleGroup(group.key)}
                        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                      >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-slate-400" />
                        )}
                        {isPinned && <Pin className="w-4 h-4 text-blue-600 fill-blue-600" />}
                        <span className="font-semibold text-slate-900">{group.name}</span>
                        <Badge variant="outline" className="ml-2">
                          {Object.values(group.families || {}).reduce((sum, family) => sum + (family.versions?.length || 0), 0)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const allVersions = Object.values(group.families || {}).flatMap(f => f.versions || []);
                          const activeCount = allVersions.filter(t => {
                            const today = new Date();
                            const expiryDate = t.expiry_date ? new Date(t.expiry_date) : null;
                            return t.status === 'active' && (!expiryDate || isAfter(expiryDate, today));
                          }).length;
                          const expiringCount = allVersions.filter(t => {
                            const today = new Date();
                            const expiryDate = t.expiry_date ? new Date(t.expiry_date) : null;
                            const daysUntilExpiry = expiryDate ? differenceInDays(expiryDate, today) : null;
                            return expiryDate && daysUntilExpiry !== null && daysUntilExpiry <= 90 && daysUntilExpiry > 0;
                          }).length;
                          return (
                            <>
                              {activeCount > 0 && (
                                <span className="text-xs text-slate-500">{activeCount} Active</span>
                              )}
                              {expiringCount > 0 && (
                                <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                                  {expiringCount} Expiring
                                </Badge>
                              )}
                            </>
                          );
                        })()}
                        <div className="opacity-0 group-hover/card:opacity-100 transition-opacity flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-7 text-xs ${isPinned ? 'text-blue-600' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              const newPinned = new Set(pinnedCustomers);
                              if (isPinned) {
                                newPinned.delete(group.key);
                              } else {
                                newPinned.add(group.key);
                              }
                              setPinnedCustomers(newPinned);
                            }}
                          >
                            <Pin className={`w-3 h-3 mr-1 ${isPinned ? 'fill-blue-600' : ''}`} />
                            {isPinned ? 'Unpin' : 'Pin'}
                          </Button>
                          {ownershipTab === 'rocket_blanket' || ownershipTab === 'priority1_blanket' ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                const carrier = carriers.find(c => c.id === group.key);
                                if (carrier) {
                                  window.location.href = createPageUrl(`CarrierDetail?id=${carrier.id}`);
                                }
                              }}
                            >
                              <FileText className="w-3 h-3 mr-1" />
                              View Carrier
                            </Button>
                          ) : (
                            <Link to={createPageUrl(`Customers?detailId=${group.key}`)}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <FileText className="w-3 h-3 mr-1" />
                                View Customer
                              </Button>
                            </Link>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Add Tariff
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <GitCompare className="w-3 h-3 mr-1" />
                            Compare
                          </Button>
                        </div>
                      </div>
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="border-t">
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-slate-50 border-b">
                              <tr>
                                <th className="text-left p-3 text-xs font-semibold text-slate-600">
                                  <button
                                    onClick={() => handleSort('version')}
                                    className="flex items-center gap-1 hover:text-slate-900 transition-colors"
                                  >
                                    Version
                                    {sortColumn === 'version' && (
                                      <ArrowUpDown className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                                    )}
                                  </button>
                                </th>
                                <th className="text-left p-3 text-xs font-semibold text-slate-600">Status</th>
                                <th className="text-left p-3 text-xs font-semibold text-slate-600">Source</th>
                                <th className="text-left p-3 text-xs font-semibold text-slate-600">Carrier</th>
                                <th className="text-right p-3 text-xs font-semibold text-slate-600">
                                  <button
                                    onClick={() => handleSort('effective_date')}
                                    className="flex items-center gap-1 hover:text-slate-900 transition-colors ml-auto"
                                  >
                                    Effective Date
                                    {sortColumn === 'effective_date' && (
                                      <ArrowUpDown className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                                    )}
                                  </button>
                                </th>
                                <th className="text-right p-3 text-xs font-semibold text-slate-600">
                                  <button
                                    onClick={() => handleSort('expiry_date')}
                                    className="flex items-center gap-1 hover:text-slate-900 transition-colors ml-auto"
                                  >
                                    Expiry Date
                                    {sortColumn === 'expiry_date' && (
                                      <ArrowUpDown className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                                    )}
                                  </button>
                                </th>
                                <th className="text-right p-3 text-xs font-semibold text-slate-600 w-32">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                        {Object.values(group.families || {}).map(family => {
                          const activeVersion = family.versions.find(v => v.status === 'active' && (!v.expiry_date || isAfter(new Date(v.expiry_date), new Date())));
                          const proposedVersion = family.versions.find(v => v.status === 'proposed');
                          const expiringVersion = family.versions.find(v => {
                            const expiryDate = v.expiry_date ? new Date(v.expiry_date) : null;
                            const daysUntilExpiry = expiryDate ? differenceInDays(expiryDate, new Date()) : null;
                            return expiryDate && daysUntilExpiry !== null && daysUntilExpiry <= 90 && daysUntilExpiry > 0;
                          });
                          const mostRecentUpdate = family.versions.reduce((latest, v) => {
                            const vDate = new Date(v.updated_date || v.created_date);
                            return !latest || vDate > new Date(latest) ? (v.updated_date || v.created_date) : latest;
                          }, null);
                          const cspEvent = activeVersion?.csp_event_id ? cspEvents.find(e => e.id === activeVersion.csp_event_id) : null;
                          const isFamilyCollapsed = collapsedFamilies.has(family.familyId);
                          const firstVersion = family.versions[0];

                          return (
                          <React.Fragment key={family.familyId}>
                            {family.versions.length >= 1 && (
                              <tr className={`bg-gradient-to-r from-slate-50 to-slate-100 border-b-2 border-slate-200 border-l-4 ${getOwnershipBorderColor(ownershipTab)}`}>
                                <td colSpan="7" className="p-4">
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        <button
                                          onClick={() => toggleFamily(family.familyId)}
                                          className="hover:bg-slate-200 rounded p-0.5 transition-colors"
                                        >
                                          {isFamilyCollapsed ? (
                                            <ChevronRight className="w-4 h-4 text-slate-600" />
                                          ) : (
                                            <ChevronDown className="w-4 h-4 text-slate-600" />
                                          )}
                                        </button>
                                        <FolderOpen className="w-4 h-4 text-slate-600" />
                                        <span className="font-semibold text-sm text-slate-900">
                                          Tariff Family: {group.name} × {family.carrierName}
                                        </span>
                                        {ownershipTab === 'rocket_csp' && (
                                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
                                            Rocket CSP
                                          </Badge>
                                        )}
                                        <div className="flex items-center gap-1 ml-2">
                                          {ownershipTab !== 'rocket_blanket' && ownershipTab !== 'priority1_blanket' && (
                                            <Link
                                              to={createPageUrl(`Customers?detailId=${group.key}`)}
                                              className="text-xs text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              <ArrowUpDown className="w-3 h-3 rotate-90" />
                                              Jump to Customer
                                            </Link>
                                          )}
                                          {(() => {
                                            const firstVersion = family.versions[0];
                                            const carrierId = firstVersion?.carrier_ids?.[0];
                                            if (carrierId) {
                                              return (
                                                <Link
                                                  to={createPageUrl(`CarrierDetail?id=${carrierId}`)}
                                                  className="text-xs text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
                                                  onClick={(e) => e.stopPropagation()}
                                                >
                                                  <ArrowUpDown className="w-3 h-3 rotate-90" />
                                                  Jump to Carrier
                                                </Link>
                                              );
                                            }
                                            return null;
                                          })()}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1 text-xs text-slate-500">
                                        <Briefcase className="w-3 h-3" />
                                        <span>Family ID: {family.familyId.slice(0, 8).toUpperCase()}</span>
                                      </div>
                                    </div>
                                    <div className="flex gap-6 text-xs">
                                      <div className="flex flex-col gap-1">
                                        <span className="text-slate-500 font-medium">Versions</span>
                                        <div className="flex items-center gap-1">
                                          <Badge variant="secondary" className="font-semibold">{family.versions.length}</Badge>
                                        </div>
                                      </div>
                                      {activeVersion && (
                                        <div className="flex flex-col gap-1">
                                          <span className="text-slate-500 font-medium">Active Version</span>
                                          <span className="text-slate-900 font-semibold">{activeVersion.version}</span>
                                        </div>
                                      )}
                                      {expiringVersion && (
                                        <div className="flex flex-col gap-1">
                                          <span className="text-slate-500 font-medium">Expiring In</span>
                                          <div className="flex items-center gap-1">
                                            <Clock className="w-3 h-3 text-yellow-600" />
                                            <span className="text-yellow-700 font-semibold">
                                              {differenceInDays(new Date(expiringVersion.expiry_date), new Date())}d
                                            </span>
                                          </div>
                                        </div>
                                      )}
                                      {proposedVersion && (
                                        <div className="flex flex-col gap-1">
                                          <span className="text-slate-500 font-medium">Next Proposed</span>
                                          <span className="text-blue-700 font-semibold">{proposedVersion.version}</span>
                                        </div>
                                      )}
                                      {cspEvent && (
                                        <div className="flex flex-col gap-1">
                                          <span className="text-slate-500 font-medium">Created via</span>
                                          <Link
                                            to={createPageUrl(`Pipeline?detailId=${cspEvent.id}`)}
                                            className="text-blue-600 hover:text-blue-700 hover:underline font-medium flex items-center gap-1"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <Link2 className="w-3 h-3" />
                                            CSP Event
                                          </Link>
                                        </div>
                                      )}
                                      {mostRecentUpdate && (
                                        <div className="flex flex-col gap-1">
                                          <span className="text-slate-500 font-medium">Last Updated</span>
                                          <span className="text-slate-700 font-medium">{format(new Date(mostRecentUpdate), 'MMM d, yyyy')}</span>
                                        </div>
                                      )}
                                      {family.versions.length > 1 && (
                                        <div className="flex flex-col gap-1">
                                          <span className="text-slate-500 font-medium">Actions</span>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-6 text-xs px-2"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                            }}
                                          >
                                            <GitCompare className="w-3 h-3 mr-1" />
                                            Compare
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                            {!isFamilyCollapsed && family.versions.map((tariff, index) => {
                              const customer = customers.find(c => c.id === tariff.customer_id);
                              const tariffCarriers = (tariff.carrier_ids || [])
                                .map(id => carriers.find(c => c.id === id))
                                .filter(Boolean);
                              const isExpanded = expandedCarriers.has(tariff.id);
                              const today = new Date();
                              const expiryDate = tariff.expiry_date ? new Date(tariff.expiry_date) : null;
                              const daysUntilExpiry = expiryDate ? differenceInDays(expiryDate, today) : null;
                              const isLive = tariff.status === 'active' || tariff.status === 'proposed' ||
                                           (expiryDate && daysUntilExpiry !== null && daysUntilExpiry <= 90 && daysUntilExpiry > 0);
                              const isHistory = !isLive && (tariff.status === 'expired' || tariff.status === 'superseded' ||
                                              (expiryDate && isBefore(expiryDate, today)));

                              if (isHistory && !showHistory && !expandedFamilyHistory.has(family.familyId)) {
                                return null;
                              }

                              return (
                                <React.Fragment key={tariff.id}>
                              <tr
                                className={`transition-colors border-b last:border-b-0 ${getOwnershipColor(tariff.ownership_type)} ${getRowColorClass(tariff)} ${hoveredRowId === tariff.id ? 'ring-1 ring-inset ring-blue-300' : ''}`}
                                onMouseEnter={() => setHoveredRowId(tariff.id)}
                                onMouseLeave={() => setHoveredRowId(null)}
                              >
                                <td className="p-3">
                                  <Link
                                    to={createPageUrl(`TariffDetail?id=${tariff.id}`)}
                                    className="font-medium text-slate-900 hover:text-blue-600 hover:underline"
                                  >
                                    {tariff.version || 'No Version'}
                                  </Link>
                                </td>
                                <td className="p-3">
                                  {getStatusBadge(tariff)}
                                </td>
                                <td className="p-3">
                                  {getCspEventBadge(tariff)}
                                </td>
                                <td className="p-3 text-sm text-slate-600">
                                  {tariffCarriers.length > 0 ? (
                                    <div className="flex items-center gap-1">
                                      <span>{tariffCarriers[0].name}</span>
                                      {tariffCarriers.length > 1 && (
                                        <button
                                          onClick={(e) => {
                                            e.preventDefault();
                                            toggleCarriers(tariff.id);
                                          }}
                                          className="text-xs text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                                        >
                                          +{tariffCarriers.length - 1} more
                                        </button>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-slate-400">—</span>
                                  )}
                                </td>
                                <td className="p-3 text-sm text-slate-600 text-right">
                                  {tariff.effective_date ? format(new Date(tariff.effective_date), 'MMM dd, yyyy') : '—'}
                                </td>
                                <td className="p-3 text-sm text-slate-600 text-right">
                                  {tariff.expiry_date ? format(new Date(tariff.expiry_date), 'MMM dd, yyyy') : '—'}
                                </td>
                                <td className="p-3 text-right">
                                  <div className={`flex items-center justify-end gap-1 transition-opacity ${hoveredRowId === tariff.id ? 'opacity-100' : 'opacity-0'}`}>
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            asChild
                                          >
                                            <Link to={createPageUrl(`TariffDetail?id=${tariff.id}`)}>
                                              <Eye className="w-3.5 h-3.5" />
                                            </Link>
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>View</TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={(e) => {
                                              e.preventDefault();
                                            }}
                                          >
                                            <GitCompare className="w-3.5 h-3.5" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Compare</TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={(e) => {
                                              e.preventDefault();
                                            }}
                                          >
                                            <RefreshCw className="w-3.5 h-3.5" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Renew</TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            asChild
                                          >
                                            <Link to={createPageUrl(`TariffDetail?id=${tariff.id}#documents`)}>
                                              <FileCheck className="w-3.5 h-3.5" />
                                            </Link>
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Documents</TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                </td>
                              </tr>
                              {isExpanded && (
                                <tr className={`${getRowColorClass(tariff)}`}>
                                  <td colSpan="7" className="px-4 py-2 bg-slate-50/50 border-b last:border-b-0">
                                    <div className="text-sm space-y-1">
                                      <div className="font-medium text-slate-700">All Carriers:</div>
                                      {tariffCarriers.map((carrier, idx) => (
                                        <div key={carrier.id} className="text-slate-600 pl-3">
                                          {idx + 1}. {carrier.name} {carrier.scac && `(${carrier.scac})`}
                                        </div>
                                      ))}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                            );
                            })}
                            {(() => {
                              const historyCount = family.versions.filter(v => {
                                const today = new Date();
                                const expiryDate = v.expiry_date ? new Date(v.expiry_date) : null;
                                const daysUntilExpiry = expiryDate ? differenceInDays(expiryDate, today) : null;
                                const isLive = v.status === 'active' || v.status === 'proposed' ||
                                             (expiryDate && daysUntilExpiry !== null && daysUntilExpiry <= 90 && daysUntilExpiry > 0);
                                return !isLive;
                              }).length;

                              if (historyCount > 0 && !showHistory && !expandedFamilyHistory.has(family.familyId)) {
                                return (
                                  <tr key={`${family.familyId}-history-toggle`}>
                                    <td colSpan="7" className="p-2 text-center bg-slate-50 border-b">
                                      <button
                                        onClick={() => {
                                          const newExpanded = new Set(expandedFamilyHistory);
                                          newExpanded.add(family.familyId);
                                          setExpandedFamilyHistory(newExpanded);
                                        }}
                                        className="text-xs text-blue-600 hover:text-blue-700 hover:underline font-medium"
                                      >
                                        Show history ({historyCount})
                                      </button>
                                    </td>
                                  </tr>
                                );
                              }
                              return null;
                            })()}
                          </React.Fragment>
                        );
                        })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
