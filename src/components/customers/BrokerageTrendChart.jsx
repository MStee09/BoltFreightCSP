import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { TrendingUp, BarChart as BarChartIcon, RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, ComposedChart, Area } from 'recharts';
import { format } from 'date-fns';
import { getSnapshotTrends, backfillSnapshotsFromCspEvents } from '../../utils/snapshotUtils';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../ui/use-toast';
import { Badge } from '../ui/badge';

export default function BrokerageTrendChart({ customerId = null, cspEventId = null }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isBackfilling, setIsBackfilling] = useState(false);

    const { data: snapshots = [], isLoading, refetch } = useQuery({
        queryKey: ['strategy_snapshots', customerId, cspEventId],
        queryFn: () => getSnapshotTrends({ customerId, cspEventId, limit: 12 }),
        refetchOnWindowFocus: false
    });

    const handleBackfill = async () => {
        setIsBackfilling(true);
        try {
            const results = await backfillSnapshotsFromCspEvents(user?.id);
            if (results.length > 0) {
                toast({
                    title: "Historical Data Loaded",
                    description: `Successfully loaded ${results.length} historical snapshots from past CSP events.`,
                });
                refetch();
            } else {
                toast({
                    title: "No New Data",
                    description: "All historical CSP events have already been loaded.",
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to load historical data. Please try again.",
                variant: "destructive"
            });
        } finally {
            setIsBackfilling(false);
        }
    };

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        Brokerage Growth Trends
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] flex items-center justify-center text-slate-500">
                        Loading trend data...
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (snapshots.length === 0) {
        return (
            <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-amber-600" />
                        Brokerage Growth Trends
                    </CardTitle>
                    <CardDescription>Track how your brokerage utilization evolves over time</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="text-center py-8">
                        <BarChartIcon className="w-12 h-12 mx-auto text-amber-300 mb-4" />
                        <p className="text-slate-600 mb-4">
                            No trend data available yet. Upload transaction detail reports to start tracking brokerage growth.
                        </p>
                        <Button
                            onClick={handleBackfill}
                            disabled={isBackfilling}
                            variant="outline"
                            className="gap-2"
                        >
                            {isBackfilling ? (
                                <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    Loading Historical Data...
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="w-4 h-4" />
                                    Load Historical CSP Data
                                </>
                            )}
                        </Button>
                        <p className="text-xs text-slate-500 mt-2">
                            This will import data from your past CSP events to show trends
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const trendData = snapshots.map(snapshot => ({
        date: format(new Date(snapshot.snapshot_date), 'MMM dd, yyyy'),
        shortDate: format(new Date(snapshot.snapshot_date), 'MMM dd'),
        brokeragePercentage: parseFloat(snapshot.brokerage_percentage || 0),
        customerDirectPercentage: parseFloat(snapshot.customer_direct_percentage || 0),
        brokerageSpend: parseFloat(snapshot.brokerage_spend || 0),
        customerDirectSpend: parseFloat(snapshot.customer_direct_spend || 0),
        totalSpend: parseFloat(snapshot.total_spend || 0),
        totalShipments: snapshot.total_shipments || 0
    }));

    const currentBrokerage = trendData[trendData.length - 1]?.brokeragePercentage || 0;
    const previousBrokerage = trendData[0]?.brokeragePercentage || 0;
    const brokerageChange = currentBrokerage - previousBrokerage;
    const isGrowing = brokerageChange > 0;

    const modeBreakdownData = snapshots[snapshots.length - 1]?.mode_breakdown || [];
    const modeChartData = Array.isArray(modeBreakdownData) ? modeBreakdownData.map(mode => ({
        mode: mode.mode || 'Unknown',
        brokeragePercentage: parseFloat(mode.brokerage_percentage || 0),
        customerDirectPercentage: parseFloat(mode.customer_direct_percentage || 0),
        totalSpend: parseFloat(mode.total_spend || 0)
    })) : [];

    return (
        <div className="space-y-6">
            <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-purple-600" />
                                Brokerage Growth Trends
                            </CardTitle>
                            <CardDescription>
                                Tracking brokerage utilization across {snapshots.length} data points
                            </CardDescription>
                        </div>
                        {!cspEventId && (
                            <Button
                                onClick={handleBackfill}
                                disabled={isBackfilling}
                                variant="outline"
                                size="sm"
                                className="gap-2"
                            >
                                {isBackfilling ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        Loading...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="w-4 h-4" />
                                        Load Historical Data
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className={`rounded-lg p-4 ${isGrowing ? 'bg-green-100 border-2 border-green-300' : 'bg-slate-100 border-2 border-slate-300'}`}>
                            <p className="text-sm font-medium text-slate-700 mb-1">Current Brokerage %</p>
                            <p className="text-3xl font-bold text-slate-900">{currentBrokerage.toFixed(1)}%</p>
                            {trendData.length > 1 && (
                                <div className="flex items-center gap-1 mt-2">
                                    <TrendingUp className={`w-4 h-4 ${isGrowing ? 'text-green-600' : 'text-red-600'} ${isGrowing ? '' : 'rotate-180'}`} />
                                    <span className={`text-sm font-medium ${isGrowing ? 'text-green-700' : 'text-red-700'}`}>
                                        {isGrowing ? '+' : ''}{brokerageChange.toFixed(1)}% from first snapshot
                                    </span>
                                </div>
                            )}
                        </div>
                        <div className="bg-purple-100 border-2 border-purple-300 rounded-lg p-4">
                            <p className="text-sm font-medium text-slate-700 mb-1">Latest Brokerage Spend</p>
                            <p className="text-3xl font-bold text-slate-900">
                                ${Math.round(trendData[trendData.length - 1]?.brokerageSpend || 0).toLocaleString()}
                            </p>
                            <p className="text-xs text-slate-600 mt-2">
                                of ${Math.round(trendData[trendData.length - 1]?.totalSpend || 0).toLocaleString()} total
                            </p>
                        </div>
                        <div className="bg-slate-100 border-2 border-slate-300 rounded-lg p-4">
                            <p className="text-sm font-medium text-slate-700 mb-1">Data Points</p>
                            <p className="text-3xl font-bold text-slate-900">{snapshots.length}</p>
                            <p className="text-xs text-slate-600 mt-2">
                                {format(new Date(snapshots[0].snapshot_date), 'MMM yyyy')} - {format(new Date(snapshots[snapshots.length - 1].snapshot_date), 'MMM yyyy')}
                            </p>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-sm font-semibold mb-3">Brokerage % Over Time</h4>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={trendData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis
                                        dataKey="shortDate"
                                        angle={-45}
                                        textAnchor="end"
                                        height={80}
                                        tick={{ fontSize: 12 }}
                                    />
                                    <YAxis
                                        yAxisId="left"
                                        label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft' }}
                                    />
                                    <Tooltip
                                        formatter={(value, name) => {
                                            if (name === 'brokeragePercentage') return [`${value.toFixed(1)}%`, 'Brokerage %'];
                                            if (name === 'customerDirectPercentage') return [`${value.toFixed(1)}%`, 'Customer Direct %'];
                                            return [value, name];
                                        }}
                                        labelFormatter={(label, payload) => payload[0]?.payload?.date || label}
                                    />
                                    <Legend />
                                    <Area
                                        yAxisId="left"
                                        type="monotone"
                                        dataKey="brokeragePercentage"
                                        fill="#9333ea"
                                        stroke="#9333ea"
                                        fillOpacity={0.3}
                                        name="Brokerage %"
                                    />
                                    <Line
                                        yAxisId="left"
                                        type="monotone"
                                        dataKey="customerDirectPercentage"
                                        stroke="#94a3b8"
                                        strokeWidth={2}
                                        dot={{ fill: '#94a3b8' }}
                                        name="Customer Direct %"
                                    />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {modeChartData.length > 0 && (
                        <div>
                            <h4 className="text-sm font-semibold mb-3">Latest Snapshot: Brokerage % by Mode</h4>
                            <div className="h-[250px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={modeChartData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="mode" />
                                        <YAxis label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft' }} />
                                        <Tooltip
                                            formatter={(value, name) => {
                                                if (name === 'brokeragePercentage') return [`${value.toFixed(1)}%`, 'Brokerage'];
                                                if (name === 'customerDirectPercentage') return [`${value.toFixed(1)}%`, 'Customer Direct'];
                                                return [value, name];
                                            }}
                                        />
                                        <Legend />
                                        <Bar dataKey="brokeragePercentage" fill="#9333ea" name="Brokerage %" />
                                        <Bar dataKey="customerDirectPercentage" fill="#94a3b8" name="Customer Direct %" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
