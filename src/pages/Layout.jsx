

import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "../utils";
import { useUserRole } from "../hooks/useUserRole";
import { supabase } from "../api/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { Tariff, CSPEvent, Alert, Customer, Carrier } from "../api/entities";
import { differenceInDays } from "date-fns";
import {
  LayoutDashboard,
  Users,
  Truck,
  FileText,
  Kanban,
  Calendar,
  AreaChart,
  Settings,
  Shield,
  HelpCircle
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "../components/ui/sidebar";
import { Badge } from "../components/ui/badge";
import { DashboardChatbot } from "../components/dashboard/DashboardChatbot";
import NotificationBell from "../components/notifications/NotificationBell";


const navigationItems = [
  {
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: LayoutDashboard,
  },
  {
    title: "Customers",
    url: createPageUrl("Customers"),
    icon: Users,
  },
  {
    title: "Carriers",
    url: createPageUrl("Carriers"),
    icon: Truck,
  },
  {
    title: "Tariffs",
    url: createPageUrl("Tariffs"),
    icon: FileText,
  },
  {
    title: "Pipeline",
    url: createPageUrl("Pipeline"),
    icon: Kanban,
  },
  {
    title: "Calendar",
    url: createPageUrl("CalendarView"),
    icon: Calendar,
  },
  {
    title: "Reports",
    url: createPageUrl("Reports"),
    icon: AreaChart,
  },
  {
    title: "Help",
    url: createPageUrl("Help"),
    icon: HelpCircle,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const { isAdmin, userProfile } = useUserRole();
  const [currentUser, setCurrentUser] = useState(null);

  const { data: rawCustomers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => Customer.list(),
  });

  const { data: rawCarriers = [] } = useQuery({
    queryKey: ['carriers'],
    queryFn: () => Carrier.list(),
  });

  const { data: rawTariffs = [] } = useQuery({
    queryKey: ['tariffs'],
    queryFn: () => Tariff.list(),
  });

  const { data: rawCspEvents = [] } = useQuery({
    queryKey: ['csp_events'],
    queryFn: () => CSPEvent.list(),
  });

  const { data: rawAlerts = [] } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => Alert.filter({ status: 'active' }),
  });

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const toArray = (data) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data.data && Array.isArray(data.data)) return data.data;
    return [];
  };

  const customers = toArray(rawCustomers);
  const carriers = toArray(rawCarriers);
  const tariffs = toArray(rawTariffs);
  const cspEvents = toArray(rawCspEvents);
  const alerts = toArray(rawAlerts);

  const activeCustomersCount = customers.filter(c => c.status === 'active').length;
  const activeCarriersCount = carriers.length;

  const expiringTariffsCount = tariffs.filter(t => {
    if (!t?.expiry_date || t.status !== 'active') return false;
    const daysUntilExpiry = differenceInDays(new Date(t.expiry_date), new Date());
    return daysUntilExpiry <= 90 && daysUntilExpiry >= 0;
  }).length;

  const staleNegotiationsCount = cspEvents.filter(e => {
    if (!e?.days_in_stage) return false;
    return e.days_in_stage > 14 && (e.stage === 'rfp_sent' || e.stage === 'qa_round');
  }).length;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <Sidebar className="border-r border-slate-200 bg-white">
          <SidebarHeader className="border-b border-slate-200 p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                  <Truck className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 text-lg">FreightOps</h2>
                  <p className="text-xs text-slate-500">CSP & Carrier Management</p>
                </div>
              </div>
              <NotificationBell />
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-3">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-2">
                Navigation
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => {
                    let badgeCount = null;
                    let badgeVariant = "destructive";

                    if (item.title === "Pipeline" && staleNegotiationsCount > 0) {
                      badgeCount = staleNegotiationsCount;
                      badgeVariant = "default";
                    } else if (item.title === "Tariffs" && expiringTariffsCount > 0) {
                      badgeCount = expiringTariffsCount;
                      badgeVariant = "destructive";
                    }

                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-xl mb-1 ${
                            location.pathname === item.url
                              ? 'bg-blue-50 text-blue-700 font-medium shadow-sm'
                              : 'text-slate-600'
                          }`}
                        >
                          <Link to={item.url} className="flex items-center gap-3 px-4 py-3">
                            <item.icon className="w-5 h-5" />
                            <span className="flex-1">{item.title}</span>
                            {badgeCount && (
                              <Badge variant={badgeVariant} className="ml-auto text-xs">
                                {badgeCount}
                              </Badge>
                            )}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup className="mt-4">
              <SidebarGroupLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-2">
                Quick Stats
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <div className="px-3 py-2 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Active Customers</span>
                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 font-semibold">
                      {activeCustomersCount}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Active Carriers</span>
                    <Badge variant="secondary" className="bg-green-50 text-green-700 font-semibold">
                      {activeCarriersCount}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Expiring Soon</span>
                    <Badge variant="secondary" className="bg-amber-50 text-amber-700 font-semibold">
                      {expiringTariffsCount}
                    </Badge>
                  </div>
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-slate-200 p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-slate-200 to-slate-300 rounded-full flex items-center justify-center">
                  <span className="text-slate-700 font-semibold text-sm">
                    {userProfile?.full_name?.charAt(0) || currentUser?.email?.charAt(0) || 'U'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 text-sm truncate">
                    {userProfile?.full_name || currentUser?.email || 'User'}
                  </p>
                  <div className="flex items-center gap-1">
                    {isAdmin && (
                      <Badge variant="default" className="text-xs gap-1 px-1 py-0">
                        <Shield className="h-2.5 w-2.5" />
                        Admin
                      </Badge>
                    )}
                    {!isAdmin && (
                      <p className="text-xs text-slate-500 truncate">
                        {currentUser?.email}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col">
          <header className="bg-white border-b border-slate-200 px-6 py-4 lg:hidden">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="hover:bg-slate-100 p-2 rounded-lg transition-colors" />
                <h1 className="text-xl font-bold text-slate-900">FreightOps</h1>
              </div>
              <NotificationBell />
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
        <DashboardChatbot />
      </div>
    </SidebarProvider>
  );
}

