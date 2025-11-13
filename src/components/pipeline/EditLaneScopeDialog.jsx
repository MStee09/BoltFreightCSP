import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CSPEventCarrier } from '../../api/entities';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { useToast } from '../ui/use-toast';
import { Loader2, MapPin } from 'lucide-react';

export default function EditLaneScopeDialog({ eventCarrier, open, onOpenChange }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const existingScope = eventCarrier?.lane_scope_json || {};
  const [laneScope, setLaneScope] = useState({
    origins: existingScope.origins || '',
    destinations: existingScope.destinations || '',
    equipmentTypes: existingScope.equipmentTypes || '',
    estimatedVolume: existingScope.estimatedVolume || '',
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const hasAnyValue = Object.values(laneScope).some(v => v);
      const updates = {
        lane_scope_json: hasAnyValue ? laneScope : null,
      };

      return CSPEventCarrier.update(eventCarrier.id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['csp_event_carriers']);
      toast({
        title: 'Success',
        description: 'Lane scope updated successfully',
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update lane scope',
        variant: 'destructive',
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Edit Lane Scope
          </DialogTitle>
          <DialogDescription>
            Define the scope of lanes for {eventCarrier?.carrier?.name}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="origins">Origins</Label>
            <Input
              id="origins"
              value={laneScope.origins}
              onChange={(e) => setLaneScope({ ...laneScope, origins: e.target.value })}
              placeholder="e.g., CA, TX, NY"
            />
            <p className="text-xs text-slate-500 mt-1">
              States, regions, or specific locations
            </p>
          </div>

          <div>
            <Label htmlFor="destinations">Destinations</Label>
            <Input
              id="destinations"
              value={laneScope.destinations}
              onChange={(e) => setLaneScope({ ...laneScope, destinations: e.target.value })}
              placeholder="e.g., FL, GA, NC"
            />
            <p className="text-xs text-slate-500 mt-1">
              States, regions, or specific locations
            </p>
          </div>

          <div>
            <Label htmlFor="equipmentTypes">Equipment Types</Label>
            <Input
              id="equipmentTypes"
              value={laneScope.equipmentTypes}
              onChange={(e) => setLaneScope({ ...laneScope, equipmentTypes: e.target.value })}
              placeholder="e.g., Dry Van, Reefer"
            />
            <p className="text-xs text-slate-500 mt-1">
              Types of equipment or trailers
            </p>
          </div>

          <div>
            <Label htmlFor="estimatedVolume">Estimated Volume</Label>
            <Input
              id="estimatedVolume"
              value={laneScope.estimatedVolume}
              onChange={(e) => setLaneScope({ ...laneScope, estimatedVolume: e.target.value })}
              placeholder="e.g., 100 shipments/mo"
            />
            <p className="text-xs text-slate-500 mt-1">
              Expected shipment frequency
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Lane Scope
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
