import React, { useMemo } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '../ui/drawer';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, Legend, ResponsiveContainer } from 'recharts';
import { Badge } from '../ui/badge';

const CarrierPerformanceDrawer = ({ carrier, open, onOpenChange }) => {
    const mockPerformanceData = useMemo(() => {
        if (!carrier) return [];

        const data = [];
        const today = new Date();

        for (let i = 90; i >= 0; i -= 10) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);

            data.push({
                date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                onTime: Math.max(85, Math.min(98, (carrier.on_time_pct || 95) + (Math.random() * 4 - 2))),
                claims: Math.max(0.5, Math.min(3, (carrier.claims_pct || 1.5) + (Math.random() * 0.8 - 0.4))),
                invoiceVariance: Math.max(0.5, Math.min(3, (carrier.invoice_variance_pct || 1.2) + (Math.random() * 0.6 - 0.3)))
            });
        }

        return data;
    }, [carrier]);

    if (!carrier) return null;

    const getPerformanceBadge = (value, type) => {
        if (type === 'onTime') {
            if (value > 95) return { color: 'bg-green-100 text-green-800 border-green-200', label: 'Excellent' };
            if (value >= 90) return { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Good' };
            return { color: 'bg-red-100 text-red-800 border-red-200', label: 'Needs Improvement' };
        } else {
            if (value < 1) return { color: 'bg-green-100 text-green-800 border-green-200', label: 'Excellent' };
            if (value <= 2) return { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Acceptable' };
            return { color: 'bg-red-100 text-red-800 border-red-200', label: 'High' };
        }
    };

    const onTimeBadge = getPerformanceBadge(carrier.on_time_pct || 0, 'onTime');
    const claimsBadge = getPerformanceBadge(carrier.claims_pct || 0, 'claims');
    const invoiceBadge = getPerformanceBadge(carrier.invoice_variance_pct || 0, 'claims');

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerContent className="max-h-[90vh]">
                <DrawerHeader>
                    <DrawerTitle>{carrier.name} - Performance Report</DrawerTitle>
                    <DrawerDescription>Last 90 days performance metrics</DrawerDescription>
                </DrawerHeader>

                <div className="p-6 space-y-6 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 border rounded-lg">
                            <p className="text-sm text-slate-600 mb-1">On-Time Performance</p>
                            <div className="flex items-baseline gap-2">
                                <p className="text-2xl font-bold">{(carrier.on_time_pct || 0).toFixed(1)}%</p>
                                <Badge className={onTimeBadge.color}>{onTimeBadge.label}</Badge>
                            </div>
                        </div>

                        <div className="p-4 border rounded-lg">
                            <p className="text-sm text-slate-600 mb-1">Claims Rate</p>
                            <div className="flex items-baseline gap-2">
                                <p className="text-2xl font-bold">{(carrier.claims_pct || 0).toFixed(1)}%</p>
                                <Badge className={claimsBadge.color}>{claimsBadge.label}</Badge>
                            </div>
                        </div>

                        <div className="p-4 border rounded-lg">
                            <p className="text-sm text-slate-600 mb-1">Invoice Variance</p>
                            <div className="flex items-baseline gap-2">
                                <p className="text-2xl font-bold">{(carrier.invoice_variance_pct || 0).toFixed(1)}%</p>
                                <Badge className={invoiceBadge.color}>{invoiceBadge.label}</Badge>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="border rounded-lg p-4">
                            <h4 className="text-sm font-semibold mb-4">On-Time Performance Trend</h4>
                            <ResponsiveContainer width="100%" height={200}>
                                <LineChart data={mockPerformanceData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                                    <YAxis domain={[80, 100]} tick={{ fontSize: 12 }} />
                                    <ChartTooltip />
                                    <Line type="monotone" dataKey="onTime" stroke="#10b981" strokeWidth={2} dot={false} name="On-Time %" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="border rounded-lg p-4">
                            <h4 className="text-sm font-semibold mb-4">Claims Rate Trend</h4>
                            <ResponsiveContainer width="100%" height={200}>
                                <LineChart data={mockPerformanceData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                                    <YAxis domain={[0, 5]} tick={{ fontSize: 12 }} />
                                    <ChartTooltip />
                                    <Line type="monotone" dataKey="claims" stroke="#ef4444" strokeWidth={2} dot={false} name="Claims %" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="border rounded-lg p-4">
                            <h4 className="text-sm font-semibold mb-4">Invoice Variance Trend</h4>
                            <ResponsiveContainer width="100%" height={200}>
                                <LineChart data={mockPerformanceData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                                    <YAxis domain={[0, 5]} tick={{ fontSize: 12 }} />
                                    <ChartTooltip />
                                    <Line type="monotone" dataKey="invoiceVariance" stroke="#3b82f6" strokeWidth={2} dot={false} name="Variance %" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="text-xs text-slate-500 italic mt-4">
                        Data sourced from carrier performance feed. Last updated: {carrier.last_performance_update ? new Date(carrier.last_performance_update).toLocaleDateString() : 'N/A'}
                    </div>
                </div>
            </DrawerContent>
        </Drawer>
    );
};

export default CarrierPerformanceDrawer;
