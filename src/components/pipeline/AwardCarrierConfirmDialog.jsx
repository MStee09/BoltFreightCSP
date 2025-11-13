import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Award, CheckCircle2 } from 'lucide-react';

export function AwardCarrierConfirmDialog({
  isOpen,
  onOpenChange,
  carrier,
  customer,
  onConfirm,
  isLoading
}) {
  if (!carrier || !customer) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-green-600" />
            <DialogTitle>Award Carrier</DialogTitle>
          </div>
          <DialogDescription className="pt-4">
            Award <span className="font-semibold text-slate-900">{carrier.name}</span> for{' '}
            <span className="font-semibold text-slate-900">{customer.name}</span>.
            <br />
            <br />
            A proposed tariff will be created and linked across the app.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Awarding...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Confirm Award
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
