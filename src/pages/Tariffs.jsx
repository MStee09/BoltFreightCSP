import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Customer, Carrier, Tariff, CSPEvent } from "../api/entities";
import { supabase } from "../api/supabaseClient";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "../utils";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/ui/tooltip";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "../components/ui/dropdown-menu";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { PlusCircle, Search, Upload, ChevronDown, ChevronRight, AlertCircle, Eye, GitCompare, Download, FileText, Plus, Calendar, Link2, UploadCloud, RefreshCw, FileCheck, ArrowUpDown, Briefcase, FolderOpen, TrendingUp, Clock, X, Pin, User, Truck, Package, CreditCard as Edit, History, FileSpreadsheet, Repeat, ChevronsDown, ChevronsUp, Star, MoreVertical, Trash2, CheckCircle } from "lucide-react";
import { format, isAfter, isBefore, differenceInDays } from "date-fns";
import { Skeleton } from "../components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { IfHasPermission } from "../components/auth/PermissionGuard";
import { useUserRole } from "../hooks/useUserRole";
import { toast } from "sonner";
import CreateAwardedCspDialog from "../components/tariffs/CreateAwardedCspDialog";
import EditTariffDialog from "../components/tariffs/EditTariffDialog";
import RenewalStatusBadge from "../components/tariffs/RenewalStatusBadge";
import BlanketUsageDrawer from "../components/tariffs/BlanketUsageDrawer";

const OWNERSHIP_TYPES = [
  { value: 'rocket_csp', label: 'Rocket CSP', color: 'bg-purple-50 border-l-4 border-l-purple-500', tooltip: 'Tariffs negotiated and managed by Rocket on behalf of the customer' },
  { value: 'customer_direct', label: 'Customer Direct', color: 'bg-blue-50 border-l-4 border-l-blue-500', tooltip: 'Tariffs managed directly between the customer and carrier, visible for reference' },
  { value: 'rocket_blanket', label: 'Rocket Blanket', color: 'bg-orange-50 border-l-4 border-l-orange-500', tooltip: 'Rocket\'s blanket pricing programs available to multiple customers' },
  { value: 'priority1_blanket', label: 'Priority 1 CSP', color: 'bg-green-50 border-l-4 border-l-green-500', tooltip: 'Preferred carrier programs with special terms or dedicated service levels' }
];

const STATUS_FILTERS = [
  { value: 'all', label: 'All', tooltip: 'Show all tariffs regardless of status' },
  { value: 'active', label: 'Active', tooltip: 'Currently active and in use for pricing' },
  { value: 'proposed', label: 'Proposed', tooltip: 'Pending approval or implementation' },
  { value: 'expiring', label: 'Expiring < 90d', tooltip: 'View tariffs expiring within 90 days — recommended for renewal action' },
  { value: 'expired', label: 'Expired', tooltip: 'Past expiration date and no longer active' },
  { value: 'superseded', label: 'Superseded', tooltip: 'Replaced by a newer version in the same family' }
];

const SERVICE_TYPE_FILTERS = [
  { value: 'all', label: 'All', tooltip: 'Show all service types' },
  { value: 'LTL', label: 'LTL', tooltip: 'Less-Than-Truckload shipments' },
  { value: 'Home Delivery', label: 'Home Delivery LTL', tooltip: 'Residential delivery services' }
];

const SORT_OPTIONS = [
  { value: 'expiry_date', label: 'Expiry Date ▼' },
  { value: 'customer_name', label: 'Customer A–Z' },
  { value: 'last_updated', label: 'Last Updated' },
  { value: 'owner', label: 'Owner' }
];

