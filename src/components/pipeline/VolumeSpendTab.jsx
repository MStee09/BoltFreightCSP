import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CSPEvent, Document } from '../../api/entities';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { useToast } from '../ui/use-toast';
import { Calculator, Save, TrendingUp, DollarSign, Package, Calendar as CalendarIcon, AlertCircle, Sparkles, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';
import { supabase } from '../../api/supabaseClient';

export default function VolumeSpendTab({ cspEvent, cspEventId }) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        total_shipments: cspEvent?.total_shipments || '',
        data_timeframe_months: cspEvent?.data_timeframe_months || '',
        data_start_date: cspEvent?.data_start_date || null,
        data_end_date: cspEvent?.data_end_date || null,
        projected_monthly_spend: cspEvent?.projected_monthly_spend || '',
        projected_annual_spend: cspEvent?.projected_annual_spend || '',
        projected_monthly_revenue: cspEvent?.projected_monthly_revenue || '',
        projected_annual_revenue: cspEvent?.projected_annual_revenue || '',
        minimum_annual_spend_threshold: cspEvent?.minimum_annual_spend_threshold || ''
    });

    const hasData = cspEvent?.total_shipments || cspEvent?.projected_annual_spend;

    const updateProjectionsMutation = useMutation({
        mutationFn: async (data) => {
            await CSPEvent.update(cspEventId, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['csp_event', cspEventId]);
            setIsEditing(false);
            toast({
                title: "Success",
                description: "Volume and spend projections updated successfully.",
            });
        },
        onError: (error) => {
            toast({
                title: "Error",
                description: error.message || "Failed to update projections.",
                variant: "destructive",
            });
        }
    });

    const calculateProjectionsMutation = useMutation({
        mutationFn: async () => {
            const { data: documents, error } = await supabase
                .from('documents')
                .select('*')
                .eq('csp_event_id', cspEventId)
                .eq('document_type', 'strategy');

            if (error) throw error;

            if (!documents || documents.length === 0) {
                throw new Error('No strategy documents found. Please upload shipment data first.');
            }

            const strategyDoc = documents[0];
            const metadata = strategyDoc.metadata || {};

            const calculations = {
                total_shipments: metadata.total_records || metadata.shipment_count || '',
                data_timeframe_months: metadata.timeframe_months || '',
                data_start_date: metadata.date_range?.start || null,
                data_end_date: metadata.date_range?.end || null,
                projected_monthly_spend: metadata.total_spend ? Math.round(metadata.total_spend / (metadata.timeframe_months || 12)) : '',
                projected_annual_spend: metadata.total_spend || '',
                projected_monthly_revenue: metadata.total_revenue ? Math.round(metadata.total_revenue / (metadata.timeframe_months || 12)) : '',
                projected_annual_revenue: metadata.total_revenue || ''
            };

            return calculations;
        },
        onSuccess: (calculations) => {
            setFormData(prev => ({
                ...prev,
                ...calculations
            }));
            setIsEditing(true);
            toast({
                title: "Calculations Complete",
                description: "Review the calculated values and adjust if needed.",
            });
        },
        onError: (error) => {
            toast({
                title: "Calculation Failed",
                description: error.message,
                variant: "destructive",
            });
        }
    });

    const handleSave = () => {
        updateProjectionsMutation.mutate(formData);
    };

    const handleValueChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const meetsThreshold = () => {
        if (!formData.projected_annual_spend || !formData.minimum_annual_spend_threshold) {
            return null;
        }
        return Number(formData.projected_annual_spend) >= Number(formData.minimum_annual_spend_threshold);
    };

    const thresholdStatus = meetsThreshold();

    return (
        <div className="space-y-4">
            {!hasData && (
                <Card className="border-blue-200 bg-blue-50/50">
                    <CardContent className="pt-6">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-blue-100 rounded-lg">
                                <Sparkles className="w-6 h-6 text-blue-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-blue-900 mb-1">Auto-Calculate from Strategy Data</h3>
                                <p className="text-sm text-blue-700 mb-3">
                                    Upload shipment data in the Strategy tab to automatically calculate projections, or manually enter data below.
                                </p>
                                <div className="flex gap-2">
                                    <Button
                                        onClick={() => calculateProjectionsMutation.mutate()}
                                        disabled={calculateProjectionsMutation.isPending}
                                        size="sm"
                                        className="bg-blue-600 hover:bg-blue-700"
                                    >
                                        <Calculator className="w-4 h-4 mr-2" />
                                        {calculateProjectionsMutation.isPending ? 'Calculating...' : 'Calculate from Strategy Data'}
                                    </Button>
                                    <Button
                                        onClick={() => setIsEditing(true)}
                                        size="sm"
                                        variant="outline"
                                    >
                                        Enter Manually
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Package className="w-5 h-5 text-slate-600" />
                                Volume Metrics
                            </CardTitle>
                            <CardDescription>Shipment volume and data timeframe</CardDescription>
                        </div>
                        {!isEditing && hasData && (
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => calculateProjectionsMutation.mutate()}
                                    disabled={calculateProjectionsMutation.isPending}
                                >
                                    <Calculator className="w-4 h-4 mr-2" />
                                    Recalculate
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsEditing(true)}
                                >
                                    Edit
                                </Button>
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="total_shipments">Total Shipments</Label>
                            {isEditing ? (
                                <Input
                                    id="total_shipments"
                                    type="number"
                                    value={formData.total_shipments}
                                    onChange={(e) => handleValueChange('total_shipments', e.target.value)}
                                    placeholder="e.g., 5000"
                                />
                            ) : (
                                <p className="text-2xl font-bold text-slate-900">
                                    {formData.total_shipments ? Number(formData.total_shipments).toLocaleString() : '-'}
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="data_timeframe_months">Timeframe (Months)</Label>
                            {isEditing ? (
                                <Input
                                    id="data_timeframe_months"
                                    type="number"
                                    value={formData.data_timeframe_months}
                                    onChange={(e) => handleValueChange('data_timeframe_months', e.target.value)}
                                    placeholder="e.g., 12"
                                />
                            ) : (
                                <p className="text-2xl font-bold text-slate-900">
                                    {formData.data_timeframe_months || '-'}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Data Start Date</Label>
                            {isEditing ? (
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !formData.data_start_date && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {formData.data_start_date ? format(new Date(formData.data_start_date), "PP") : "Select date"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={formData.data_start_date ? new Date(formData.data_start_date) : undefined}
                                            onSelect={(date) => handleValueChange('data_start_date', date ? format(date, 'yyyy-MM-dd') : null)}
                                        />
                                    </PopoverContent>
                                </Popover>
                            ) : (
                                <p className="text-base font-medium text-slate-900">
                                    {formData.data_start_date ? format(new Date(formData.data_start_date), "MMM d, yyyy") : '-'}
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>Data End Date</Label>
                            {isEditing ? (
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !formData.data_end_date && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {formData.data_end_date ? format(new Date(formData.data_end_date), "PP") : "Select date"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={formData.data_end_date ? new Date(formData.data_end_date) : undefined}
                                            onSelect={(date) => handleValueChange('data_end_date', date ? format(date, 'yyyy-MM-dd') : null)}
                                        />
                                    </PopoverContent>
                                </Popover>
                            ) : (
                                <p className="text-base font-medium text-slate-900">
                                    {formData.data_end_date ? format(new Date(formData.data_end_date), "MMM d, yyyy") : '-'}
                                </p>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-slate-600" />
                        Spend Projections
                    </CardTitle>
                    <CardDescription>Projected costs for carrier qualification</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="projected_monthly_spend">Monthly Spend</Label>
                            {isEditing ? (
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                                    <Input
                                        id="projected_monthly_spend"
                                        type="number"
                                        value={formData.projected_monthly_spend}
                                        onChange={(e) => handleValueChange('projected_monthly_spend', e.target.value)}
                                        placeholder="50000"
                                        className="pl-7"
                                    />
                                </div>
                            ) : (
                                <p className="text-2xl font-bold text-slate-900">
                                    {formData.projected_monthly_spend ? `$${Number(formData.projected_monthly_spend).toLocaleString()}` : '-'}
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="projected_annual_spend">Annual Spend</Label>
                            {isEditing ? (
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                                    <Input
                                        id="projected_annual_spend"
                                        type="number"
                                        value={formData.projected_annual_spend}
                                        onChange={(e) => handleValueChange('projected_annual_spend', e.target.value)}
                                        placeholder="600000"
                                        className="pl-7"
                                    />
                                </div>
                            ) : (
                                <p className="text-2xl font-bold text-slate-900">
                                    {formData.projected_annual_spend ? `$${Number(formData.projected_annual_spend).toLocaleString()}` : '-'}
                                </p>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-slate-600" />
                        Revenue Projections
                    </CardTitle>
                    <CardDescription>Expected revenue including markup</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="projected_monthly_revenue">Monthly Revenue</Label>
                            {isEditing ? (
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                                    <Input
                                        id="projected_monthly_revenue"
                                        type="number"
                                        value={formData.projected_monthly_revenue}
                                        onChange={(e) => handleValueChange('projected_monthly_revenue', e.target.value)}
                                        placeholder="55000"
                                        className="pl-7"
                                    />
                                </div>
                            ) : (
                                <p className="text-2xl font-bold text-slate-900">
                                    {formData.projected_monthly_revenue ? `$${Number(formData.projected_monthly_revenue).toLocaleString()}` : '-'}
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="projected_annual_revenue">Annual Revenue</Label>
                            {isEditing ? (
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                                    <Input
                                        id="projected_annual_revenue"
                                        type="number"
                                        value={formData.projected_annual_revenue}
                                        onChange={(e) => handleValueChange('projected_annual_revenue', e.target.value)}
                                        placeholder="660000"
                                        className="pl-7"
                                    />
                                </div>
                            ) : (
                                <p className="text-2xl font-bold text-slate-900">
                                    {formData.projected_annual_revenue ? `$${Number(formData.projected_annual_revenue).toLocaleString()}` : '-'}
                                </p>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className={cn(
                "border-2",
                thresholdStatus === true && "border-green-300 bg-green-50/30",
                thresholdStatus === false && "border-amber-300 bg-amber-50/30"
            )}>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <AlertCircle className={cn(
                            "w-5 h-5",
                            thresholdStatus === true && "text-green-600",
                            thresholdStatus === false && "text-amber-600",
                            thresholdStatus === null && "text-slate-600"
                        )} />
                        Carrier Participation Threshold
                    </CardTitle>
                    <CardDescription>Minimum annual spend carriers require to participate</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="minimum_annual_spend_threshold">Minimum Annual Spend</Label>
                        {isEditing ? (
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                                <Input
                                    id="minimum_annual_spend_threshold"
                                    type="number"
                                    value={formData.minimum_annual_spend_threshold}
                                    onChange={(e) => handleValueChange('minimum_annual_spend_threshold', e.target.value)}
                                    placeholder="500000"
                                    className="pl-7"
                                />
                            </div>
                        ) : (
                            <p className="text-2xl font-bold text-slate-900">
                                {formData.minimum_annual_spend_threshold ? `$${Number(formData.minimum_annual_spend_threshold).toLocaleString()}` : '-'}
                            </p>
                        )}
                    </div>

                    {thresholdStatus !== null && (
                        <div className={cn(
                            "p-4 rounded-lg flex items-start gap-3",
                            thresholdStatus ? "bg-green-100 border border-green-300" : "bg-amber-100 border border-amber-300"
                        )}>
                            {thresholdStatus ? (
                                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                            ) : (
                                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                            )}
                            <div>
                                <p className={cn(
                                    "font-semibold text-sm mb-1",
                                    thresholdStatus ? "text-green-900" : "text-amber-900"
                                )}>
                                    {thresholdStatus ? "Meets Threshold" : "Below Threshold"}
                                </p>
                                <p className={cn(
                                    "text-sm",
                                    thresholdStatus ? "text-green-700" : "text-amber-700"
                                )}>
                                    {thresholdStatus
                                        ? "This CSP meets carrier minimum spend requirements and should attract participation."
                                        : "This CSP is below typical carrier thresholds. Consider bundling with other customers or lanes to increase participation."}
                                </p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {isEditing && (
                <div className="flex justify-end gap-2">
                    <Button
                        variant="outline"
                        onClick={() => {
                            setFormData({
                                total_shipments: cspEvent?.total_shipments || '',
                                data_timeframe_months: cspEvent?.data_timeframe_months || '',
                                data_start_date: cspEvent?.data_start_date || null,
                                data_end_date: cspEvent?.data_end_date || null,
                                projected_monthly_spend: cspEvent?.projected_monthly_spend || '',
                                projected_annual_spend: cspEvent?.projected_annual_spend || '',
                                projected_monthly_revenue: cspEvent?.projected_monthly_revenue || '',
                                projected_annual_revenue: cspEvent?.projected_annual_revenue || '',
                                minimum_annual_spend_threshold: cspEvent?.minimum_annual_spend_threshold || ''
                            });
                            setIsEditing(false);
                        }}
                        disabled={updateProjectionsMutation.isPending}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={updateProjectionsMutation.isPending}
                    >
                        <Save className="w-4 h-4 mr-2" />
                        {updateProjectionsMutation.isPending ? 'Saving...' : 'Save Projections'}
                    </Button>
                </div>
            )}
        </div>
    );
}
