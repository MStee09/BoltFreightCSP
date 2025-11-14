import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Customer, Carrier, Tariff, CSPEvent, Task, Interaction, Alert, Shipment, LostOpportunity, ReportSnapshot } from '../api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Skeleton } from '../components/ui/skeleton';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Camera, FileText, TrendingUp, Calendar, BarChart3, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { UserPerformanceReport } from '../components/reports/UserPerformanceReport';
import { MyPerformance } from '../components/reports/MyPerformance';
import { useToast } from '../components/ui/use-toast';
import { supabase } from '../api/supabaseClient';
import { useUserRole } from '../hooks/useUserRole';
import { useImpersonation } from '../contexts/ImpersonationContext';

export default function ReportsPage() {
    const [activeTab, setActiveTab] = useState('performance');
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { isAdmin, loading: roleLoading } = useUserRole();
    const { isImpersonating, impersonatedUser } = useImpersonation();

    const { data: snapshots = [], isLoading: isLoadingSnapshots } = useQuery({
        queryKey: ["reportSnapshots"],
        queryFn: () => ReportSnapshot.list('-created_date'),
        initialData: [],
        refetchInterval: 60000,
    });

    const isLoading = isLoadingSnapshots;

    useEffect(() => {
        const checkAndCreateSnapshot = async () => {
            if (isLoadingSnapshots) return;

            const now = new Date();
            const lastSnapshot = snapshots[0];

            if (!lastSnapshot) {
                await callSnapshotFunction();
                return;
            }

            const lastSnapshotDate = new Date(lastSnapshot.created_date);
            const daysSinceLastSnapshot = Math.floor((now.getTime() - lastSnapshotDate.getTime()) / (1000 * 60 * 60 * 24));

            if (daysSinceLastSnapshot >= 1) {
                await callSnapshotFunction();
            }
        };

        checkAndCreateSnapshot();
    }, []);

    const callSnapshotFunction = async () => {
        try {
            const response = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-snapshot`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!response.ok) {
                throw new Error('Failed to generate snapshot');
            }

            queryClient.invalidateQueries(['reportSnapshots']);
        } catch (error) {
            console.error('Error generating snapshot:', error);
        }
    };

    const createSnapshotMutation = useMutation({
        mutationFn: async () => {
            const response = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-snapshot`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!response.ok) {
                throw new Error('Failed to generate snapshot');
            }

            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['reportSnapshots']);
            toast({
                title: "Snapshot Created",
                description: "Data snapshot has been saved successfully.",
            });
        },
        onError: (error) => {
            console.error('Error creating snapshot:', error);
            toast({
                title: "Error",
                description: "Failed to create data snapshot.",
                variant: "destructive",
            });
        },
    });

    if (roleLoading) {
        return (
            <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
                <Skeleton className="h-12 w-64 mb-8" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i}>
                            <CardContent className="p-6">
                                <Skeleton className="h-24 w-full" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    if (!isAdmin || isImpersonating) {
        return (
            <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                            <TrendingUp className="h-8 w-8 text-blue-600" />
                            {isImpersonating ? `${impersonatedUser?.full_name || impersonatedUser?.email}'s Performance` : 'My Performance'}
                        </h1>
                        <p className="text-slate-600 mt-1">
                            {isImpersonating ? 'Viewing performance as this user' : 'Track your activity and contributions'}
                        </p>
                    </div>
                </div>

                <MyPerformance />
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <TrendingUp className="h-8 w-8 text-blue-600" />
                        Reports
                    </h1>
                    <p className="text-slate-600 mt-1">Performance analytics and data snapshots</p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList>
                    <TabsTrigger value="performance">User Performance</TabsTrigger>
                    <TabsTrigger value="snapshots">Data Snapshots</TabsTrigger>
                </TabsList>

                <TabsContent value="performance" className="space-y-4">
                    <UserPerformanceReport />
                </TabsContent>

                <TabsContent value="snapshots" className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                        <Badge variant="secondary" className="gap-2 py-2 px-3">
                            <Clock className="h-4 w-4" />
                            Auto-generates daily
                        </Badge>
                        <Button
                            onClick={() => createSnapshotMutation.mutate()}
                            disabled={createSnapshotMutation.isPending}
                            className="gap-2"
                            variant="outline"
                        >
                            <Camera className="h-4 w-4" />
                            {createSnapshotMutation.isPending ? 'Creating...' : 'Create Snapshot Now'}
                        </Button>
                    </div>

                    <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BarChart3 className="h-5 w-5 text-blue-600" />
                                Data Snapshots
                            </CardTitle>
                            <p className="text-sm text-slate-600 mt-1">
                                Historical snapshots of key business metrics
                            </p>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {isLoading ? (
                                    Array(3).fill(0).map((_, i) => (
                                        <Card key={i}>
                                            <CardContent className="p-6">
                                                <Skeleton className="h-24 w-full" />
                                            </CardContent>
                                        </Card>
                                    ))
                                ) : snapshots.length > 0 ? (
                                    snapshots.map(snapshot => (
                                        <Card key={snapshot.id} className="border-l-4 border-l-blue-500">
                                            <CardContent className="p-6">
                                                <div className="flex items-start justify-between mb-4">
                                                    <div>
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <h3 className="font-semibold text-lg capitalize">
                                                                {snapshot.report_type.replace(/_/g, ' ')}
                                                            </h3>
                                                            <Badge variant="outline" className="gap-1">
                                                                <Calendar className="h-3 w-3" />
                                                                {format(new Date(snapshot.period_start), 'MMM d')} - {format(new Date(snapshot.period_end), 'MMM d, yyyy')}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-sm text-slate-500">
                                                            Created {format(new Date(snapshot.created_date), 'MMM d, yyyy h:mm a')}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                                                    <div className="bg-slate-50 rounded-lg p-4">
                                                        <div className="text-sm text-slate-600 mb-1">CSP Events</div>
                                                        <div className="text-2xl font-bold text-slate-900">
                                                            {snapshot.data?.totalCspEvents || 0}
                                                        </div>
                                                    </div>
                                                    <div className="bg-slate-50 rounded-lg p-4">
                                                        <div className="text-sm text-slate-600 mb-1">Interactions</div>
                                                        <div className="text-2xl font-bold text-slate-900">
                                                            {snapshot.data?.totalInteractions || 0}
                                                        </div>
                                                    </div>
                                                    <div className="bg-slate-50 rounded-lg p-4">
                                                        <div className="text-sm text-slate-600 mb-1">Active Tariffs</div>
                                                        <div className="text-2xl font-bold text-slate-900">
                                                            {snapshot.data?.activeTariffs || 0}
                                                        </div>
                                                    </div>
                                                    <div className="bg-slate-50 rounded-lg p-4">
                                                        <div className="text-sm text-slate-600 mb-1">Total Tariffs</div>
                                                        <div className="text-2xl font-bold text-slate-900">
                                                            {snapshot.data?.totalTariffs || 0}
                                                        </div>
                                                    </div>
                                                </div>

                                                {snapshot.data?.stageBreakdown && Object.keys(snapshot.data.stageBreakdown).length > 0 && (
                                                    <div className="mt-4 pt-4 border-t">
                                                        <h4 className="text-sm font-semibold text-slate-700 mb-3">CSP Stage Breakdown</h4>
                                                        <div className="flex flex-wrap gap-2">
                                                            {Object.entries(snapshot.data.stageBreakdown).map(([stage, count]) => (
                                                                <Badge key={stage} variant="secondary" className="capitalize">
                                                                    {stage.replace(/_/g, ' ')}: {count}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))
                                ) : (
                                    <Card>
                                        <CardContent className="p-12">
                                            <div className="text-center text-slate-500">
                                                <Camera className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                                                <h3 className="font-semibold text-lg mb-2">No Snapshots Yet</h3>
                                                <p className="text-sm mb-4">
                                                    Create your first data snapshot to track metrics over time
                                                </p>
                                                <Button
                                                    onClick={() => createSnapshotMutation.mutate()}
                                                    disabled={createSnapshotMutation.isPending}
                                                    className="gap-2"
                                                >
                                                    <Camera className="h-4 w-4" />
                                                    Create First Snapshot
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}