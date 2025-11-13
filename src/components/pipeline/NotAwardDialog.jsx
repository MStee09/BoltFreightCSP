import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { XCircle } from 'lucide-react';

const COMMON_REASONS = [
  'Pricing too high',
  'Service area limitations',
  'Failed to meet requirements',
  'Better alternative selected',
  'Capacity concerns',
  'Past performance issues',
  'Other'
];

export default function NotAwardDialog({ open, onOpenChange, carriers, onConfirm, isBulk = false }) {
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    const finalReason = reason === 'Other' ? customReason : reason;

    if (!finalReason.trim()) {
      return;
    }

    onConfirm({
      reason: finalReason,
      notes
    });

    setReason('');
    setCustomReason('');
    setNotes('');
  };

  const carrierNames = Array.isArray(carriers)
    ? carriers.map(c => c.carrier?.name || 'Unknown').join(', ')
    : carriers?.carrier?.name || 'Unknown';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-600" />
            <DialogTitle>Mark as Not Awarded</DialogTitle>
          </div>
          <DialogDescription>
            {isBulk
              ? `Mark ${carriers?.length || 0} selected carriers as not awarded`
              : `Mark ${carrierNames} as not awarded`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="reason">Reason *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="reason">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {COMMON_REASONS.map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {reason === 'Other' && (
            <div>
              <Label htmlFor="customReason">Specify Reason *</Label>
              <Textarea
                id="customReason"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Enter the reason..."
                rows={2}
              />
            </div>
          )}

          <div>
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional context..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={!reason || (reason === 'Other' && !customReason.trim())}
            variant="destructive"
          >
            <XCircle className="w-4 h-4 mr-2" />
            Confirm Not Awarded
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
