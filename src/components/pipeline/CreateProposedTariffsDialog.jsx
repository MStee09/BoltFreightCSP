import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Customer } from '../../api/entities';
import { supabase } from '../../api/supabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import { useToast } from '../ui/use-toast';
import { Award, CheckCircle, FileText } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';
import { Calendar as CalendarIcon } from 'lucide-react';

export default function CreateProposedTariffsDialog({ cspEvent, awardedCarriers, open, onOpenChange }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: customer } = useQuery({
    queryKey: ['customer', cspEvent?.customer_id],
    queryFn: () => Customer.get(cspEvent.customer_id),
    enabled: !!cspEvent?.customer_id && open
  });

  const [selectedCarrierIds, setSelectedCarrierIds] = useState(
    new Set(awardedCarriers.map(c => c.carrier_id))
  );

  const [effectiveDate, setEffectiveDate] = useState(null);
  const [expiryDate, setExpiryDate] = useState(null);
  const [tariffPrefix, setTariffPrefix] = useState('');

  const toggleCarrier = (carrierId) => {
    const newSet = new Set(selectedCarrierIds);
    if (newSet.has(carrierId)) {
      newSet.delete(carrierId);
    } else {
      newSet.add(carrierId);
    }
    setSelectedCarrierIds(newSet);
  };

  const createProposedTariffsMutation = useMutation({
    mutationFn: async () => {
      const selectedCarriers = awardedCarriers.filter(c => selectedCarrierIds.has(c.carrier_id));

      if (selectedCarriers.length === 0) {
        throw new Error('Please select at least one carrier');
      }

      const results = [];

      for (const carrierAssignment of selectedCarriers) {
        const { carrier_id } = carrierAssignment;

        const familyPayload = {
          customer_id: cspEvent.customer_id,
          carrier_id: carrier_id,
          ownership_type: 'primary'
        };

        const { data: existingFamily } = await supabase
          .from('tariff_families')
          .select('*')
          .eq('customer_id', cspEvent.customer_id)
          .eq('carrier_id', carrier_id)
          .eq('ownership_type', 'primary')
          .maybeSingle();

        let familyId;
        if (existingFamily) {
          familyId = existingFamily.id;
        } else {
          const { data: newFamily, error: familyError } = await supabase
            .from('tariff_families')
            .insert([familyPayload])
            .select()
            .single();

          if (familyError) throw familyError;
          familyId = newFamily.id;
        }

        const carrierName = carrierAssignment.carrier?.name || 'Unknown';
        const customerName = cspEvent.customer?.name || 'Unknown';

        const tariffName = tariffPrefix
          ? `${tariffPrefix} - ${carrierName}`
          : `${customerName} - ${carrierName} - ${format(new Date(), 'MMM yyyy')}`;

        const tariffPayload = {
          family_id: familyId,
          name: tariffName,
          status: 'proposed',
          carrier_id: carrier_id,
          customer_ids: [cspEvent.customer_id],
          csp_event_id: cspEvent.id,
          mode: carrierAssignment.lane_scope_json?.mode || cspEvent.mode,
          effective_date: effectiveDate?.toISOString(),
          expiry_date: expiryDate?.toISOString(),
          tentative_effective_date: effectiveDate?.toISOString(),
          tentative_expiry_date: expiryDate?.toISOString()
        };

        const { data: newTariff, error: tariffError } = await supabase
          .from('tariffs')
          .insert([tariffPayload])
          .select()
          .single();

        if (tariffError) throw tariffError;

        const { error: updateError } = await supabase
          .from('csp_event_carriers')
          .update({ proposed_tariff_id: newTariff.id })
          .eq('id', carrierAssignment.id);

        if (updateError) throw updateError;

        results.push({
          carrier: carrierName,
          tariff: newTariff
        });
      }

      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries(['csp_event_carriers']);
      queryClient.invalidateQueries(['tariffs']);
      queryClient.invalidateQueries(['tariff_families']);

      toast({
        title: 'Proposed Tariffs Created',
        description: `Successfully created ${results.length} proposed tariff${results.length > 1 ? 's' : ''}.`,
      });

      onOpenChange(false);

      setSelectedCarrierIds(new Set());
      setEffectiveDate(null);
      setExpiryDate(null);
      setTariffPrefix('');
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create proposed tariffs',
        variant: 'destructive',
      });
    }
  });

  const handleSubmit = () => {
    createProposedTariffsMutation.mutate();
  };

  const selectedCount = selectedCarrierIds.size;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-green-600" />
            <DialogTitle>Create Awarded Tariff(s)</DialogTitle>
          </div>
          <DialogDescription>
            Create proposed tariffs for awarded carriers in this CSP event. Each tariff will be linked to its tariff family and appear on the Tariffs page.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="space-y-1">
                <div className="font-medium text-blue-900">CSP Event: {cspEvent?.title}</div>
                <div className="text-sm text-blue-700">
                  Customer: {customer?.name || 'Loading...'}
                </div>
              </div>
            </div>
          </div>

          <div>
            <Label className="text-base font-semibold mb-3 block">
              Select Awarded Carriers ({selectedCount} of {awardedCarriers.length})
            </Label>
            <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3">
              {awardedCarriers.map((carrierAssignment) => {
                const carrier = carrierAssignment.carrier;
                const isSelected = selectedCarrierIds.has(carrierAssignment.carrier_id);

                return (
                  <div
                    key={carrierAssignment.id}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-md border-2 transition-colors cursor-pointer",
                      isSelected
                        ? "bg-green-50 border-green-300"
                        : "bg-slate-50 border-slate-200 hover:border-slate-300"
                    )}
                    onClick={() => toggleCarrier(carrierAssignment.carrier_id)}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleCarrier(carrierAssignment.carrier_id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{carrier?.name || 'Unknown Carrier'}</div>
                      {carrierAssignment.lane_scope_json && (
                        <div className="text-xs text-slate-600 mt-1">
                          {carrierAssignment.lane_scope_json.mode && (
                            <span className="font-medium">{carrierAssignment.lane_scope_json.mode}</span>
                          )}
                          {carrierAssignment.lane_scope_json.origin && (
                            <span> | {carrierAssignment.lane_scope_json.origin}</span>
                          )}
                          {carrierAssignment.lane_scope_json.destination && (
                            <span> → {carrierAssignment.lane_scope_json.destination}</span>
                          )}
                        </div>
                      )}
                      {carrierAssignment.awarded_at && (
                        <div className="text-xs text-slate-500 mt-1">
                          Awarded: {format(new Date(carrierAssignment.awarded_at), 'MMM d, yyyy')}
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t">
            <div>
              <Label htmlFor="tariffPrefix">Tariff Name Prefix (Optional)</Label>
              <Input
                id="tariffPrefix"
                value={tariffPrefix}
                onChange={(e) => setTariffPrefix(e.target.value)}
                placeholder="e.g., Q1 2025 LTL Rate"
              />
              <p className="text-xs text-slate-500 mt-1">
                If provided, tariff names will be: [Prefix] - [Carrier Name]
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tentative Effective Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !effectiveDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {effectiveDate ? format(effectiveDate, 'PPP') : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={effectiveDate}
                      onSelect={setEffectiveDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label>Tentative Expiry Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !expiryDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {expiryDate ? format(expiryDate, 'PPP') : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={expiryDate}
                      onSelect={setExpiryDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 border rounded-lg p-3 text-sm">
            <div className="font-medium mb-2">What happens next:</div>
            <ul className="space-y-1 text-slate-600">
              <li>• Tariff families will be resolved/created for each carrier</li>
              <li>• Proposed tariffs will be created with status "Proposed"</li>
              <li>• Tariffs will link back to this CSP event and carrier assignments</li>
              <li>• Tariffs will appear on the Tariffs page as "Next Proposed"</li>
              <li>• You can activate them later when ready</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createProposedTariffsMutation.isPending || selectedCount === 0}
            className="bg-green-600 hover:bg-green-700"
          >
            {createProposedTariffsMutation.isPending
              ? 'Creating...'
              : `Create ${selectedCount} Proposed Tariff${selectedCount !== 1 ? 's' : ''}`
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
