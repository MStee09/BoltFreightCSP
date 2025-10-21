
import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { AlertTriangle, AlertCircle, Info, CheckCircle } from "lucide-react";
import { format } from "date-fns";

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

  const getAlertColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'border-l-red-500 bg-red-50';
      case 'warning':
        return 'border-l-amber-500 bg-amber-50';
      default:
        return 'border-l-blue-500 bg-blue-50';
    }
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
                className={`p-4 rounded-lg border-l-4 ${getAlertColor(alert.severity)} transition-all hover:shadow-md`}
              >
                <div className="flex items-start gap-3">
                  {getAlertIcon(alert.severity)}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-sm mb-1">
                      {alert.title}
                    </p>
                    <p className="text-xs text-slate-600 mb-2">
                      {alert.message}
                    </p>
                    {alert.recommended_action && (
                      <p className="text-xs text-slate-500 italic">
                        → {alert.recommended_action}
                      </p>
                    )}
                    <p className="text-xs text-slate-400 mt-2">
                      {format(new Date(alert.created_date), 'MMM d, h:mm a')}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs capitalize">
                    {alert.alert_type.replace(/_/g, ' ')}
                  </Badge>
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
    </Card>
  );
}
