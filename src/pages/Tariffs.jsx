import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Customer, Carrier, Tariff } from "../api/entities";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { PlusCircle, Search, Upload, ChevronDown, ChevronRight, AlertCircle } from "lucide-react";
import { format, isAfter, isBefore, differenceInDays } from "date-fns";
import { Skeleton } from "../components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";

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

  const isLoading = isTariffsLoading || isCustomersLoading || isCarriersLoading;

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

  const filteredTariffs = useMemo(() => {
    return tariffs.filter(t => {
      if (t.ownership_type !== ownershipTab) return false;

      const customer = customers.find(c => c.id === t.customer_id);
      const searchCarriers = (t.carrier_ids || []).map(cid => carriers.find(c => c.id === cid)?.name).join(' ').toLowerCase() || '';
      const searchTermLower = searchTerm.toLowerCase();

      const matchesSearch = (
        (customer?.name?.toLowerCase().includes(searchTermLower)) ||
        searchCarriers.includes(searchTermLower) ||
        (t.version?.toLowerCase().includes(searchTermLower))
      );

      if (!matchesSearch) return false;

      const today = new Date();
      const expiryDate = t.expiry_date ? new Date(t.expiry_date) : null;
      const daysUntilExpiry = expiryDate ? differenceInDays(expiryDate, today) : null;

      if (statusFilter === 'all') return true;
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
  }, [tariffs, ownershipTab, statusFilter, searchTerm, customers, carriers]);

  const groupedTariffs = useMemo(() => {
    const groups = {};

    filteredTariffs.forEach(tariff => {
      let groupKey, groupName;

      if (ownershipTab === 'rocket_blanket' || ownershipTab === 'priority1_blanket') {
        const carrier = carriers.find(c => tariff.carrier_ids?.includes(c.id));
        groupKey = carrier?.id || 'unknown';
        groupName = carrier ? `${carrier.name} Blanket` : 'Unknown Carrier';
      } else {
        const customer = customers.find(c => c.id === tariff.customer_id);
        groupKey = customer?.id || 'unknown';
        groupName = customer?.name || 'Unknown Customer';
      }

      if (!groups[groupKey]) {
        groups[groupKey] = {
          name: groupName,
          key: groupKey,
          tariffs: []
        };
      }

      groups[groupKey].tariffs.push(tariff);
    });

    Object.values(groups).forEach(group => {
      group.tariffs.sort((a, b) => {
        const dateA = new Date(a.effective_date || 0);
        const dateB = new Date(b.effective_date || 0);
        return dateB - dateA;
      });
    });

    return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredTariffs, ownershipTab, customers, carriers]);

  const toggleGroup = (groupKey) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedGroups(newExpanded);
  };

  const totalCount = groupedTariffs.reduce((sum, g) => sum + g.tariffs.length, 0);

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

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Tariffs</h1>
          <p className="text-slate-600 mt-1">Manage customer and carrier pricing agreements</p>
        </div>
        <div className="flex gap-3">
          <Link to={createPageUrl("/tariff-upload")}>
            <Button variant="outline">
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </Button>
          </Link>
          <Button>
            <PlusCircle className="w-4 h-4 mr-2" />
            New Tariff
          </Button>
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
        <Input
          placeholder="Search by customer, carrier, or version..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-11"
        />
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
        {expiringCount > 0 && (
          <Badge variant="destructive" className="flex items-center gap-1 bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-100">
            <AlertCircle className="w-3 h-3" />
            {expiringCount} Expiring Soon
          </Badge>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span>{OWNERSHIP_TYPES.find(t => t.value === ownershipTab)?.label}</span>
            <span className="text-sm font-normal text-slate-500">
              {totalCount} {totalCount === 1 ? 'Tariff' : 'Tariffs'}
            </span>
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
            <div className="space-y-4">
              {groupedTariffs.map(group => {
                const isExpanded = expandedGroups.has(group.key);
                return (
                  <div key={group.key} className="border rounded-lg overflow-hidden">
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
                        <span className="font-semibold text-slate-900">{group.name}</span>
                        <Badge variant="outline" className="ml-2">
                          {group.tariffs.length}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const activeCount = group.tariffs.filter(t => {
                            const today = new Date();
                            const expiryDate = t.expiry_date ? new Date(t.expiry_date) : null;
                            return t.status === 'active' && (!expiryDate || isAfter(expiryDate, today));
                          }).length;
                          const expiringCount = group.tariffs.filter(t => {
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
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t">
                        {group.tariffs.map(tariff => {
                          const customer = customers.find(c => c.id === tariff.customer_id);
                          const tariffCarriers = (tariff.carrier_ids || [])
                            .map(id => carriers.find(c => c.id === id))
                            .filter(Boolean);
                          const firstCarrier = tariffCarriers[0];

                          return (
                            <Link
                              key={tariff.id}
                              to={createPageUrl(`TariffDetail?id=${tariff.id}`)}
                              className={`block p-4 hover:bg-slate-50 transition-colors border-b last:border-b-0 ${getOwnershipColor(tariff.ownership_type)}`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0 space-y-2">
                                  <div className="flex items-center gap-3 flex-wrap">
                                    <span className="font-medium text-slate-900">
                                      {tariff.version || 'No Version'}
                                    </span>
                                    {getStatusBadge(tariff)}
                                    {firstCarrier && (
                                      <span className="text-sm text-slate-600">
                                        {firstCarrier.name}
                                        {tariffCarriers.length > 1 && ` +${tariffCarriers.length - 1} more`}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-4 text-sm text-slate-500">
                                    {tariff.effective_date && (
                                      <span>Effective: {format(new Date(tariff.effective_date), 'MMM dd, yyyy')}</span>
                                    )}
                                    {tariff.expiry_date && (
                                      <span>Expires: {format(new Date(tariff.expiry_date), 'MMM dd, yyyy')}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
