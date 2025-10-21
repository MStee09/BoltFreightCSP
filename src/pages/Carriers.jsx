
import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Customer, Carrier, Tariff, CSPEvent, Task, Interaction, Alert, Shipment, LostOpportunity, ReportSnapshot } from "../api/entities";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { PlusCircle, Search, ArrowRight } from "lucide-react";
import { Skeleton } from "../components/ui/skeleton";
import { format } from "date-fns";

export default function CarriersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: carriers = [], isLoading } = useQuery({
    queryKey: ["carriers"],
    queryFn: () => Carrier.list("-created_date"),
    initialData: [],
  });
  
  // Assuming 'owner' is the created_by field for now
  const carrierData = useMemo(() => {
      return carriers.map(c => ({
          ...c,
          owner: c.created_by,
          invoice_variance_pct: 1.2, // dummy data
      }));
  }, [carriers]);

  const filteredCarriers = carrierData.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.scac_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
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

      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
        <CardHeader className="border-b border-slate-100 p-4">
          <div className="flex items-center">
            <Search className="h-4 w-4 text-slate-500 mr-2" />
            <Input 
              placeholder="Search carriers by name or SCAC..." 
              className="max-w-sm border-0 focus-visible:ring-0 shadow-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <TableHead>Carrier</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>QBR Next</TableHead>
                <TableHead>On-Time%</TableHead>
                <TableHead>Claims%</TableHead>
                <TableHead>Invoice Variance%</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? Array(5).fill(0).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8 rounded-md" /></TableCell>
                </TableRow>
              )) : filteredCarriers.map(carrier => (
                <TableRow key={carrier.id} className="hover:bg-slate-50/50">
                  <TableCell className="font-medium text-slate-900">{carrier.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {carrier.service_types?.map(st => (
                        <Badge key={st} variant="outline" className="capitalize text-xs">{st.replace('_', ' ')}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>{carrier.next_qbr_date ? format(new Date(carrier.next_qbr_date), "MMM d, yyyy") : 'N/A'}</TableCell>
                  <TableCell>{carrier.on_time_percentage?.toFixed(1)}%</TableCell>
                  <TableCell>{carrier.claims_rate?.toFixed(1)}%</TableCell>
                  <TableCell>{carrier.invoice_variance_pct?.toFixed(1)}%</TableCell>
                  <TableCell>{carrier.owner}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={createPageUrl(`CarrierDetail?id=${carrier.id}`)}>
                        View <ArrowRight className="w-4 h-4 ml-2" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
