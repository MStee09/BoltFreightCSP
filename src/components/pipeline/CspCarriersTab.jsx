import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CSPEventCarrier, Carrier } from '../../api/entities';
import { supabase } from '../../api/supabaseClient';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import {
  MoreVertical, UserPlus, Upload, FileText, Award, XCircle,
  RefreshCw, CheckCircle, Clock, Send, Truck, Paperclip, AlertTriangle, Mail, MessageSquare
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useToast } from '../ui/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { format } from 'date-fns';
import { Checkbox } from '../ui/checkbox';
import BidDocsViewer from './BidDocsViewer';
import EditLaneScopeDialog from './EditLaneScopeDialog';
import AddNoteDialog from './AddNoteDialog';
import { useEmailComposer } from '../../contexts/EmailComposerContext';

const STATUS_CONFIG = {
  invited: { label: 'Invited', color: 'bg-slate-100 text-slate-700', icon: Send },
  submitted: { label: 'Submitted', color: 'bg-blue-100 text-blue-700', icon: FileText },
  under_review: { label: 'Under Review', color: 'bg-purple-100 text-purple-700', icon: Clock },
  revision_requested: { label: 'Revision Requested', color: 'bg-orange-100 text-orange-700', icon: RefreshCw },
  awarded: { label: 'Awarded', color: 'bg-green-100 text-green-700', icon: Award },
  not_awarded: { label: 'Not Awarded', color: 'bg-red-100 text-red-700', icon: XCircle },
  withdrawn: { label: 'Withdrawn', color: 'bg-slate-100 text-slate-500', icon: XCircle },
  declined: { label: 'Declined', color: 'bg-slate-100 text-slate-500', icon: XCircle },
};

