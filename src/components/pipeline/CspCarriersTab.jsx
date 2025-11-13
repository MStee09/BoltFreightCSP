import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CSPEventCarrier, Carrier } from '../../api/entities';
import { supabase } from '../../api/supabaseClient';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import {
  MoreVertical, UserPlus, Upload, FileText, Award, XCircle,
  RefreshCw, CheckCircle, Clock, Send, Truck, Paperclip, AlertTriangle, Mail, MessageSquare, Plus, ShieldAlert
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { format, formatDistanceToNow } from 'date-fns';
import { Checkbox } from '../ui/checkbox';
import BidDocsViewer from './BidDocsViewer';
import EditLaneScopeDialog from './EditLaneScopeDialog';
import BulkUploadDialog from './BulkUploadDialog';
import { AwardCarrierConfirmDialog } from './AwardCarrierConfirmDialog';
import { AwardSuccessDialog } from './AwardSuccessDialog';
import NotAwardDialog from './NotAwardDialog';
import InlineNoteEditor from './InlineNoteEditor';
import CreateProposedTariffsDialog from './CreateProposedTariffsDialog';
import ManageCarriersDialog from './ManageCarriersDialog';
import { useEmailComposer } from '../../contexts/EmailComposerContext';
import { useUserRole } from '../../hooks/useUserRole';

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

const QUICK_STATUS_OPTIONS = ['invited', 'submitted', 'under_review', 'revision_requested'];

export default function CspCarriersTab({ cspEvent }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { openComposer } = useEmailComposer();
  const { role } = useUserRole();
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedCarriers, setSelectedCarriers] = useState(new Set());
  const [editingScopeCarrier, setEditingScopeCarrier] = useState(null);
  const [editingNoteCarrier, setEditingNoteCarrier] = useState(null);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [awardConfirmOpen, setAwardConfirmOpen] = useState(false);
  const [awardCarrier, setAwardCarrier] = useState(null);
  const [awardSuccessOpen, setAwardSuccessOpen] = useState(false);
  const [awardedTariff, setAwardedTariff] = useState(null);
  const [notAwardDialogOpen, setNotAwardDialogOpen] = useState(false);
  const [notAwardDialogCarriers, setNotAwardDialogCarriers] = useState(null);
  const [createTariffDialogOpen, setCreateTariffDialogOpen] = useState(false);
  const [showStageGateOverride, setShowStageGateOverride] = useState(false);
  const [bidDocsPromptCarrierId, setBidDocsPromptCarrierId] = useState(null);
  const [manageCarriersOpen, setManageCarriersOpen] = useState(false);

  const { data: eventCarriers = [], isLoading } = useQuery({
    queryKey: ['csp_event_carriers', cspEvent?.id],
    queryFn: () => CSPEventCarrier.filter({ csp_event_id: cspEvent.id }),
    enabled: !!cspEvent?.id,
  });

  const { data: allCarriers = [] } = useQuery({
    queryKey: ['carriers'],
    queryFn: () => Carrier.list(),
  });

  const { data: customer } = useQuery({
    queryKey: ['customer', cspEvent?.customer_id],
    queryFn: async () => {
      if (!cspEvent?.customer_id) return null;
      const { data } = await supabase
        .from('customers')
        .select('id, name')
        .eq('id', cspEvent.customer_id)
        .maybeSingle();
      return data;
    },
    enabled: !!cspEvent?.customer_id,
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
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update carrier status',
        variant: 'destructive'
      });
    },
  });

  const awardCarrierMutation = useMutation({
    mutationFn: async (assignmentId) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.rpc('award_carrier_with_tariff', {
        p_assignment_id: assignmentId,
        p_awarded_by: user?.id
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['csp_event_carriers']);
      queryClient.invalidateQueries(['tariffs']);
      setAwardConfirmOpen(false);
      setAwardedTariff(data);
      setAwardSuccessOpen(true);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to award carrier',
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
    if (newStatus === 'submitted' && !eventCarriers.find(c => c.carrier_id === carrierId)?.bid_docs?.length) {
      setBidDocsPromptCarrierId(carrierId);
    }
    updateStatusMutation.mutate({ carrierId, newStatus });
  };

  useEffect(() => {
    if (bidDocsPromptCarrierId) {
      const timer = setTimeout(() => {
        toast({
          title: 'Upload Bid Docs?',
          description: 'Carrier marked as submitted. Upload bid documents now or add them later.',
          action: (
            <Button size="sm" onClick={() => {
              setBulkUploadOpen(true);
              setBidDocsPromptCarrierId(null);
            }}>Upload</Button>
          )
        });
        setBidDocsPromptCarrierId(null);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [bidDocsPromptCarrierId]);

  const handleAwardCarrier = (carrierAssignment) => {
    setAwardCarrier(carrierAssignment);
    setAwardConfirmOpen(true);
  };

  const handleNotAwardCarrier = (carrierAssignment) => {
    setNotAwardDialogCarriers(carrierAssignment);
    setNotAwardDialogOpen(true);
  };

  const handleAwardConfirm = () => {
    if (awardCarrier?.id) {
      awardCarrierMutation.mutate(awardCarrier.id);
    }
  };

  const handleNotAwardConfirm = ({ reason, notes }) => {
    const carriers = Array.isArray(notAwardDialogCarriers) ? notAwardDialogCarriers : [notAwardDialogCarriers];
    carriers.forEach(carrier => {
      updateStatusMutation.mutate({
        carrierId: carrier.carrier_id,
        newStatus: 'not_awarded',
        reason,
        notes
      });
    });
    setNotAwardDialogOpen(false);
    setNotAwardDialogCarriers(null);
  };

  const handleBulkAction = (action) => {
    if (selectedCarriers.size === 0) {
      toast({ title: 'No carriers selected', variant: 'destructive' });
      return;
    }

    const selectedCarrierData = carrierData.filter(c => selectedCarriers.has(c.carrier_id));

    if (action === 'award') {
      setAwardDialogCarriers(selectedCarrierData);
      setAwardDialogOpen(true);
      return;
    }

    if (action === 'not_award') {
      setNotAwardDialogCarriers(selectedCarrierData);
      setNotAwardDialogOpen(true);
      return;
    }

    if (action === 'submitted') {
      selectedCarrierData.forEach(carrier => {
        updateStatusMutation.mutate({ carrierId: carrier.carrier_id, newStatus: 'submitted' });
      });
      setSelectedCarriers(new Set());
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
                onClick={() => handleBulkAction('submitted')}
              >
                <FileText className="w-4 h-4 mr-2" />
                Mark Submitted ({selectedCarriers.size})
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setBulkUploadOpen(true)}
              >
                <Upload className="w-4 h-4 mr-2" />
                Bulk Upload
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkAction('award')}
              >
                <Award className="w-4 h-4 mr-2" />
                Award Selected ({selectedCarriers.size})
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkAction('not_award')}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Not Award Selected
              </Button>
            </>
          )}
          {cspEvent?.stage === 'award_tariff_finalization' && hasAwardedCarriers && (
            <Button
              size="sm"
              onClick={() => setCreateTariffDialogOpen(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Awarded Tariff(s)
            </Button>
          )}
        </div>
      </div>

      {cspEvent?.stage && !['invited', 'planning'].includes(cspEvent.stage) && !hasAwardedCarriers && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="w-4 h-4 text-orange-600" />
          <AlertDescription className="flex items-center justify-between">
            <span className="text-orange-900">
              <strong>Stage Gate:</strong> At least one carrier must be awarded before moving to the next stage.
            </span>
            {(role === 'admin' || role === 'elite') && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowStageGateOverride(true)}
                className="border-orange-300 hover:bg-orange-100"
              >
                <ShieldAlert className="w-3 h-3 mr-1" />
                Override
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

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
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <div className="flex flex-col gap-1">
                              <h4 className="font-semibold">{carrierData.carrier.name}</h4>
                              {carrierData.ownership_type && (
                                <Badge variant="outline" className="text-xs w-fit">
                                  {carrierData.ownership_type === 'rocket_csp' && 'Rocket CSP'}
                                  {carrierData.ownership_type === 'rocket_blanket' && 'Rocket Blanket'}
                                  {carrierData.ownership_type === 'customer_direct' && 'Customer Direct'}
                                  {carrierData.ownership_type === 'priority1_blanket' && 'Priority 1 Blanket'}
                                </Badge>
                              )}
                            </div>

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
                                {QUICK_STATUS_OPTIONS.map(key => {
                                  const config = STATUS_CONFIG[key];
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

                            <div className="ml-auto flex items-center gap-2">
                              {carrierData.status === 'awarded' ? (
                                <Badge className="bg-green-100 text-green-800 border-green-300">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Awarded
                                </Badge>
                              ) : carrierData.status === 'not_awarded' ? (
                                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Not Awarded
                                </Badge>
                              ) : (
                                <>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleAwardCarrier(carrierData)}
                                          disabled={
                                            cspEvent.stage !== 'award_tariff_finalization' ||
                                            !['under_review', 'revision_requested'].includes(carrierData.status)
                                          }
                                          className={
                                            cspEvent.stage === 'award_tariff_finalization' &&
                                            ['under_review', 'revision_requested'].includes(carrierData.status)
                                              ? "h-7 text-xs bg-green-50 text-green-700 border-green-300 hover:bg-green-100 hover:text-green-800"
                                              : "h-7 text-xs opacity-50 cursor-not-allowed"
                                          }
                                        >
                                          <Award className="w-3 h-3 mr-1" />
                                          Award
                                        </Button>
                                      </TooltipTrigger>
                                      {(cspEvent.stage !== 'award_tariff_finalization' || !['under_review', 'revision_requested'].includes(carrierData.status)) && (
                                        <TooltipContent>
                                          <p className="text-xs">
                                            {cspEvent.stage !== 'award_tariff_finalization'
                                              ? 'CSP must be in Award & Tariff Finalization stage (Stage 6)'
                                              : 'Carrier must be in Under Review or Revision Requested status'}
                                          </p>
                                        </TooltipContent>
                                      )}
                                    </Tooltip>
                                  </TooltipProvider>

                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleNotAwardCarrier(carrierData)}
                                          disabled={cspEvent.stage !== 'award_tariff_finalization'}
                                          className={
                                            cspEvent.stage === 'award_tariff_finalization'
                                              ? "h-7 text-xs bg-red-50 text-red-700 border-red-300 hover:bg-red-100 hover:text-red-800"
                                              : "h-7 text-xs opacity-50 cursor-not-allowed"
                                          }
                                        >
                                          <XCircle className="w-3 h-3 mr-1" />
                                          Not Award
                                        </Button>
                                      </TooltipTrigger>
                                      {cspEvent.stage !== 'award_tariff_finalization' && (
                                        <TooltipContent>
                                          <p className="text-xs">CSP must be in Award & Tariff Finalization stage (Stage 6)</p>
                                        </TooltipContent>
                                      )}
                                    </Tooltip>
                                  </TooltipProvider>
                                </>
                              )}
                            </div>
                          </div>

                          {carrierData.notes && (
                            <p className="text-sm text-slate-600 mb-2">{carrierData.notes}</p>
                          )}

                          {carrierData.status === 'not_awarded' && carrierData.not_awarded_reason && (
                            <div className="bg-red-50 border border-red-200 rounded p-2 mb-2">
                              <p className="text-xs text-red-800">
                                <span className="font-medium">Not Awarded Reason:</span> {carrierData.not_awarded_reason}
                              </p>
                            </div>
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
                            {carrierData.last_activity_at && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-slate-400 border-l pl-4 ml-4 cursor-help">
                                      Last activity: {formatDistanceToNow(new Date(carrierData.last_activity_at), { addSuffix: true })}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs">{carrierData.last_activity_type || 'Activity'} on {format(new Date(carrierData.last_activity_at), 'MMM d, yyyy h:mm a')}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>

                          {carrierData.status === 'awarded' && carrierData.lane_scope_json && (
                            <div className="text-xs text-slate-600 mt-2 p-2 bg-slate-50 rounded border">
                              <span className="font-medium">Lane Scope:</span> {carrierData.lane_scope_json.mode || 'N/A'}
                              {carrierData.lane_scope_json.origin && ` | ${carrierData.lane_scope_json.origin}`}
                              {carrierData.lane_scope_json.destination && ` → ${carrierData.lane_scope_json.destination}`}
                            </div>
                          )}

                          {editingNoteCarrier?.id === carrierData.id ? (
                            <InlineNoteEditor
                              carrierAssignment={carrierData}
                              onCancel={() => setEditingNoteCarrier(null)}
                            />
                          ) : (
                            <button
                              onClick={() => setEditingNoteCarrier(carrierData)}
                              className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 mt-2"
                            >
                              <Plus className="w-3 h-3" />
                              Add Note
                            </button>
                          )}
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
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
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleQuickStatusChange(carrierData.carrier_id, 'withdrawn')}>
                            <XCircle className="w-4 h-4 mr-2" />
                            Withdraw
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleQuickStatusChange(carrierData.carrier_id, 'declined')}>
                            <XCircle className="w-4 h-4 mr-2" />
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

      <div className="mt-4">
        <Button
          onClick={() => setManageCarriersOpen(true)}
          variant="outline"
          className="w-full border-dashed border-2 h-12 hover:bg-slate-50"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Invite Carriers
        </Button>
      </div>

      <AwardCarrierConfirmDialog
        isOpen={awardConfirmOpen}
        onOpenChange={setAwardConfirmOpen}
        carrier={awardCarrier?.carrier}
        customer={customer || { name: 'Customer' }}
        onConfirm={handleAwardConfirm}
        isLoading={awardCarrierMutation.isPending}
      />

      <AwardSuccessDialog
        isOpen={awardSuccessOpen}
        onOpenChange={setAwardSuccessOpen}
        carrier={awardCarrier?.carrier}
        tariffReferenceId={awardedTariff?.tariff_reference_id}
        onViewTariff={() => {
          window.location.href = `/tariffdetail?id=${awardedTariff?.tariff_id}`;
        }}
      />

      <NotAwardDialog
        open={notAwardDialogOpen}
        onOpenChange={setNotAwardDialogOpen}
        carriers={notAwardDialogCarriers}
        onConfirm={handleNotAwardConfirm}
        isBulk={Array.isArray(notAwardDialogCarriers) && notAwardDialogCarriers.length > 1}
      />

      <CreateProposedTariffsDialog
        cspEvent={cspEvent}
        awardedCarriers={carrierData.filter(c => c.status === 'awarded')}
        open={createTariffDialogOpen}
        onOpenChange={setCreateTariffDialogOpen}
      />

      <BulkUploadDialog
        selectedCarriers={Array.from(selectedCarriers)}
        carriers={eventCarriers}
        cspEventId={cspEvent.id}
        open={bulkUploadOpen}
        onOpenChange={setBulkUploadOpen}
        onSuccess={() => {
          queryClient.invalidateQueries(['csp_event_carriers']);
          setSelectedCarriers(new Set());
        }}
      />

      <ManageCarriersDialog
        isOpen={manageCarriersOpen}
        onOpenChange={setManageCarriersOpen}
        cspEventId={cspEvent.id}
      />
    </div>
  );
}
