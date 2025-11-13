import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Award } from 'lucide-react';

export default function AwardCarrierDialog({ open, onOpenChange, carriers, onConfirm, isBulk = false }) {
  const [formData, setFormData] = useState({
    mode: '',
    origin: '',
    destination: '',
    includeRegions: '',
    excludeRegions: '',
    notes: ''
  });

  const handleSubmit = () => {
    const laneScope = {
      mode: formData.mode,
      origin: formData.origin,
      destination: formData.destination,
      include_regions: formData.includeRegions.split(',').map(r => r.trim()).filter(Boolean),
      exclude_regions: formData.excludeRegions.split(',').map(r => r.trim()).filter(Boolean),
    };

    onConfirm({
      laneScope,
      notes: formData.notes
    });

    setFormData({
      mode: '',
      origin: '',
      destination: '',
      includeRegions: '',
      excludeRegions: '',
      notes: ''
    });
  };

  const carrierNames = Array.isArray(carriers)
    ? carriers.map(c => c.carrier?.name || 'Unknown').join(', ')
    : carriers?.carrier?.name || 'Unknown';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-green-600" />
            <DialogTitle>Award Carrier{isBulk ? 's' : ''}</DialogTitle>
          </div>
          <DialogDescription>
            {isBulk
              ? `Award ${carriers?.length || 0} selected carriers with shared lane scope`
              : `Award ${carrierNames}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-lg border">
            <h4 className="font-semibold text-sm mb-3">Lane Scope</h4>
            <div className="space-y-3">
              <div>
                <Label htmlFor="mode">Mode *</Label>
                <Select
                  value={formData.mode}
                  onValueChange={(value) => setFormData({ ...formData, mode: value })}
                >
                  <SelectTrigger id="mode">
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="parcel">Parcel</SelectItem>
                    <SelectItem value="ltl">LTL</SelectItem>
                    <SelectItem value="ftl">FTL</SelectItem>
                    <SelectItem value="ocean">Ocean</SelectItem>
                    <SelectItem value="air">Air</SelectItem>
                    <SelectItem value="rail">Rail</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="origin">Origin</Label>
                  <Input
                    id="origin"
                    value={formData.origin}
                    onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                    placeholder="e.g., West Coast, CA, US"
                  />
                </div>
                <div>
                  <Label htmlFor="destination">Destination</Label>
                  <Input
                    id="destination"
                    value={formData.destination}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    placeholder="e.g., East Coast, NY, US"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="includeRegions">Include Regions</Label>
                <Input
                  id="includeRegions"
                  value={formData.includeRegions}
                  onChange={(e) => setFormData({ ...formData, includeRegions: e.target.value })}
                  placeholder="e.g., Northeast, Midwest (comma-separated)"
                />
                <p className="text-xs text-slate-500 mt-1">Optional: specific regions to include</p>
              </div>

              <div>
                <Label htmlFor="excludeRegions">Exclude Regions</Label>
                <Input
                  id="excludeRegions"
                  value={formData.excludeRegions}
                  onChange={(e) => setFormData({ ...formData, excludeRegions: e.target.value })}
                  placeholder="e.g., Alaska, Hawaii (comma-separated)"
                />
                <p className="text-xs text-slate-500 mt-1">Optional: specific regions to exclude</p>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Award Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add notes about this award decision..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={!formData.mode}
            className="bg-green-600 hover:bg-green-700"
          >
            <Award className="w-4 h-4 mr-2" />
            Confirm Award
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
