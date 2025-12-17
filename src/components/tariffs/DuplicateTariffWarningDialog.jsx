import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, ExternalLink, Calendar, Package } from 'lucide-react';
import { format } from 'date-fns';

const getSimilarityTypeInfo = (similarityType) => {
  switch (similarityType) {
    case 'direct_duplicate':
      return {
        label: 'Exact Duplicate',
        color: 'bg-orange-100 text-orange-800 border-orange-300',
        severity: 'high',
      };
    case 'blanket_customer_coverage':
      return {
        label: 'Covered by Blanket',
        color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        severity: 'medium',
      };
    case 'rocket_blanket_coverage':
      return {
        label: 'Rocket Blanket Coverage',
        color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        severity: 'medium',
      };
    case 'priority_1_blanket_coverage':
      return {
        label: 'Priority 1 Blanket Coverage',
        color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        severity: 'medium',
      };
    case 'date_proximity':
      return {
        label: 'Similar Dates',
        color: 'bg-blue-100 text-blue-800 border-blue-300',
        severity: 'low',
      };
    default:
      return {
        label: 'Similar Tariff',
        color: 'bg-gray-100 text-gray-800 border-gray-300',
        severity: 'low',
      };
  }
};

export default function DuplicateTariffWarningDialog({
  open,
  onOpenChange,
  similarTariffs = [],
  onContinue,
  onCancel,
}) {
  const [confirmedReview, setConfirmedReview] = useState(false);

  const hasHighSeverity = similarTariffs.some((t) => {
    const info = getSimilarityTypeInfo(t.similarity_type);
    return info.severity === 'high';
  });

  const handleViewTariff = (tariffId) => {
    window.open(`/tariffs/${tariffId}`, '_blank');
  };

  const handleContinue = () => {
    onContinue();
    onOpenChange(false);
    setConfirmedReview(false);
  };

  const handleGoBack = () => {
    onOpenChange(false);
    setConfirmedReview(false);
  };

  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
    setConfirmedReview(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-yellow-600" />
            <AlertDialogTitle>
              {similarTariffs.length === 1
                ? 'Similar Active Tariff Found'
                : `${similarTariffs.length} Similar Active Tariffs Found`}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            {hasHighSeverity ? (
              <span className="text-orange-600 font-medium">
                We found active tariff(s) that may be duplicates. Please review before continuing.
              </span>
            ) : (
              <span>
                We found active tariff(s) with similar details. Please review to ensure this is not a duplicate.
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 my-4">
          {similarTariffs.map((tariff, index) => {
            const similarityInfo = getSimilarityTypeInfo(tariff.similarity_type);
            const hasOverlap = tariff.date_overlap?.overlap;

            return (
              <Card key={tariff.id} className="border-2 border-yellow-200 bg-yellow-50/50">
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={similarityInfo.color}>
                            {similarityInfo.label}
                          </Badge>
                          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                            Active
                          </Badge>
                          {tariff.ownership_type && (
                            <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                              {tariff.ownership_type.replace(/_/g, ' ').toUpperCase()}
                            </Badge>
                          )}
                        </div>
                        <h4 className="font-semibold mt-2 text-lg">
                          {tariff.tariff_reference_id || `Tariff #${index + 1}`}
                        </h4>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewTariff(tariff.id)}
                        className="shrink-0"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Tariff
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-gray-500 flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          Carrier
                        </div>
                        <div className="font-medium">
                          {tariff.carrier_name}
                          {tariff.scac_code && (
                            <span className="text-gray-500 ml-2">({tariff.scac_code})</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Date Range
                        </div>
                        <div className="font-medium">
                          {format(new Date(tariff.effective_date), 'MMM d, yyyy')} -{' '}
                          {format(new Date(tariff.expiry_date), 'MMM d, yyyy')}
                        </div>
                      </div>
                    </div>

                    {hasOverlap && (
                      <div className="bg-orange-50 border border-orange-200 rounded p-2 text-sm">
                        <span className="font-medium text-orange-900">Date Overlap Detected: </span>
                        <span className="text-orange-800">
                          {format(new Date(tariff.date_overlap.overlap_start), 'MMM d, yyyy')} -{' '}
                          {format(new Date(tariff.date_overlap.overlap_end), 'MMM d, yyyy')}
                        </span>
                      </div>
                    )}

                    <div className="bg-white border border-yellow-300 rounded p-3">
                      <p className="text-sm text-gray-700">
                        <strong>Reason:</strong> {tariff.reason}
                      </p>
                    </div>

                    {tariff.customer_count > 0 && (
                      <div className="text-xs text-gray-500">
                        This tariff covers {tariff.customer_count} customer{tariff.customer_count !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-start gap-2 text-sm text-gray-600 bg-blue-50 p-3 rounded">
            <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-blue-900">Before continuing:</p>
              <ul className="list-disc list-inside mt-1 space-y-1 text-blue-800">
                <li>Click "View Tariff" to review each similar tariff in detail</li>
                <li>Verify that the new tariff is not a duplicate</li>
                <li>Check if the customer is already covered by a blanket tariff</li>
              </ul>
            </div>
          </div>

          {!confirmedReview && (
            <Button
              variant="outline"
              onClick={() => setConfirmedReview(true)}
              className="w-full border-yellow-400 text-yellow-700 hover:bg-yellow-50"
            >
              I have reviewed the similar tariffs above
            </Button>
          )}
        </div>

        <AlertDialogFooter className="gap-2">
          <Button variant="outline" onClick={handleGoBack}>
            Go Back to Form
          </Button>
          <Button variant="ghost" onClick={handleCancel}>
            Cancel Creation
          </Button>
          {confirmedReview && (
            <Button onClick={handleContinue} className="bg-yellow-600 hover:bg-yellow-700">
              Continue Creating Tariff
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
