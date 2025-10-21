import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Customer, Carrier, Tariff, CSPEvent, Task, Interaction, Alert, Shipment, LostOpportunity, ReportSnapshot } from '../api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Skeleton } from '../components/ui/skeleton';
import { Download, FileText, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { UserPerformanceReport } from '../components/reports/UserPerformanceReport';

export default function ReportsPage() {
    const [activeTab, setActiveTab] = useState('performance');

    const { data: snapshots = [], isLoading: isLoadingSnapshots } = useQuery({
        queryKey: ["reportSnapshots"],
        queryFn: () => ReportSnapshot.list('-snapshot_date'),
        initialData: []
    });

    const { data: customers = [], isLoading: isLoadingCustomers } = useQuery({
        queryKey: ["customers"],
        queryFn: () => Customer.list(),
        initialData: []
    });

    const isLoading = isLoadingSnapshots || isLoadingCustomers;

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

            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
                <CardHeader>
                    <CardTitle>Uploaded Snapshots</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Snapshot Date</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Report Type</TableHead>
                                <TableHead>File Name</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell colSpan={5}><Skeleton className="h-6 w-full" /></TableCell>
                                    </TableRow>
                                ))
                            ) : snapshots.length > 0 ? (
                                snapshots.map(snapshot => {
                                    const customer = customers.find(c => c.id === snapshot.customer_id);
                                    return (
                                        <TableRow key={snapshot.id}>
                                            <TableCell>{format(new Date(snapshot.snapshot_date), 'MMM d, yyyy')}</TableCell>
                                            <TableCell>{customer?.name || 'Unknown'}</TableCell>
                                            <TableCell className="capitalize">{snapshot.report_type.replace('_', ' ')}</TableCell>
                                            <TableCell className="font-mono text-sm">{snapshot.file_name}</TableCell>
                                            <TableCell className="text-right">
                                                <a href={snapshot.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center p-2 rounded-md hover:bg-slate-100">
                                                    <Download className="h-4 w-4 text-slate-600" />
                                                </a>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-12 text-slate-500">
                                        <FileText className="h-8 w-8 mx-auto mb-2" />
                                        No report snapshots have been uploaded yet.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}