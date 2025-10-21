import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Customer, Carrier, Tariff, CSPEvent, Task, Interaction, Alert, Shipment, LostOpportunity, ReportSnapshot } from "../api/entities";
import { format, differenceInDays } from "date-fns";
import ExpiringTariffs from "../components/dashboard/ExpiringTariffs";
import AlertsPanel from "../components/dashboard/AlertsPanel";
import IdleNegotiations from "../components/dashboard/IdleNegotiations";
import TodayTasks from "../components/dashboard/TodayTasks";
import PipelineSnapshot from "../components/dashboard/PipelineSnapshot";
import ReportUploadPrompt from "../components/dashboard/ReportUploadPrompt";
import MetricCard from "../components/dashboard/MetricCard";
import { Users, Truck, FileText, Trash2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { useToast } from "../components/ui/use-toast";
import { clearMockData } from "../utils/mockData";

function toArray(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (data.data && Array.isArray(data.data)) return data.data;
  if (data.results && Array.isArray(data.results)) return data.results;
  return [];
}

export default function Dashboard() {
  const [isLoadingMockData, setIsLoadingMockData] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: rawCustomers, isLoading: loadingCustomers } = useQuery({ queryKey: ['customers'], queryFn: () => Customer.list() });
  const { data: rawCarriers } = useQuery({ queryKey: ['carriers'], queryFn: () => Carrier.list() });
  const { data: rawTariffs } = useQuery({ queryKey: ['tariffs'], queryFn: () => Tariff.list() });
  const { data: rawCspEvents } = useQuery({ queryKey: ['csp_events'], queryFn: () => CSPEvent.list() });
  const { data: rawTasks } = useQuery({ queryKey: ['tasks'], queryFn: () => Task.list('-due_date') });
  const { data: rawAlerts } = useQuery({ queryKey: ['alerts'], queryFn: () => Alert.filter({ status: 'active', order_by: '-created_date' }) });

  const customers = toArray(rawCustomers);
  const carriers = toArray(rawCarriers);
  const tariffs = toArray(rawTariffs);
  const cspEvents = toArray(rawCspEvents);
  const tasks = toArray(rawTasks);
  const alerts = toArray(rawAlerts);

  const isLoading = loadingCustomers;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const expiringTariffs = tariffs.filter(t => {
    if (!t?.expiry_date || t.status !== 'active') return false;
    const daysUntilExpiry = differenceInDays(new Date(t.expiry_date), new Date());
    return daysUntilExpiry <= 90 && daysUntilExpiry >= 0;
  });

  const idleNegotiations = cspEvents.filter(e => {
    if (!e?.days_in_stage) return false;
    return e.days_in_stage > 14 && (e.stage === 'rfp_sent' || e.stage === 'qa_round');
  });

  const today = new Date().toISOString().split('T')[0];
  const todayTasks = tasks.filter(t => t.due_date === today && t.status !== 'completed');

  const handleClearMockData = async () => {
    setIsLoadingMockData(true);
    const result = await clearMockData();
    setIsLoadingMockData(false);

    if (result.success) {
      toast({
        title: "Success!",
        description: result.message,
      });
      queryClient.invalidateQueries();
    } else {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="p-4 lg:p-6 max-w-[1800px] mx-auto">
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-1">Command Center</h1>
              <p className="text-sm text-slate-600">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
            </div>
            <Button
              onClick={handleClearMockData}
              disabled={isLoadingMockData}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Clear Mock Data
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <MetricCard title="Active Customers" value={customers.length} icon={Users} />
          <MetricCard title="Managed Carriers" value={carriers.length} icon={Truck} />
          <MetricCard title="Active Tariffs" value={tariffs.filter(t => t.status === 'active').length} icon={FileText} />
          <MetricCard title="Open CSP Events" value={cspEvents.filter(e => e.status === 'in_progress').length} icon={Users} color="blue" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 mb-3">
          <div className="xl:col-span-8">
            <PipelineSnapshot events={cspEvents} />
          </div>
          <div className="xl:col-span-4 space-y-3">
            <AlertsPanel alerts={alerts} />
            <TodayTasks tasks={todayTasks} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-3">
          <ExpiringTariffs tariffs={expiringTariffs} customers={customers} />
          <IdleNegotiations events={idleNegotiations} customers={customers} />
          <ReportUploadPrompt customers={customers} />
        </div>

      </div>
    </div>
  );
}