export default function CspCarriersTab({ cspEvent }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { openComposer } = useEmailComposer();
  const [filterStatus, setFilterStatus] = useState('all');
  const [actionDialog, setActionDialog] = useState(null);
  const [selectedCarriers, setSelectedCarriers] = useState(new Set());
  const [bulkAction, setBulkAction] = useState(null);
  const [editingScopeCarrier, setEditingScopeCarrier] = useState(null);
  const [addingNoteCarrier, setAddingNoteCarrier] = useState(null);

  const { data: eventCarriers = [], isLoading } = useQuery({
    queryKey: ['csp_event_carriers', cspEvent?.id],
    queryFn: () => CSPEventCarrier.filter({ csp_event_id: cspEvent.id }),
    enabled: !!cspEvent?.id,
  });

  const { data: allCarriers = [] } = useQuery({
    queryKey: ['carriers'],
    queryFn: () => Carrier.list(),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ carrierId, newStatus, notes, laneScope, reason }) => {
      const carrier = eventCarriers.find(c => c.carrier_id === carrierId);
      const updates = {
        status: newStatus,
        notes: notes || carrier.notes,
      };

      if (newStatus === 'submitted' && !carrier.submitted_at) {
        updates.submitted_at = new Date().toISOString();
      }
      if (newStatus === 'awarded' && !carrier.awarded_at) {
        updates.awarded_at = new Date().toISOString();
        const { data: { user } } = await supabase.auth.getUser();
        updates.awarded_by = user?.id;

        if (laneScope && Object.values(laneScope).some(v => v)) {
          updates.lane_scope_json = laneScope;
        }
      }
      if (newStatus === 'not_awarded' && reason) {
        updates.not_awarded_reason = reason;
      }

      return CSPEventCarrier.update(carrier.id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['csp_event_carriers']);
      toast({ title: 'Success', description: 'Carrier status updated' });
      setActionDialog(null);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update carrier status',
        variant: 'destructive'
      });
    },
  });

  const inviteCarrierMutation = useMutation({
    mutationFn: async (carrierId) => {
      return CSPEventCarrier.create({
        csp_event_id: cspEvent.id,
        carrier_id: carrierId,
        status: 'invited',
        invited_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['csp_event_carriers']);
      toast({ title: 'Success', description: 'Carrier invited' });
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ carrierIds, action, notes }) => {
      const promises = carrierIds.map(carrierId =>
        updateStatusMutation.mutateAsync({ carrierId, newStatus: action, notes })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      setSelectedCarriers(new Set());
      setBulkAction(null);
    },
  });

  const carrierData = eventCarriers.map(ec => ({
    ...ec,
    carrier: allCarriers.find(c => c.id === ec.carrier_id),
  })).filter(c => c.carrier);

  const filteredCarriers = filterStatus === 'all'
    ? carrierData
    : carrierData.filter(c => c.status === filterStatus);

  const statusCounts = {
    all: carrierData.length,
    invited: carrierData.filter(c => c.status === 'invited').length,
    submitted: carrierData.filter(c => c.status === 'submitted').length,
    under_review: carrierData.filter(c => c.status === 'under_review').length,
    awarded: carrierData.filter(c => c.status === 'awarded').length,
    not_awarded: carrierData.filter(c => c.status === 'not_awarded').length,
  };

  const invitedCarrierIds = new Set(eventCarriers.map(ec => ec.carrier_id));
  const availableCarriers = allCarriers.filter(c => !invitedCarrierIds.has(c.id));

  const handleQuickStatusChange = async (carrierId, newStatus) => {
    const needsDialog = ['awarded', 'not_awarded'].includes(newStatus);

    if (needsDialog) {
      setActionDialog({
        carrierId,
        newStatus,
        notes: '',
        reason: '',
        laneScope: {
          origins: '',
          destinations: '',
          equipmentTypes: '',
          estimatedVolume: '',
        },
      });
    } else {
      updateStatusMutation.mutate({ carrierId, newStatus });
    }
  };

  const handleStatusChange = (carrierId, newStatus) => {
    setActionDialog({
      carrierId,
      newStatus,
      notes: '',
      reason: '',
      laneScope: {
        origins: '',
        destinations: '',
        equipmentTypes: '',
        estimatedVolume: '',
      },
    });
  };

  const handleBulkAction = (action) => {
    if (selectedCarriers.size === 0) {
      toast({ title: 'No carriers selected', variant: 'destructive' });
      return;
    }
    setBulkAction({ action, notes: '' });
  };

  const toggleCarrierSelection = (carrierId) => {
    const newSelection = new Set(selectedCarriers);
    if (newSelection.has(carrierId)) {
      newSelection.delete(carrierId);
    } else {
      newSelection.add(carrierId);
    }
    setSelectedCarriers(newSelection);
  };

  const isAwardStage = cspEvent?.stage === 'awarded' || cspEvent?.stage === 'implementation';
  const hasAwardedCarriers = statusCounts.awarded > 0;

  return (
    <div className="space-y-4">
      {isAwardStage && !hasAwardedCarriers && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="w-4 h-4 text-orange-600" />
          <AlertDescription className="text-orange-900">
            <strong>No awards yet.</strong> Award at least one carrier to proceed with tariff creation.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Truck className="w-5 h-5 text-slate-600" />
          <h3 className="text-lg font-semibold">Carrier Management</h3>
        </div>
        <div className="flex gap-2">
          {selectedCarriers.size > 0 && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkAction('awarded')}
              >
                <Award className="w-4 h-4 mr-2" />
                Award Selected ({selectedCarriers.size})
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkAction('not_awarded')}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Not Award Selected
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-slate-600">
        <Badge variant="outline">Invited: {statusCounts.invited}</Badge>
        <Badge variant="outline">Submitted: {statusCounts.submitted}</Badge>
        <Badge variant="outline">Under Review: {statusCounts.under_review}</Badge>
        <Badge variant="outline" className="bg-green-50">Awarded: {statusCounts.awarded}</Badge>
        <Badge variant="outline" className="bg-red-50">Not Awarded: {statusCounts.not_awarded}</Badge>
      </div>

      <Tabs value={filterStatus} onValueChange={setFilterStatus}>
        <TabsList>
          <TabsTrigger value="all">All ({statusCounts.all})</TabsTrigger>
          <TabsTrigger value="submitted">Submitted ({statusCounts.submitted})</TabsTrigger>
          <TabsTrigger value="under_review">Under Review ({statusCounts.under_review})</TabsTrigger>
          <TabsTrigger value="awarded">Awarded ({statusCounts.awarded})</TabsTrigger>
          <TabsTrigger value="not_awarded">Not Awarded ({statusCounts.not_awarded})</TabsTrigger>
        </TabsList>

        <TabsContent value={filterStatus} className="space-y-3 mt-4">
          {filteredCarriers.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-slate-500">
                No carriers {filterStatus !== 'all' && `with status "${STATUS_CONFIG[filterStatus]?.label}"`}
              </CardContent>
            </Card>
          ) : (
            filteredCarriers.map((carrierData) => {
              const statusConfig = STATUS_CONFIG[carrierData.status];
              const StatusIcon = statusConfig?.icon || Truck;
              const bidDocsCount = Array.isArray(carrierData.bid_docs) ? carrierData.bid_docs.length : 0;

              return (
                <Card key={carrierData.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <Checkbox
                          checked={selectedCarriers.has(carrierData.carrier_id)}
                          onCheckedChange={() => toggleCarrierSelection(carrierData.carrier_id)}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold">{carrierData.carrier.name}</h4>

                            <Select
                              value={carrierData.status}
                              onValueChange={(value) => handleQuickStatusChange(carrierData.carrier_id, value)}
                              disabled={updateStatusMutation.isPending}
                            >
                              <SelectTrigger className={`h-7 w-[160px] text-xs ${statusConfig?.color}`}>
                                <SelectValue>
                                  <div className="flex items-center gap-1">
                                    <StatusIcon className="w-3 h-3" />
                                    {statusConfig?.label}
                                  </div>
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                                  const Icon = config.icon;
                                  return (
                                    <SelectItem key={key} value={key}>
                                      <div className="flex items-center gap-2">
                                        <Icon className="w-3 h-3" />
                                        {config.label}
                                      </div>
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>

                            <BidDocsViewer eventCarrier={carrierData} />
                          </div>

                          {carrierData.notes && (
                            <p className="text-sm text-slate-600 mb-2">{carrierData.notes}</p>
                          )}

                          {carrierData.status === 'not_awarded' && carrierData.not_awarded_reason && (
                            <p className="text-xs text-slate-500 mb-2">
                              <span className="font-medium">Reason:</span> {carrierData.not_awarded_reason}
                            </p>
                          )}

                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            {carrierData.invited_at && (
                              <span>Invited: {format(new Date(carrierData.invited_at), 'MMM d, yyyy')}</span>
                            )}
                            {carrierData.submitted_at && (
                              <span>Submitted: {format(new Date(carrierData.submitted_at), 'MMM d, yyyy')}</span>
                            )}
                            {carrierData.awarded_at && (
                              <span>Awarded: {format(new Date(carrierData.awarded_at), 'MMM d, yyyy')}</span>
                            )}
                          </div>

                          {carrierData.status === 'awarded' && (
                            <button
                              onClick={() => setEditingScopeCarrier(carrierData)}
                              className="text-xs text-blue-600 hover:text-blue-800 hover:underline mt-2"
                            >
                              {carrierData.lane_scope_json ? 'Edit scope' : 'Add lane scope'}
                            </button>
                          )}
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            openComposer({
                              cspEvent,
                              carrier: carrierData.carrier,
                              initialTo: carrierData.carrier.email ? [carrierData.carrier.email] : [],
                            });
                          }}>
                            <Mail className="w-4 h-4 mr-2" />
                            Email Carrier
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setAddingNoteCarrier(carrierData)}>
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Add Note
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleStatusChange(carrierData.carrier_id, 'submitted')}>
                            <FileText className="w-4 h-4 mr-2" />
                            Mark Submitted
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange(carrierData.carrier_id, 'under_review')}>
                            <Clock className="w-4 h-4 mr-2" />
                            Under Review
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange(carrierData.carrier_id, 'revision_requested')}>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Request Revision
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleStatusChange(carrierData.carrier_id, 'awarded')}>
                            <Award className="w-4 h-4 mr-2 text-green-600" />
                            Award
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange(carrierData.carrier_id, 'not_awarded')}>
                            <XCircle className="w-4 h-4 mr-2 text-red-600" />
                            Not Award
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleStatusChange(carrierData.carrier_id, 'withdrawn')}>
                            Withdraw
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange(carrierData.carrier_id, 'declined')}>
                            Declined
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      {availableCarriers.length > 0 && (
        <Card className="bg-slate-50">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Invite Additional Carriers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {availableCarriers.slice(0, 5).map((carrier) => (
                <Button
                  key={carrier.id}
                  size="sm"
                  variant="outline"
                  onClick={() => inviteCarrierMutation.mutate(carrier.id)}
                  disabled={inviteCarrierMutation.isPending}
                >
                  <UserPlus className="w-3 h-3 mr-1" />
                  {carrier.name}
                </Button>
              ))}
              {availableCarriers.length > 5 && (
                <span className="text-sm text-slate-500 self-center">
                  +{availableCarriers.length - 5} more...
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {actionDialog && (
        <Dialog open={!!actionDialog} onOpenChange={() => setActionDialog(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {STATUS_CONFIG[actionDialog.newStatus]?.label}
              </DialogTitle>
              <DialogDescription>
                Update carrier status and add optional notes
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Notes (Optional)</Label>
                <Textarea
                  value={actionDialog.notes}
                  onChange={(e) => setActionDialog({ ...actionDialog, notes: e.target.value })}
                  placeholder="Add any relevant notes..."
                  rows={3}
                />
              </div>

              {actionDialog.newStatus === 'not_awarded' && (
                <div className="pt-4 border-t">
                  <div>
                    <Label htmlFor="not_awarded_reason">Reason for Not Awarding *</Label>
                    <Textarea
                      id="not_awarded_reason"
                      value={actionDialog.reason}
                      onChange={(e) => setActionDialog({ ...actionDialog, reason: e.target.value })}
                      placeholder="Explain why this carrier was not awarded..."
                      rows={3}
                      className="mt-2"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      This reason will be displayed on the carrier card
                    </p>
                  </div>
                </div>
              )}

              {actionDialog.newStatus === 'awarded' && (
                <div className="space-y-4 pt-4 border-t">
                  <div>
                    <h4 className="font-semibold text-sm mb-3">Lane Scope (Optional)</h4>
                    <p className="text-xs text-slate-500 mb-3">
                      Define the scope of lanes covered by this award
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="origins">Origins</Label>
                      <Input
                        id="origins"
                        value={actionDialog.laneScope.origins}
                        onChange={(e) => setActionDialog({
                          ...actionDialog,
                          laneScope: { ...actionDialog.laneScope, origins: e.target.value }
                        })}
                        placeholder="e.g., CA, TX, NY"
                      />
                    </div>

                    <div>
                      <Label htmlFor="destinations">Destinations</Label>
                      <Input
                        id="destinations"
                        value={actionDialog.laneScope.destinations}
                        onChange={(e) => setActionDialog({
                          ...actionDialog,
                          laneScope: { ...actionDialog.laneScope, destinations: e.target.value }
                        })}
                        placeholder="e.g., FL, GA, NC"
                      />
                    </div>

                    <div>
                      <Label htmlFor="equipmentTypes">Equipment Types</Label>
                      <Input
                        id="equipmentTypes"
                        value={actionDialog.laneScope.equipmentTypes}
                        onChange={(e) => setActionDialog({
                          ...actionDialog,
                          laneScope: { ...actionDialog.laneScope, equipmentTypes: e.target.value }
                        })}
                        placeholder="e.g., Dry Van, Reefer"
                      />
                    </div>

                    <div>
                      <Label htmlFor="estimatedVolume">Estimated Volume</Label>
                      <Input
                        id="estimatedVolume"
                        value={actionDialog.laneScope.estimatedVolume}
                        onChange={(e) => setActionDialog({
                          ...actionDialog,
                          laneScope: { ...actionDialog.laneScope, estimatedVolume: e.target.value }
                        })}
                        placeholder="e.g., 100 shipments/mo"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setActionDialog(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (actionDialog.newStatus === 'not_awarded' && !actionDialog.reason?.trim()) {
                    toast({
                      title: 'Reason Required',
                      description: 'Please provide a reason for not awarding this carrier',
                      variant: 'destructive',
                    });
                    return;
                  }
                  updateStatusMutation.mutate(actionDialog);
                }}
                disabled={updateStatusMutation.isPending}
              >
                Confirm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {bulkAction && (
        <Dialog open={!!bulkAction} onOpenChange={() => setBulkAction(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Bulk {STATUS_CONFIG[bulkAction.action]?.label}
              </DialogTitle>
              <DialogDescription>
                Update {selectedCarriers.size} selected carrier{selectedCarriers.size > 1 ? 's' : ''}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Notes (Optional)</Label>
                <Textarea
                  value={bulkAction.notes}
                  onChange={(e) => setBulkAction({ ...bulkAction, notes: e.target.value })}
                  placeholder="Add any relevant notes..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBulkAction(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => bulkUpdateMutation.mutate({
                  carrierIds: Array.from(selectedCarriers),
                  action: bulkAction.action,
                  notes: bulkAction.notes,
                })}
                disabled={bulkUpdateMutation.isPending}
              >
                Confirm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {editingScopeCarrier && (
        <EditLaneScopeDialog
          eventCarrier={editingScopeCarrier}
          open={!!editingScopeCarrier}
          onOpenChange={(open) => !open && setEditingScopeCarrier(null)}
        />
      )}

      {addingNoteCarrier && (
        <AddNoteDialog
          eventCarrier={addingNoteCarrier}
          open={!!addingNoteCarrier}
          onOpenChange={(open) => !open && setAddingNoteCarrier(null)}
        />
      )}
    </div>
  );
}
