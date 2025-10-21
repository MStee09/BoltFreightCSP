
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Customer, Carrier, Tariff, CSPEvent, Task, Interaction, Alert, Shipment, LostOpportunity, ReportSnapshot } from "../api/entities";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { PlusCircle, Search, Upload, GitCompareArrows, ArrowRight, BookMarked } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "../components/ui/skeleton";

export default function TariffsPage() {
  const [searchTerm, setSearchTerm] = useState("");

  // Destructure isLoading for each query to manage individual loading states
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

  // Combine all loading states to determine overall loading for the page
  const isLoading = isTariffsLoading || isCustomersLoading || isCarriersLoading;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>;
      case 'proposed':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Proposed</Badge>;
      case 'expired':
        return <Badge variant="secondary">Expired</Badge>;
      case 'superseded':
          return <Badge variant="outline">Superseded</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getOwnershipBadge = (type) => {
      switch(type) {
          case 'Rocket':
              return <Badge variant="outline" className="text-blue-700 border-blue-200">{type}</Badge>;
          case 'Priority 1':
              return <Badge variant="outline" className="text-amber-700 border-amber-200">{type}</Badge>;
          default:
              return <Badge variant="outline">{type}</Badge>;
      }
  }

  // Filter tariffs only when all necessary data (tariffs, customers, carriers) are loaded or ready
  const filteredTariffs = tariffs.filter(t => {
      // It's safe to call find on `customers` and `carriers` due to `initialData: []`
      // and because the overall `isLoading` check will prevent rendering until they're fetched.
      const customer = customers.find(c => c.id === t.customer_id);
      const searchCarriers = (t.carrier_ids || []).map(cid => carriers.find(c => c.id === cid)?.name).join(' ').toLowerCase() || '';
      const searchTermLower = searchTerm.toLowerCase();

      return (
          (customer?.name?.toLowerCase().includes(searchTermLower)) ||
          searchCarriers.includes(searchTermLower) ||
          (t.version?.toLowerCase().includes(searchTermLower))
      );
  });

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Tariff Workspace</h1>
          <p className="text-slate-600 mt-1">Ingest, analyze, and manage all tariff agreements.</p>
        </div>
        <Button asChild className="bg-blue-600 hover:bg-blue-700">
          <Link to={createPageUrl("TariffUpload")}>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Tariff
          </Link>
        </Button>
      </div>

      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
        <CardHeader className="border-b border-slate-100 p-4">
          <div className="flex items-center">
            <Search className="h-4 w-4 text-slate-500 mr-2" />
            <Input
              placeholder="Search by customer, carrier, or version..."
              className="max-w-sm border-0 focus-visible:ring-0 shadow-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Customer</TableHead>
                <TableHead>Carrier(s)</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Ownership</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Effective Date</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? Array(5).fill(0).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
              )) : filteredTariffs.map(tariff => {
                  const customer = customers.find(c => c.id === tariff.customer_id);
                  // Ensure carrier_ids is an array before mapping
                  const tariffCarriers = (tariff.carrier_ids || []).map(cid => carriers.find(c => c.id === cid)?.name).filter(Boolean) || [];

                  return (
                    <TableRow key={tariff.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-medium text-slate-900">
                        {tariff.is_blanket_tariff ? <span className="flex items-center gap-2"><BookMarked className="w-4 h-4 text-blue-600"/> Blanket Tariff</span> : customer?.name}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {tariffCarriers.slice(0, 2).map(name => <span key={name}>{name}</span>)}
                          {tariffCarriers.length > 2 && <Badge variant="secondary">+{tariffCarriers.length - 2} more</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-slate-600">{tariff.version}</TableCell>
                      <TableCell>{getOwnershipBadge(tariff.ownership_type)}</TableCell>
                      <TableCell>{getStatusBadge(tariff.status)}</TableCell>
                      <TableCell>{format(new Date(tariff.effective_date), "MMM d, yyyy")}</TableCell>
                      <TableCell>{format(new Date(tariff.expiry_date), "MMM d, yyyy")}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                           <Link to={createPageUrl(`TariffDetail?id=${tariff.id}`)}>
                                View <ArrowRight className="w-4 h-4 ml-2" />
                           </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
