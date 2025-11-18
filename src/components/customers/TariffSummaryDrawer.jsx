import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Carrier, Document } from "../../api/entities";
import { supabase } from "../../api/supabaseClient";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "../ui/sheet";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { format, differenceInDays } from "date-fns";
import { Calendar, FileText, Building2, Clock, ExternalLink, Download } from "lucide-react";
import { createPageUrl } from "../../utils";
import { useNavigate } from "react-router-dom";

export default function TariffSummaryDrawer({ isOpen, onOpenChange, tariff }) {
  const navigate = useNavigate();

  const { data: carrier } = useQuery({
    queryKey: ["carrier", tariff?.carrier_id],
    queryFn: async () => {
      if (!tariff?.carrier_id) return null;
      const carriers = await Carrier.list();
      return carriers.find(c => c.id === tariff.carrier_id);
    },
    enabled: !!tariff?.carrier_id
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["tariff_documents", tariff?.id],
    queryFn: async () => {
      if (!tariff?.id) return [];
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("entity_type", "tariff")
        .eq("entity_id", tariff.id)
        .order("created_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tariff?.id
  });

  if (!tariff) return null;

  const today = new Date();
  const expiryDate = tariff.expiry_date ? new Date(tariff.expiry_date) : null;
  const daysUntilExpiry = expiryDate ? differenceInDays(expiryDate, today) : null;

  const getStatusBadge = () => {
    if (tariff.status === 'expired' || (expiryDate && daysUntilExpiry !== null && daysUntilExpiry < 0)) {
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

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-xl">Tariff Summary</SheetTitle>
          <SheetDescription>
            Quick overview of tariff details
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-slate-500 mb-1">Tariff ID</div>
              <div className="text-lg font-semibold text-slate-900">
                {tariff.tariff_reference_id || 'No ID'}
              </div>
            </div>
            {getStatusBadge()}
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                <Building2 className="w-4 h-4" />
                Carrier
              </div>
              <div className="font-medium text-slate-900">
                {carrier?.name || 'Unknown'}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                <Clock className="w-4 h-4" />
                Service Type
              </div>
              <div className="font-medium text-slate-900">
                {tariff.mode || tariff.service_type || 'N/A'}
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                <Calendar className="w-4 h-4" />
                Effective Date
              </div>
              <div className="font-medium text-slate-900">
                {tariff.effective_date ? format(new Date(tariff.effective_date), 'MMM d, yyyy') : 'N/A'}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                <Calendar className="w-4 h-4" />
                Expiry Date
              </div>
              <div className="font-medium text-slate-900">
                {tariff.expiry_date ? format(new Date(tariff.expiry_date), 'MMM d, yyyy') : 'N/A'}
              </div>
            </div>
          </div>

          {tariff.ownership_type && (
            <>
              <Separator />
              <div>
                <div className="text-sm text-slate-500 mb-2">Ownership Type</div>
                <Badge variant="outline" className="text-sm">
                  {tariff.ownership_type === 'rocket_csp' && 'Rocket CSP'}
                  {tariff.ownership_type === 'customer_direct' && 'Customer Direct'}
                  {tariff.ownership_type === 'rocket_blanket' && 'Rocket Blanket'}
                  {tariff.ownership_type === 'priority1_blanket' && 'Priority 1 CSP'}
                </Badge>
              </div>
            </>
          )}

          <Separator />

          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
              <FileText className="w-4 h-4" />
              Linked Documents ({documents.length})
            </div>
            {documents.length > 0 ? (
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {documents.slice(0, 5).map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate text-slate-700">{doc.name}</span>
                    </div>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 flex-shrink-0">
                      <Download className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
                {documents.length > 5 && (
                  <div className="text-xs text-slate-500 text-center">
                    +{documents.length - 5} more documents
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-slate-400 italic">No documents attached</div>
            )}
          </div>

          <Separator />

          <Button
            className="w-full"
            onClick={() => {
              navigate(createPageUrl(`TariffDetail?id=${tariff.id}`));
              onOpenChange(false);
            }}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            View Full Tariff
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
