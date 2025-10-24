
import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { AlertTriangle, AlertCircle, Info, CheckCircle, ExternalLink, UserPlus, Clock, Check, X, Eye } from "lucide-react";
import { format } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "../../api/entities";
import { useToast } from "../ui/use-toast";
import { supabase } from "../../api/supabaseClient";

// CRITICAL FIX: Moved helper function inline to fix broken import
function ensureArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (val.data && Array.isArray(val.data)) return val.data;
  if (val.results && Array.isArray(val.results)) return val.results;
  return [];
}


export default function AlertsPanel({ alerts }) {
  const safeAlerts = ensureArray(alerts);
  const [hoveredAlertId, setHoveredAlertId] = useState(null);
  const [resolvingAlert, setResolvingAlert] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const acknowledgeAlertMutation = useMutation({
    mutationFn: async (alertId) => {
      const { data: { user } } = await supabase.auth.getUser();
      await Alert.update(alertId, {
        status: 'acknowledged',
        last_seen_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['alerts']);
      toast({
        title: "Alert Acknowledged",
        description: "Alert status updated to acknowledged.",
      });
    },
  });

  const resolveAlertMutation = useMutation({
    mutationFn: async ({ alertId, notes, action }) => {
      const { data: { user } } = await supabase.auth.getUser();
      await Alert.update(alertId, {
        status: 'resolved',
        resolved_date: new Date().toISOString(),
        resolved_by: user.id,
        resolution_notes: notes,
        action_taken: action
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['alerts']);
      setResolvingAlert(null);
      setResolutionNotes("");
      setActionTaken("");
      toast({
        title: "Alert Resolved",
        description: "The alert has been marked as resolved.",
      });
    },
  });

  const dismissAlertMutation = useMutation({
    mutationFn: async (alertId) => {
      const { data: { user } } = await supabase.auth.getUser();
      await Alert.update(alertId, {
        status: 'dismissed',
        resolved_date: new Date().toISOString(),
        resolved_by: user.id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['alerts']);
      toast({
        title: "Alert Dismissed",
        description: "The alert has been dismissed.",
      });
    },
  });

  const handleResolveClick = (alert) => {
    setResolvingAlert(alert);
    setResolutionNotes("");
    setActionTaken("");
  };

  const handleConfirmResolve = () => {
    if (resolvingAlert) {
      resolveAlertMutation.mutate({
        alertId: resolvingAlert.id,
        notes: resolutionNotes,
        action: actionTaken
      });
    }
  };

  const getAlertIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-amber-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getAlertColor = (severity, alertType) => {
    if (severity === 'critical') {
      return 'border-l-4 border-l-red-500 bg-red-50/80';
    }

    if (alertType === 'expiring_tariff') {
      return 'border-l-4 border-l-yellow-500 bg-yellow-50/80';
    }

    if (alertType === 'idle_negotiation' && severity === 'warning') {
      return 'border-l-4 border-l-red-400 bg-red-50/60';
    }

    if (severity === 'warning') {
      return 'border-l-4 border-l-amber-500 bg-amber-50/80';
    }

    return 'border-l-4 border-l-blue-500 bg-blue-50/80';
  };

  return (
    <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
      <CardHeader className="border-b border-slate-100 pb-4">
        <CardTitle className="text-xl font-bold text-slate-900 flex items-center justify-between">
          <span>Active Alerts</span>
          {safeAlerts.length > 0 && (
            <Badge variant="secondary" className="bg-red-100 text-red-700">
              {safeAlerts.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {safeAlerts.length > 0 ? (
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {safeAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-lg ${getAlertColor(alert.severity, alert.alert_type)} transition-all hover:shadow-md relative`}
                onMouseEnter={() => setHoveredAlertId(alert.id)}
                onMouseLeave={() => setHoveredAlertId(null)}
              >
                <div className="flex items-start gap-3">
                  {getAlertIcon(alert.severity)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold text-slate-900 text-sm">
                        {alert.title}
                      </p>
                      {alert.assigned_to && (
                        <Badge variant="secondary" className="text-xs bg-slate-100">
                          Assigned
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mb-2">
                      {alert.message}
                    </p>
                    {alert.recommended_action && (
                      <p className="text-xs text-slate-700 font-medium bg-white/50 px-2 py-1 rounded mb-2">
                        → {alert.recommended_action}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-slate-400">
                        {format(new Date(alert.created_date), 'MMM d, h:mm a')}
                      </p>
                      <Badge variant="outline" className="text-xs capitalize">
                        {alert.alert_type.replace(/_/g, ' ')}
                      </Badge>
                    </div>

                    {hoveredAlertId === alert.id && (
                      <div className="flex items-center gap-1 mt-3 pt-3 border-t border-slate-200">
                        {alert.status === 'active' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => acknowledgeAlertMutation.mutate(alert.id)}
                            disabled={acknowledgeAlertMutation.isPending}
                          >
                            <Eye className="w-3 h-3" />
                            Acknowledge
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs gap-1 text-green-700 hover:text-green-800 hover:bg-green-50"
                          onClick={() => handleResolveClick(alert)}
                          disabled={resolveAlertMutation.isPending}
                        >
                          <Check className="w-3 h-3" />
                          Resolve
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs gap-1 text-slate-500 hover:text-slate-700"
                          onClick={() => dismissAlertMutation.mutate(alert.id)}
                          disabled={dismissAlertMutation.isPending}
                        >
                          <X className="w-3 h-3" />
                          Dismiss
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-3" />
            <p className="text-slate-900 font-medium mb-1">All Clear</p>
            <p className="text-sm text-slate-500">No active alerts at this time</p>
          </div>
        )}
      </CardContent>

      <Dialog open={!!resolvingAlert} onOpenChange={(open) => !open && setResolvingAlert(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Alert</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Alert</p>
              <p className="text-sm text-slate-600">{resolvingAlert?.title}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                What action was taken?
              </label>
              <Textarea
                placeholder="E.g., Contacted carrier, Updated tariff, Reassigned to team member..."
                value={actionTaken}
                onChange={(e) => setActionTaken(e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Resolution Notes (Optional)
              </label>
              <Textarea
                placeholder="Add any additional context or notes about the resolution..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setResolvingAlert(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmResolve}
              disabled={resolveAlertMutation.isPending || !actionTaken}
            >
              {resolveAlertMutation.isPending ? "Resolving..." : "Mark Resolved"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