export default function TariffsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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
  const [serviceTypeFilter, setServiceTypeFilter] = useState('all');
  const [pinnedCustomers, setPinnedCustomers] = useState(new Set());
  const [sortBy, setSortBy] = useState('expiry_date');
  const [showArchived, setShowArchived] = useState(false);
  const [hoveredRowId, setHoveredRowId] = useState(null);
  const [sortColumn, setSortColumn] = useState('expiry_date');
  const [sortDirection, setSortDirection] = useState('asc');
  const [showCspDialog, setShowCspDialog] = useState(false);
  const [cspActionType, setCspActionType] = useState('tariff');
  const [showNewTariffDialog, setShowNewTariffDialog] = useState(false);
  const [newTariffCspEvent, setNewTariffCspEvent] = useState(null);
  const [myAccountsOnly, setMyAccountsOnly] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState([]);
  const { userProfile } = useUserRole();
  const [allExpanded, setAllExpanded] = useState(false);
  const [showRenewalDialog, setShowRenewalDialog] = useState(false);
  const [renewalFamilyData, setRenewalFamilyData] = useState(null);
  const [pinnedFamilies, setPinnedFamilies] = useState(new Set());
  const [userPins, setUserPins] = useState({ customers: new Set(), families: new Set() });
  const [editingTariff, setEditingTariff] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedCustomerIds, setSelectedCustomerIds] = useState(new Set());
  const [viewMode, setViewMode] = useState('family');
  const [customerFilterOpen, setCustomerFilterOpen] = useState(false);
  const [showSearchSuggestion, setShowSearchSuggestion] = useState(false);
  const [suggestedCustomer, setSuggestedCustomer] = useState(null);
  const [blanketUsageDrawer, setBlanketUsageDrawer] = useState({ isOpen: false, tariff: null, carrier: null });

  useEffect(() => {
    const view = searchParams.get('view');
    const customerIds = searchParams.get('customer_ids');

    if (view && ['family', 'customer'].includes(view)) {
      setViewMode(view);
    }

    if (customerIds) {
      setSelectedCustomerIds(new Set(customerIds.split(',')));
    }
  }, []);

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

  const handleChangeStatus = async (tariffId, newStatus) => {
    try {
      await Tariff.update(tariffId, { status: newStatus });
      queryClient.invalidateQueries({ queryKey: ["tariffs"] });
      toast.success(`Tariff status changed to ${newStatus}`);
    } catch (error) {
      console.error('Error changing tariff status:', error);
      toast.error('Failed to change tariff status');
    }
  };

  const handleDeleteTariff = async (tariffId, tariffName) => {
    if (!confirm(`Are you sure you want to delete ${tariffName}? This action cannot be undone.`)) {
      return;
    }

    try {
      await Tariff.delete(tariffId);
      queryClient.invalidateQueries({ queryKey: ["tariffs"] });
      toast.success('Tariff deleted successfully');
    } catch (error) {
      console.error('Error deleting tariff:', error);
      toast.error('Failed to delete tariff');
    }
  };

  const handleEditTariff = (tariff) => {
    setEditingTariff(tariff);
    setShowEditDialog(true);
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

  const { data: sopCounts = {} } = useQuery({
    queryKey: ["tariff_sop_counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tariff_sops')
        .select('tariff_id');

      if (error) throw error;

      const counts = {};
      (data || []).forEach(sop => {
        counts[sop.tariff_id] = (counts[sop.tariff_id] || 0) + 1;
      });
      return counts;
    },
    initialData: {}
  });

  const { data: userPinsData = [] } = useQuery({
    queryKey: ["user_pins", userProfile?.id],
    queryFn: async () => {
      if (!userProfile?.id) return [];
      const { data, error } = await supabase
        .from('user_pins')
        .select('*')
        .eq('user_id', userProfile.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!userProfile?.id,
    initialData: []
  });

  React.useEffect(() => {
    if (userPinsData) {
      const customerPins = new Set(userPinsData.filter(p => p.pin_type === 'customer').map(p => p.ref_id));
      const familyPins = new Set(userPinsData.filter(p => p.pin_type === 'tariff_family').map(p => p.ref_id));
      setUserPins({ customers: customerPins, families: familyPins });
      setPinnedCustomers(customerPins);
      setPinnedFamilies(familyPins);
    }
  }, [userPinsData]);

  useEffect(() => {
    const params = {};
    if (viewMode !== 'family') {
      params.view = viewMode;
    }
    if (selectedCustomerIds.size > 0) {
      params.customer_ids = Array.from(selectedCustomerIds).join(',');
    }

    const newSearchParams = new URLSearchParams(params);
    if (newSearchParams.toString() !== searchParams.toString()) {
      setSearchParams(newSearchParams, { replace: true });
    }
  }, [viewMode, selectedCustomerIds]);

  useEffect(() => {
    if (searchTerm && !searchTerm.toLowerCase().startsWith('customer:')) {
      const matchedCustomer = customers.find(c =>
        c.name?.toLowerCase() === searchTerm.toLowerCase()
      );
      if (matchedCustomer) {
        setSuggestedCustomer(matchedCustomer);
        setShowSearchSuggestion(true);
      } else {
        setShowSearchSuggestion(false);
        setSuggestedCustomer(null);
      }
    } else {
      setShowSearchSuggestion(false);
      setSuggestedCustomer(null);
    }
  }, [searchTerm, customers]);

  const isLoading = isTariffsLoading || isCustomersLoading || isCarriersLoading || isCspEventsLoading;

  const getStatusBadge = (tariff) => {
    const today = new Date();
    const expiryDate = tariff.expiry_date ? new Date(tariff.expiry_date) : null;
    const daysUntilExpiry = expiryDate ? differenceInDays(expiryDate, today) : null;

    const updatedBy = tariff.updated_by ? userProfiles.find(u => u.id === tariff.updated_by) : null;
    const createdBy = tariff.created_by ? userProfiles.find(u => u.id === tariff.created_by) : null;
    const publisher = updatedBy || createdBy;
    const tooltipText = publisher
      ? `Published by ${publisher.first_name} ${publisher.last_name}`
      : 'Publisher unknown';

    const badge = (() => {
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
    })();

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="inline-flex">{badge}</div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltipText}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
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

      if (selectedCustomerIds.size > 0 && !selectedCustomerIds.has(t.customer_id)) {
        return false;
      }

      if (myAccountsOnly && customer && userProfile) {
        const isOwner = customer.csp_owner_id === userProfile.id;
        const isCollaborator = customer.collaborators?.includes(userProfile.id);
        if (!isOwner && !isCollaborator) return false;
      }

      if (serviceTypeFilter !== 'all' && t.mode !== serviceTypeFilter) return false;

      const carrierIds = t.carrier_ids || [];
      const carrierNames = carrierIds.length > 0
        ? carrierIds.map(cid => carriers.find(c => c.id === cid)?.name).filter(Boolean).join(' ')
        : (carriers.find(c => c.id === t.carrier_id)?.name || '');
      const searchCarriers = carrierNames.toLowerCase();
      const cspEvent = cspEvents.find(e => e.id === t.csp_event_id);

      let searchTermLower = searchTerm.toLowerCase();
      let isCustomerSearch = false;

      if (searchTermLower.startsWith('customer:')) {
        isCustomerSearch = true;
        searchTermLower = searchTermLower.substring(9).trim();
      }

      const matchesSearch = !searchTerm || (
        isCustomerSearch
          ? (customer?.name?.toLowerCase().includes(searchTermLower))
          : (
            (customer?.name?.toLowerCase().includes(searchTermLower)) ||
            searchCarriers.includes(searchTermLower) ||
            (t.version?.toLowerCase().includes(searchTermLower)) ||
            (t.tariff_reference_id?.toLowerCase().includes(searchTermLower)) ||
            (t.tariff_family_id?.toLowerCase().includes(searchTermLower)) ||
            (cspEvent?.title?.toLowerCase().includes(searchTermLower))
          )
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
  }, [tariffs, ownershipTab, statusFilter, searchTerm, customers, carriers, cspEvents, serviceTypeFilter, myAccountsOnly, userProfile, selectedCustomerIds]);

  const groupedTariffs = useMemo(() => {
    const groups = {};

    filteredTariffs.forEach(tariff => {
      let groupKey, groupName, subGroupKey, subGroupName;

      if (ownershipTab === 'rocket_blanket' || ownershipTab === 'priority1_blanket') {
        const carrierIds = tariff.carrier_ids || [];
        const carrier = tariff.carriers || (carrierIds.length > 0
          ? carriers.find(c => carrierIds.includes(c.id))
          : carriers.find(c => c.id === tariff.carrier_id));
        groupKey = carrier?.id || 'unknown';
        groupName = carrier ? `${carrier.name} Blanket` : 'Unknown Carrier';
        subGroupKey = tariff.tariff_family_id || tariff.id;
        subGroupName = 'Tariff Family';
      } else {
        const customer = tariff.customers || customers.find(c => c.id === tariff.customer_id);
        groupKey = customer?.id || 'unknown';
        groupName = customer?.name || 'Unknown Customer';

        const carrierIds = tariff.carrier_ids || [];
        const carrier = tariff.carriers || (carrierIds.length > 0
          ? carriers.find(c => carrierIds.includes(c.id))
          : carriers.find(c => c.id === tariff.carrier_id));
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
          } else if (sortColumn === 'status') {
            const statusOrder = { 'active': 1, 'expiring': 2, 'proposed': 3, 'expired': 4, 'superseded': 5 };
            const getStatusRank = (tariff) => {
              const expiryDate = tariff.expiry_date ? new Date(tariff.expiry_date) : null;
              const daysUntilExpiry = expiryDate ? differenceInDays(expiryDate, today) : null;
              if (tariff.status === 'expired' || (expiryDate && isBefore(expiryDate, today))) return statusOrder.expired;
              if (tariff.status === 'superseded') return statusOrder.superseded;
              if (tariff.status === 'proposed') return statusOrder.proposed;
              if (daysUntilExpiry !== null && daysUntilExpiry <= 90 && daysUntilExpiry > 0) return statusOrder.expiring;
              return statusOrder.active;
            };
            valueA = getStatusRank(a);
            valueB = getStatusRank(b);
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
      const archivedFamilies = {};

      Object.entries(group.families).forEach(([key, family]) => {
        const isArchived = !family.hasLiveVersions;

        if (statusFilter === 'all' || statusFilter === 'active' || statusFilter === 'proposed' || statusFilter === 'expiring') {
          if (family.hasLiveVersions || searchTerm) {
            liveFamilies[key] = { ...family, isArchived: false, isPinned: userPins.families.has(family.familyId) };
          } else if (showHistory) {
            archivedFamilies[key] = { ...family, isArchived: true, isPinned: userPins.families.has(family.familyId) };
          }
        } else {
          if (isArchived && showHistory) {
            archivedFamilies[key] = { ...family, isArchived: true, isPinned: userPins.families.has(family.familyId) };
          } else {
            liveFamilies[key] = { ...family, isArchived: false, isPinned: userPins.families.has(family.familyId) };
          }
        }
      });

      const sortFamilies = (familiesObj) => {
        const familyArray = Object.entries(familiesObj);
        const pinnedFams = familyArray.filter(([_, fam]) => fam.isPinned);
        const unpinnedFams = familyArray.filter(([_, fam]) => !fam.isPinned);
        return Object.fromEntries([...pinnedFams, ...unpinnedFams]);
      };

      return { ...group, families: { ...sortFamilies(liveFamilies), ...sortFamilies(archivedFamilies) } };
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
    } else if (sortBy === 'last_activity') {
      unpinnedGroups.sort((a, b) => {
        const aLatestActivity = Math.max(...Object.values(a.families).flatMap(f =>
          f.versions.map(v => v.updated_at ? new Date(v.updated_at).getTime() : 0)
        ));
        const bLatestActivity = Math.max(...Object.values(b.families).flatMap(f =>
          f.versions.map(v => v.updated_at ? new Date(v.updated_at).getTime() : 0)
        ));
        return bLatestActivity - aLatestActivity;
      });
    }

    return [...pinnedGroups, ...unpinnedGroups];
  }, [filteredTariffs, ownershipTab, customers, carriers, sortColumn, sortDirection, sortBy, pinnedCustomers]);

  const exportToCSV = () => {
    const allTariffs = groupedTariffs.flatMap(group =>
      Object.values(group.families || {}).flatMap(family =>
        family.versions.map(tariff => {
          const customer = customers.find(c => c.id === tariff.customer_id);

          // Get carrier names - try multiple sources
          let carrierNames = '';
          if (tariff.carrier_ids && tariff.carrier_ids.length > 0) {
            const tariffCarriers = tariff.carrier_ids
              .map(id => carriers.find(c => c.id === id))
              .filter(Boolean);
            carrierNames = tariffCarriers.map(c => c.name).join('; ');
          } else if (tariff.carrier_id) {
            const carrier = carriers.find(c => c.id === tariff.carrier_id);
            carrierNames = carrier?.name || '';
          } else if (family.carrierName && family.carrierName !== 'Unknown Carrier') {
            carrierNames = family.carrierName;
          }

          const cspEvent = tariff.csp_event_id ? cspEvents.find(e => e.id === tariff.csp_event_id) : null;

          return {
            'Tariff ID': tariff.tariff_reference_id || '',
            'Customer': customer?.name || '',
            'Carrier(s)': carrierNames,
            'Status': tariff.status || '',
            'Ownership': OWNERSHIP_TYPES.find(t => t.value === tariff.ownership_type)?.label || '',
            'Service Type': tariff.service_type || '',
            'Mode': tariff.mode || '',
            'Effective Date': tariff.effective_date ? format(new Date(tariff.effective_date), 'yyyy-MM-dd') : '',
            'Expiry Date': tariff.expiry_date ? format(new Date(tariff.expiry_date), 'yyyy-MM-dd') : '',
            'CSP Event': cspEvent?.title || '',
            'Created Date': tariff.created_date ? format(new Date(tariff.created_date), 'yyyy-MM-dd') : '',
            'Updated Date': tariff.updated_date ? format(new Date(tariff.updated_date), 'yyyy-MM-dd') : ''
          };
        })
      )
    );

    const csvHeaders = Object.keys(allTariffs[0] || {});
    const csvRows = allTariffs.map(row =>
      csvHeaders.map(header => {
        const value = row[header] || '';
        return `"${value.toString().replace(/"/g, '""')}"`;
      }).join(',')
    );

    const csv = [
      csvHeaders.join(','),
      ...csvRows
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `tariffs_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

  const handleExpandAll = () => {
    setCollapsedFamilies(new Set());
    setAllExpanded(true);
  };

  const handleCollapseAll = () => {
    const allFamilyIds = groupedTariffs.flatMap(group =>
      Object.values(group.families || {}).map(family => family.familyId)
    );
    setCollapsedFamilies(new Set(allFamilyIds));
    setAllExpanded(false);
  };

  const togglePin = async (type, refId) => {
    if (!userProfile?.id) return;

    const isPinned = type === 'customer' ? userPins.customers.has(refId) : userPins.families.has(refId);

    try {
      if (isPinned) {
        const { error } = await supabase
          .from('user_pins')
          .delete()
          .eq('user_id', userProfile.id)
          .eq('pin_type', type)
          .eq('ref_id', refId);
        if (error) throw error;
        toast.success(`${type === 'customer' ? 'Customer' : 'Family'} unpinned`);
      } else {
        const { error } = await supabase
          .from('user_pins')
          .insert({ user_id: userProfile.id, pin_type: type, ref_id: refId });
        if (error) throw error;
        toast.success(`${type === 'customer' ? 'Customer' : 'Family'} pinned to top`);
      }

      const updatedPins = { ...userPins };
      if (isPinned) {
        updatedPins[type === 'customer' ? 'customers' : 'families'].delete(refId);
      } else {
        updatedPins[type === 'customer' ? 'customers' : 'families'].add(refId);
      }
      setUserPins(updatedPins);

      if (type === 'customer') {
        setPinnedCustomers(updatedPins.customers);
      } else {
        setPinnedFamilies(updatedPins.families);
      }
    } catch (error) {
      console.error('Error toggling pin:', error);
      toast.error('Failed to update pin');
    }
  };

  const handleCreateRenewalCSP = (family, customerName, carrierName) => {
    const firstVersion = family.versions[0];
    setRenewalFamilyData({
      customerId: firstVersion.customer_id,
      customerName: customerName,
      carrierId: firstVersion.carrier_ids?.[0] || firstVersion.carrier_id,
      carrierName: carrierName,
      mode: firstVersion.mode,
      ownershipType: firstVersion.ownership_type,
      familyId: family.familyId,
      expiryDate: firstVersion.expiry_date
    });
    setShowRenewalDialog(true);
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

  const getOwnershipBadge = (tariff) => {
    const ownershipType = OWNERSHIP_TYPES.find(t => t.value === tariff.ownership_type);

    if (tariff.ownership_type === 'rocket_csp' && tariff.rocket_csp_subtype) {
      const subtypeLabels = {
        'rocket_owned': 'Owned',
        'blanket': 'Blanket',
        'care_of': 'C/O'
      };
      const subtypeLabel = subtypeLabels[tariff.rocket_csp_subtype] || '';

      return (
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
            Rocket CSP
          </Badge>
          {subtypeLabel && (
            <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300 text-xs font-semibold">
              {subtypeLabel}
            </Badge>
          )}
        </div>
      );
    }

    return (
      <Badge variant="outline" className={`${ownershipType?.color.includes('purple') ? 'bg-purple-50 text-purple-700 border-purple-200' : ownershipType?.color.includes('blue') ? 'bg-blue-50 text-blue-700 border-blue-200' : ownershipType?.color.includes('orange') ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-green-50 text-green-700 border-green-200'} text-xs`}>
        {ownershipType?.label}
      </Badge>
    );
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
            <p>Created outside a CSP Event</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const totalCount = groupedTariffs.reduce((sum, g) => sum + Object.values(g.families || {}).reduce((familySum, family) => familySum + (family.versions?.length || 0), 0), 0);

  const getTabCounts = useMemo(() => {
    const counts = {};
    OWNERSHIP_TYPES.forEach(type => {
      const filteredByOwnership = tariffs.filter(t => {
        if (t.ownership_type !== type.value) return false;

        const customer = customers.find(c => c.id === t.customer_id);

        if (selectedCustomerIds.size > 0 && !selectedCustomerIds.has(t.customer_id)) {
          return false;
        }

        if (myAccountsOnly && customer && userProfile) {
          const isOwner = customer.csp_owner_id === userProfile.id;
          const isCollaborator = customer.collaborators?.includes(userProfile.id);
          if (!isOwner && !isCollaborator) return false;
        }

        if (serviceTypeFilter !== 'all' && t.mode !== serviceTypeFilter) return false;

        return true;
      });

      const uniqueFamilies = new Set(filteredByOwnership.map(t => t.tariff_family_id || t.id));
      counts[type.value] = uniqueFamilies.size;
    });
    return counts;
  }, [tariffs, customers, selectedCustomerIds, myAccountsOnly, userProfile, serviceTypeFilter]);

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
          <IfHasPermission permission="tariffs.create">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <PlusCircle className="w-4 h-4 mr-2" />
                  New Tariff
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => navigate(createPageUrl('TariffUpload'))}>
                  <Upload className="w-4 h-4 mr-2" />
                  <div>
                    <div className="font-medium">Manual Upload</div>
                    <div className="text-xs text-slate-500">Upload tariff without CSP</div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate(createPageUrl('Pipeline'))}>
                  <Link2 className="w-4 h-4 mr-2" />
                  <div>
                    <div className="font-medium">Create from CSP</div>
                    <div className="text-xs text-slate-500">Link to a CSP event</div>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={serviceTypeFilter !== 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    const currentIndex = SERVICE_TYPE_FILTERS.findIndex(f => f.value === serviceTypeFilter);
                    const nextIndex = (currentIndex + 1) % SERVICE_TYPE_FILTERS.length;
                    setServiceTypeFilter(SERVICE_TYPE_FILTERS[nextIndex].value);
                  }}
                  className="h-8 flex items-center gap-1"
                >
                  <Package className="w-3.5 h-3.5" />
                  Service Type
                  {serviceTypeFilter !== 'all' && (
                    <>
                      : {SERVICE_TYPE_FILTERS.find(f => f.value === serviceTypeFilter)?.label}
                      <X className="w-3 h-3 ml-1" onClick={(e) => { e.stopPropagation(); setServiceTypeFilter('all'); }} />
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Filter by service type (LTL, Home Delivery LTL)</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Popover open={customerFilterOpen} onOpenChange={setCustomerFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={selectedCustomerIds.size > 0 ? 'default' : 'outline'}
                size="sm"
                className="h-8 flex items-center gap-1"
              >
                <Briefcase className="w-3.5 h-3.5" />
                Customer
                {selectedCustomerIds.size > 0 && (
                  <>
                    : {selectedCustomerIds.size} selected
                    <X
                      className="w-3 h-3 ml-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCustomerIds(new Set());
                      }}
                    />
                  </>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search customers..." />
                <CommandList>
                  <CommandEmpty>No customers found.</CommandEmpty>
                  <CommandGroup>
                    {customers.map((customer) => (
                      <CommandItem
                        key={customer.id}
                        onSelect={() => {
                          const newSelection = new Set(selectedCustomerIds);
                          if (newSelection.has(customer.id)) {
                            newSelection.delete(customer.id);
                          } else {
                            newSelection.add(customer.id);
                          }
                          setSelectedCustomerIds(newSelection);
                        }}
                      >
                        <CheckCircle
                          className={`mr-2 h-4 w-4 ${
                            selectedCustomerIds.has(customer.id)
                              ? 'opacity-100'
                              : 'opacity-0'
                          }`}
                        />
                        {customer.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={myAccountsOnly ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMyAccountsOnly(!myAccountsOnly)}
                  className="h-8 flex items-center gap-1"
                >
                  <User className="w-3.5 h-3.5" />
                  My Accounts
                </Button>
              </TooltipTrigger>
              <TooltipContent>Show only accounts you manage</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const currentIndex = SORT_OPTIONS.findIndex(o => o.value === sortBy);
                    const nextIndex = (currentIndex + 1) % SORT_OPTIONS.length;
                    setSortBy(SORT_OPTIONS[nextIndex].value);
                  }}
                  className="h-8 flex items-center gap-1"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  Sort: {SORT_OPTIONS.find(o => o.value === sortBy)?.label}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Sort families by expiry date, customer name, or activity</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {showSearchSuggestion && suggestedCustomer && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex-1 text-sm text-blue-900">
              Filter to customer: <span className="font-semibold">{suggestedCustomer.name}</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedCustomerIds(new Set([suggestedCustomer.id]));
                setShowSearchSuggestion(false);
                setSearchTerm('');
              }}
            >
              Apply Filter
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowSearchSuggestion(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      <Tabs value={ownershipTab} onValueChange={handleTabChange} className="mb-6">
        <TabsList className="grid w-full grid-cols-4 h-auto p-2">
          {OWNERSHIP_TYPES.map(type => {
            const count = getTabCounts[type.value] || 0;
            const isActive = ownershipTab === type.value;
            return (
              <TooltipProvider key={type.value}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <TabsTrigger
                      value={type.value}
                      className="py-3 flex items-center gap-2 data-[state=active]:bg-white"
                      style={isActive ? { border: '4px solid rgb(209, 213, 219)' } : {}}
                    >
                      <span>{type.label}</span>
                      <Badge variant="secondary" className="text-xs">
                        {count}
                      </Badge>
                    </TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent>{type.tooltip}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </TabsList>
      </Tabs>

      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.map(filter => (
            <TooltipProvider key={filter.value}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={statusFilter === filter.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleStatusFilterChange(filter.value)}
                    className="h-8"
                  >
                    {filter.label}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{filter.tooltip}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
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
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
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
              </TooltipTrigger>
              <TooltipContent>Show all historical tariff families</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <Card>
        <CardHeader className="sticky top-0 bg-white z-10 border-b">
          <CardTitle className="text-lg flex items-center justify-between">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className={`text-sm border-4 border-blue-600 ${OWNERSHIP_TYPES.find(t => t.value === ownershipTab)?.color.replace('bg-', 'bg-').replace('border-l-4 border-l-', 'border-')}`}>
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
            <div className="flex items-center gap-2">
              {selectedForCompare.length === 2 && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    navigate(createPageUrl(`TariffDetail?id=${selectedForCompare[0]}&compare=${selectedForCompare[1]}`));
                    setSelectedForCompare([]);
                  }}
                  className="h-8 flex items-center gap-2"
                >
                  <GitCompare className="w-3.5 h-3.5" />
                  Compare Selected
                </Button>
              )}
              {selectedForCompare.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedForCompare([])}
                  className="h-8"
                >
                  Clear ({selectedForCompare.length})
                </Button>
              )}

              <div className="flex items-center gap-2 border-l pl-2 ml-2">
                <span className="text-xs text-slate-600 font-medium">Group by:</span>
                <Button
                  variant={viewMode === 'family' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('family')}
                  className="h-8"
                >
                  Family
                </Button>
                <Button
                  variant={viewMode === 'customer' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('customer')}
                  className="h-8"
                >
                  Customer
                </Button>
              </div>

              <div className="flex items-center gap-1 border-l pl-2 ml-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleExpandAll}
                        className="h-8 px-2"
                      >
                        <ChevronsDown className="w-3.5 h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Expand All</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCollapseAll}
                        className="h-8 px-2"
                      >
                        <ChevronsUp className="w-3.5 h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Collapse All</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={exportToCSV}
                      className="h-8 flex items-center gap-2"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      Export CSV
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Export visible tariffs to CSV</TooltipContent>
                </Tooltip>
              </TooltipProvider>
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
                              togglePin('customer', group.key);
                            }}
                          >
                            <Star className={`w-3 h-3 mr-1 ${isPinned ? 'fill-blue-600' : ''}`} />
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
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(createPageUrl(`CustomerDetail?id=${group.key}`));
                              }}
                            >
                              <FileText className="w-3 h-3 mr-1" />
                              View Customer
                            </Button>
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
                                <th className="text-center p-3 text-xs font-semibold text-slate-600 w-10">
                                  <input type="checkbox" className="w-3.5 h-3.5" disabled />
                                </th>
                                <th className="text-left p-3 text-xs font-semibold text-slate-600">
                                  <button
                                    onClick={() => handleSort('version')}
                                    className="flex items-center gap-1 hover:text-slate-900 transition-colors"
                                  >
                                    Tariff ID
                                    {sortColumn === 'version' && (
                                      <ArrowUpDown className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                                    )}
                                  </button>
                                </th>
                                <th className="text-left p-3 text-xs font-semibold text-slate-600">
                                  <button
                                    onClick={() => handleSort('status')}
                                    className="flex items-center gap-1 hover:text-slate-900 transition-colors"
                                  >
                                    Status
                                    {sortColumn === 'status' && (
                                      <ArrowUpDown className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                                    )}
                                  </button>
                                </th>
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
                            <tbody className="divide-y divide-slate-100">
                        {(() => {
                          const families = Object.values(group.families || {});
                          const liveFamily = families.filter(f => !f.isArchived);
                          const archivedFamily = families.filter(f => f.isArchived);
                          let firstArchived = true;

                          return [...liveFamily, ...archivedFamily].map(family => {
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
                            const isArchived = family.isArchived;
                            const showDivider = isArchived && firstArchived;
                            if (isArchived) firstArchived = false;

                            return (
                            <React.Fragment key={family.familyId}>
                              {showDivider && (
                                <tr>
                                  <td colSpan="8" className="p-3 bg-slate-100 border-t-4 border-slate-300">
                                    <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                                      <div className="h-px flex-1 bg-slate-300"></div>
                                      <span>Archived Families (Expired/Superseded)</span>
                                      <div className="h-px flex-1 bg-slate-300"></div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                              {family.versions.length >= 1 && (
                                <tr className={`border-b border-slate-200 border-l-4 ${getOwnershipBorderColor(ownershipTab)} ${isArchived ? 'bg-slate-50/50' : ''} ${isFamilyCollapsed ? 'hover:bg-slate-50' : isArchived ? 'bg-slate-100/60' : 'bg-gradient-to-r from-slate-50 to-slate-100'}`}>
                                <td colSpan="8" className={`${isFamilyCollapsed ? 'py-1.5 px-3' : 'py-3 px-4'}`}>
                                  {isFamilyCollapsed ? (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="flex items-center gap-2 text-sm cursor-pointer" onClick={() => toggleFamily(family.familyId)}>
                                            <button className="hover:bg-slate-200 rounded p-0.5 transition-colors">
                                              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                                            </button>
                                            <span className="font-semibold text-slate-900">
                                              {group.name} × {family.carrierName}
                                            </span>
                                            {isArchived && (
                                              <Badge variant="outline" className="bg-slate-200 text-slate-600 border-slate-400 text-xs h-5">
                                                Expired Family
                                              </Badge>
                                            )}
                                            {activeVersion && (
                                              <>
                                                <span className="text-slate-500">|</span>
                                                <span className="font-medium text-slate-700">{activeVersion.tariff_reference_id} Active</span>
                                              </>
                                            )}
                                            {expiringVersion && (
                                              <>
                                                <span className="text-slate-500">|</span>
                                                <Clock className="w-3 h-3 text-yellow-600" />
                                                <span className="text-yellow-700 font-medium">
                                                  {differenceInDays(new Date(expiringVersion.expiry_date), new Date())}d to expiry
                                                </span>
                                              </>
                                            )}
                                            {proposedVersion && (
                                              <>
                                                <span className="text-slate-500">|</span>
                                                <span className="text-blue-700 font-medium">Next {proposedVersion.tariff_reference_id}</span>
                                              </>
                                            )}
                                            {ownershipTab === 'rocket_csp' && (
                                              <>
                                                <span className="text-slate-500">|</span>
                                                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs h-5">
                                                  Rocket CSP
                                                </Badge>
                                              </>
                                            )}
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-md">
                                          <div className="space-y-1 text-xs">
                                            <div><span className="font-medium">Family ID:</span> {family.familyId.slice(0, 8).toUpperCase()}</div>
                                            {cspEvent && <div><span className="font-medium">Created via:</span> {cspEvent.title}</div>}
                                            {mostRecentUpdate && <div><span className="font-medium">Last Updated:</span> {format(new Date(mostRecentUpdate), 'MMM d, yyyy')}</div>}
                                          </div>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  ) : (
                                    <div className="flex items-start justify-between gap-4">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                          <button
                                            onClick={() => toggleFamily(family.familyId)}
                                            className="hover:bg-slate-200 rounded p-0.5 transition-colors"
                                          >
                                            <ChevronDown className="w-4 h-4 text-slate-600" />
                                          </button>
                                          {family.isPinned && <Star className="w-3.5 h-3.5 text-blue-600 fill-blue-600" />}
                                          <FolderOpen className="w-4 h-4 text-slate-600" />
                                          {(() => {
                                            let ownerProfile = null;
                                            let ownerName = 'System';
                                            let ownerRole = 'System';

                                            if (cspEvent?.csp_owner_id) {
                                              ownerProfile = userProfiles.find(u => u.id === cspEvent.csp_owner_id);
                                              if (ownerProfile) {
                                                ownerName = `${ownerProfile.first_name} ${ownerProfile.last_name}`;
                                                ownerRole = 'CSP Owner';
                                              }
                                            } else if (firstVersion?.updated_by) {
                                              ownerProfile = userProfiles.find(u => u.id === firstVersion.updated_by);
                                              if (ownerProfile) {
                                                ownerName = `${ownerProfile.first_name} ${ownerProfile.last_name}`;
                                                ownerRole = 'Last Updated By';
                                              }
                                            }

                                            const initials = ownerName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                                            const bgColor = cspEvent ? 'bg-purple-500' : 'bg-slate-400';
                                            const textColor = 'text-white';

                                            return (
                                              <TooltipProvider>
                                                <Tooltip>
                                                  <TooltipTrigger asChild>
                                                    <div className={`w-7 h-7 rounded-full ${bgColor} flex items-center justify-center text-xs font-semibold ${textColor} shadow-sm`}>
                                                      {initials}
                                                    </div>
                                                  </TooltipTrigger>
                                                  <TooltipContent>
                                                    <div className="text-xs space-y-1">
                                                      <div className="font-semibold">Owner: {ownerName}</div>
                                                      <div className="text-slate-500">Role: {ownerRole}</div>
                                                      {mostRecentUpdate && (
                                                        <div className="text-slate-400">
                                                          Last Updated: {format(new Date(mostRecentUpdate), 'MMM d, yyyy')}
                                                        </div>
                                                      )}
                                                    </div>
                                                  </TooltipContent>
                                                </Tooltip>
                                              </TooltipProvider>
                                            );
                                          })()}
                                          <span className="font-semibold text-sm text-slate-900">
                                            Tariff Family: {group.name} × {family.carrierName}
                                          </span>
                                          {(ownershipTab === 'rocket_blanket' || ownershipTab === 'priority1_blanket') && (() => {
                                            const firstVersion = family.versions[0];
                                            const customerCount = firstVersion?.customer_ids?.length || 0;
                                            return (
                                              <TooltipProvider>
                                                <Tooltip>
                                                  <TooltipTrigger asChild>
                                                    <button
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        const carrier = carriers.find(c => c.id === firstVersion?.carrier_id);
                                                        setBlanketUsageDrawer({ isOpen: true, tariff: firstVersion, carrier });
                                                      }}
                                                      className="text-xs px-2 py-1 rounded bg-orange-100 text-orange-700 hover:bg-orange-200 font-medium transition-colors flex items-center gap-1"
                                                    >
                                                      📚 Usage ({customerCount})
                                                    </button>
                                                  </TooltipTrigger>
                                                  <TooltipContent>
                                                    Blanket tariff applied to {customerCount} {customerCount === 1 ? 'customer' : 'customers'} — click to view
                                                  </TooltipContent>
                                                </Tooltip>
                                              </TooltipProvider>
                                            );
                                          })()}
                                          {isArchived && (
                                            <Badge variant="outline" className="bg-slate-200 text-slate-600 border-slate-400 text-xs">
                                              Expired Family
                                            </Badge>
                                          )}
                                          {ownershipTab === 'rocket_csp' && (
                                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
                                              Rocket CSP
                                            </Badge>
                                          )}
                                          <div className="flex items-center gap-1 ml-2">
                                            {ownershipTab !== 'rocket_blanket' && ownershipTab !== 'priority1_blanket' && (
                                              <button
                                                className="text-xs text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  navigate(createPageUrl(`CustomerDetail?id=${group.key}`));
                                                }}
                                              >
                                                <ArrowUpDown className="w-3 h-3 rotate-90" />
                                                Jump to Customer
                                              </button>
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
                                            {(() => {
                                              const renewalCspId = firstVersion?.renewal_csp_event_id;
                                              const renewalCsp = renewalCspId ? cspEvents.find(e => e.id === renewalCspId) : null;
                                              const isFamilyPinned = userPins.families.has(family.familyId);

                                              return (
                                                <>
                                                  <TooltipProvider>
                                                    <Tooltip>
                                                      <TooltipTrigger asChild>
                                                        <button
                                                          className={`text-xs hover:underline flex items-center gap-1 ${isFamilyPinned ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            togglePin('tariff_family', family.familyId);
                                                          }}
                                                        >
                                                          <Star className={`w-3 h-3 ${isFamilyPinned ? 'fill-blue-600' : ''}`} />
                                                          {isFamilyPinned ? 'Pinned' : 'Pin Family'}
                                                        </button>
                                                      </TooltipTrigger>
                                                      <TooltipContent>
                                                        {isFamilyPinned ? 'Unpin this family' : 'Pin this family to the top'}
                                                      </TooltipContent>
                                                    </Tooltip>
                                                  </TooltipProvider>
                                                  {renewalCsp ? (
                                                    <RenewalStatusBadge renewalCspEvent={renewalCsp} />
                                                  ) : expiringVersion && !isArchived ? (
                                                    <TooltipProvider>
                                                      <Tooltip>
                                                        <TooltipTrigger asChild>
                                                          <button
                                                            className="text-xs text-purple-600 hover:text-purple-700 hover:underline flex items-center gap-1 font-medium"
                                                            onClick={(e) => {
                                                              e.stopPropagation();
                                                              handleCreateRenewalCSP(family, group.name, family.carrierName);
                                                            }}
                                                          >
                                                            <Repeat className="w-3 h-3" />
                                                            Create Renewal CSP
                                                          </button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                          Start a renewal negotiation for this expiring tariff
                                                        </TooltipContent>
                                                      </Tooltip>
                                                    </TooltipProvider>
                                                  ) : null}
                                                </>
                                              );
                                            })()}
                                          </div>
                                        </div>
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <div className="flex items-center gap-1 text-xs text-slate-500 opacity-60 hover:opacity-100 transition-opacity cursor-help">
                                                <Briefcase className="w-3 h-3" />
                                                <span>Family ID: {family.familyId.slice(0, 8).toUpperCase()}</span>
                                              </div>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              <p>Family ID: {family.familyId}</p>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
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
                                          <span className="text-slate-500 font-medium">Active Tariff</span>
                                          <span className="text-slate-900 font-semibold">{activeVersion.tariff_reference_id}</span>
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
                                          <span className="text-blue-700 font-semibold">{proposedVersion.tariff_reference_id}</span>
                                        </div>
                                      )}
                                      {cspEvent && (
                                        <div className="flex flex-col gap-1">
                                          <span className="text-slate-500 font-medium">Created via</span>
                                          <Link
                                            to={createPageUrl(`CspEventDetail?id=${cspEvent.id}`)}
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
                                    </div>
                                  </div>
                                  )}
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
                              const sopCount = sopCounts[tariff.id] || 0;
                              const effectiveDate = tariff.effective_date ? new Date(tariff.effective_date) : null;
                              const daysActive = effectiveDate && tariff.status === 'active' ? differenceInDays(today, effectiveDate) : null;

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
                                <td className="p-3 text-center">
                                  <input
                                    type="checkbox"
                                    className="w-3.5 h-3.5 cursor-pointer"
                                    checked={selectedForCompare.includes(tariff.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        if (selectedForCompare.length < 2) {
                                          setSelectedForCompare([...selectedForCompare, tariff.id]);
                                        }
                                      } else {
                                        setSelectedForCompare(selectedForCompare.filter(id => id !== tariff.id));
                                      }
                                    }}
                                    disabled={selectedForCompare.length >= 2 && !selectedForCompare.includes(tariff.id)}
                                  />
                                </td>
                                <td className="p-3">
                                  <div className="flex items-center gap-2">
                                    <Link
                                      to={createPageUrl(`TariffDetail?id=${tariff.id}`)}
                                      className="text-slate-900 hover:text-blue-600 hover:underline"
                                    >
                                      {tariff.tariff_reference_id || 'No ID'}
                                    </Link>
                                    {sopCount > 0 && (
                                      <Badge variant="outline" className="text-xs h-5 px-1.5">
                                        <FileText className="h-3 w-3 mr-1" />
                                        {sopCount}
                                      </Badge>
                                    )}
                                    {daysActive !== null && daysActive > 0 && (
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Badge variant="outline" className="text-xs h-5 px-1.5 bg-green-50 text-green-700 border-green-200">
                                              <Clock className="h-3 w-3 mr-1" />
                                              {daysActive}d
                                            </Badge>
                                          </TooltipTrigger>
                                          <TooltipContent>Active for {daysActive} days</TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    )}
                                    {tariff.updated_date && (
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <div className="inline-flex">
                                              <History className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 cursor-pointer" />
                                            </div>
                                          </TooltipTrigger>
                                          <TooltipContent className="max-w-xs">
                                            <div className="text-xs space-y-1">
                                              <div className="font-semibold">Last Activity</div>
                                              <div>Updated {format(new Date(tariff.updated_date), 'MMM d, yyyy')}</div>
                                              {tariff.updated_by && userProfiles.find(u => u.id === tariff.updated_by) && (
                                                <div>by {userProfiles.find(u => u.id === tariff.updated_by).first_name} {userProfiles.find(u => u.id === tariff.updated_by).last_name}</div>
                                              )}
                                            </div>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    )}
                                  </div>
                                </td>
                                <td className="p-3">
                                  {getStatusBadge(tariff)}
                                </td>
                                <td className="p-3">
                                  {getOwnershipBadge(tariff)}
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
                                  <div className={`flex items-center justify-end gap-0.5 transition-opacity ${hoveredRowId === tariff.id ? 'opacity-100' : 'opacity-0'}`}>
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
                                        <TooltipContent>View Details</TooltipContent>
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
                                              <FileText className="w-3.5 h-3.5" />
                                            </Link>
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Docs</TooltipContent>
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
                                              const familyVersions = family.versions.filter(v => v.id !== tariff.id);
                                              if (familyVersions.length > 0) {
                                                navigate(createPageUrl(`TariffDetail?id=${tariff.id}&compare=${familyVersions[0].id}`));
                                              }
                                            }}
                                            disabled={family.versions.length < 2}
                                          >
                                            <GitCompare className="w-3.5 h-3.5" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Compare</TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                    {(() => {
                                      const renewalCspId = tariff.renewal_csp_event_id;
                                      const hasRenewalCsp = renewalCspId && cspEvents.find(e => e.id === renewalCspId);
                                      const today = new Date();
                                      const expiryDate = tariff.expiry_date ? new Date(tariff.expiry_date) : null;
                                      const daysUntilExpiry = expiryDate ? differenceInDays(expiryDate, today) : null;
                                      const isExpiring = expiryDate && daysUntilExpiry !== null && daysUntilExpiry <= 90 && daysUntilExpiry > 0;

                                      if (!hasRenewalCsp && isExpiring) {
                                        return (
                                          <TooltipProvider>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  className="h-7 w-7 text-purple-600 hover:text-purple-700"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleCreateRenewalCSP(family, group.name, family.carrierName);
                                                  }}
                                                >
                                                  <Repeat className="w-3.5 h-3.5" />
                                                </Button>
                                              </TooltipTrigger>
                                              <TooltipContent>Renew</TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                        );
                                      }
                                      return null;
                                    })()}
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7"
                                        >
                                          <MoreVertical className="w-3.5 h-3.5" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="w-48">
                                        <DropdownMenuItem onClick={() => handleEditTariff(tariff)}>
                                          <Edit className="w-4 h-4 mr-2" />
                                          Edit Details
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        {tariff.status !== 'active' && (
                                          <DropdownMenuItem onClick={() => handleChangeStatus(tariff.id, 'active')}>
                                            <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                                            Mark as Active
                                          </DropdownMenuItem>
                                        )}
                                        {tariff.status !== 'proposed' && (
                                          <DropdownMenuItem onClick={() => handleChangeStatus(tariff.id, 'proposed')}>
                                            <Clock className="w-4 h-4 mr-2 text-blue-600" />
                                            Mark as Proposed
                                          </DropdownMenuItem>
                                        )}
                                        {tariff.status !== 'expired' && (
                                          <DropdownMenuItem onClick={() => handleChangeStatus(tariff.id, 'expired')}>
                                            <AlertCircle className="w-4 h-4 mr-2 text-slate-600" />
                                            Mark as Expired
                                          </DropdownMenuItem>
                                        )}
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          onClick={() => handleDeleteTariff(tariff.id, tariff.tariff_reference_id)}
                                          className="text-red-600 focus:text-red-600"
                                        >
                                          <Trash2 className="w-4 h-4 mr-2" />
                                          Delete Tariff
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </td>
                              </tr>
                              {isExpanded && (
                                <tr className={`${getRowColorClass(tariff)}`}>
                                  <td colSpan="8" className="px-4 py-2 bg-slate-50/50 border-b last:border-b-0">
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
                                    <td colSpan="8" className="p-2 text-center bg-slate-50 border-b">
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
                          });
                        })()}
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

      <CreateAwardedCspDialog
        isOpen={showCspDialog}
        onOpenChange={setShowCspDialog}
        onCspCreated={(cspEvent) => {
          setNewTariffCspEvent(cspEvent);
          setShowNewTariffDialog(true);
        }}
      />

      {showNewTariffDialog && newTariffCspEvent && (
        <EditTariffDialog
          isOpen={showNewTariffDialog}
          onOpenChange={setShowNewTariffDialog}
          tariff={null}
          customers={customers}
          carriers={carriers}
          cspEvents={cspEvents}
          preselectedCspEventId={newTariffCspEvent.id}
          preselectedCustomerId={newTariffCspEvent.customer_id}
          preselectedCarrierIds={newTariffCspEvent.carrier_ids || []}
          preselectedFile={newTariffCspEvent.file}
          onSuccess={() => {
            setShowNewTariffDialog(false);
            setNewTariffCspEvent(null);
          }}
        />
      )}

      {showRenewalDialog && renewalFamilyData && (
        <CreateAwardedCspDialog
          isOpen={showRenewalDialog}
          onOpenChange={setShowRenewalDialog}
          preselectedCustomerId={renewalFamilyData.customerId}
          onCspCreated={async (cspEvent) => {
            try {
              // Set the related_tariff_family_id on the new CSP
              await supabase
                .from('csp_events')
                .update({ related_tariff_family_id: renewalFamilyData.familyId })
                .eq('id', cspEvent.id);

              // Set renewal_csp_event_id on all tariffs in this family
              await supabase
                .from('tariffs')
                .update({ renewal_csp_event_id: cspEvent.id })
                .eq('tariff_family_id', renewalFamilyData.familyId);

              // Log the renewal activity
              await supabase
                .from('tariff_activities')
                .insert({
                  tariff_family_id: renewalFamilyData.familyId,
                  csp_event_id: cspEvent.id,
                  activity_type: 'renewal_csp_created',
                  title: `Renewal CSP created: ${cspEvent.title}`,
                  description: `Renewal negotiation started for expiring tariff family`,
                  user_id: userProfile?.id,
                  user_name: userProfile?.full_name,
                  metadata: {
                    csp_event_id: cspEvent.id,
                    original_family_id: renewalFamilyData.familyId,
                    expiry_date: renewalFamilyData.expiryDate
                  }
                });

              toast.success(`Renewal CSP created: ${cspEvent.title}`);
              navigate(createPageUrl(`CspEventDetail?id=${cspEvent.id}`));
            } catch (error) {
              console.error('Error setting renewal linkage:', error);
              toast.error('CSP created but failed to link to tariff family');
            } finally {
              setShowRenewalDialog(false);
              setRenewalFamilyData(null);
            }
          }}
        />
      )}

      {showEditDialog && editingTariff && (
        <EditTariffDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          tariff={editingTariff}
        />
      )}

      <BlanketUsageDrawer
        isOpen={blanketUsageDrawer.isOpen}
        onOpenChange={(isOpen) => setBlanketUsageDrawer({ isOpen, tariff: null, carrier: null })}
        tariff={blanketUsageDrawer.tariff}
        carrier={blanketUsageDrawer.carrier}
      />
    </div>
  );
}
