import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, FileText, X } from 'lucide-react';

export function AwardSuccessDialog({
  isOpen,
  onOpenChange,
  carrier,
  tariffReferenceId,
  onViewTariff
}) {
  if (!carrier) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <DialogTitle>Award Saved</DialogTitle>
          </div>
          <DialogDescription className="pt-4 space-y-3">
            <p>
              Proposed tariff{' '}
              <span className="font-mono font-semibold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                {tariffReferenceId}
              </span>{' '}
              created and linked across CSP, Customer, Carrier, and Tariffs.
            </p>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            <X className="w-4 h-4 mr-2" />
            Close
          </Button>
          <Button
            type="button"
            onClick={onViewTariff}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <FileText className="w-4 h-4 mr-2" />
            View Tariff
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
