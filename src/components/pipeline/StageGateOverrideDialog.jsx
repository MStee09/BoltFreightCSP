import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tantml:invoke>
import { supabase } from '../../api/supabaseClient';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Alert, AlertDescription } from '../ui/alert';
import { useToast } from '../ui/use-toast';
import { AlertTriangle, Loader2, ShieldAlert } from 'lucide-react';

export default function StageGateOverrideDialog({ cspEvent, newStage, validationError, open, onOpenChange, onOverrideConfirm }) {
  const { toast } = useToast();
  const [reason, setReason] = useState('');
  const [isOverriding, setIsOverriding] = useState(false);

  const handleOverride = async () => {
    if (!reason.trim()) {
      toast({
        title: 'Reason Required',
        description: 'Please provide a reason for this override',
        variant: 'destructive',
      });
      return;
    }

    setIsOverriding(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      await supabase.from('customer_carrier_activities').insert({
        customer_id: cspEvent.customer_id,
        csp_event_id: cspEvent.id,
        activity_type: 'stage_gate_override',
        description: `Stage gate overridden: ${cspEvent.stage} → ${newStage}`,
        details: `Reason: ${reason}\n\nValidation Error: ${validationError}`,
        user_id: user?.id || '00000000-0000-0000-0000-000000000000',
      });

      toast({
        title: 'Override Confirmed',
        description: 'Stage gate override has been logged',
      });

      onOverrideConfirm();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Override Failed',
        description: error.message || 'Failed to log override',
        variant: 'destructive',
      });
    } finally {
      setIsOverriding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-600">
            <ShieldAlert className="w-5 h-5" />
            Stage Gate Override Required
          </DialogTitle>
          <DialogDescription>
            This stage transition requires admin override
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="w-4 h-4 text-orange-600" />
            <AlertDescription className="text-orange-900">
              <strong>Validation Error:</strong>
              <p className="mt-1">{validationError}</p>
            </AlertDescription>
          </Alert>

          <div>
            <Label htmlFor="override_reason">Override Reason *</Label>
            <Textarea
              id="override_reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this override is necessary..."
              rows={4}
              className="mt-2"
            />
            <p className="text-xs text-slate-500 mt-1">
              This reason will be logged in the activity timeline for audit purposes
            </p>
          </div>

          <Alert>
            <AlertDescription>
              <strong>Warning:</strong> Overriding stage gates may lead to incomplete or inconsistent data.
              Ensure you understand the implications before proceeding.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleOverride}
            disabled={!reason.trim() || isOverriding}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isOverriding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Confirm Override
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
