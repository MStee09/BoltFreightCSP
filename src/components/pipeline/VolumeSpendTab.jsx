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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { Calculator, Save, DollarSign, Package, Calendar as CalendarIcon, AlertCircle, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';
import { supabase } from '../../api/supabaseClient';

export default function VolumeSpendTab({ cspEvent, cspEventId }) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isEditing, setIsEditing] = useState(false);
    const [showOverridePrompt, setShowOverridePrompt] = useState(false);
    const [calculatedData, setCalculatedData] = useState(null);
    const [formData, setFormData] = useState({
        total_shipments: cspEvent?.total_shipments || '',
        monthly_shipments: cspEvent?.monthly_shipments || '',
        data_timeframe_months: cspEvent?.data_timeframe_months || '',
        data_start_date: cspEvent?.data_start_date || null,
        data_end_date: cspEvent?.data_end_date || null,
        projected_monthly_spend: cspEvent?.projected_monthly_spend || '',
        projected_annual_spend: cspEvent?.projected_annual_spend || ''
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

            const totalShipments = metadata.total_records || metadata.shipment_count || 0;
            const timeframeMonths = metadata.timeframe_months || 12;
            const totalSpend = metadata.total_spend || 0;
            const totalRevenue = metadata.total_revenue || 0;

            const avgCostPerShipment = totalShipments > 0 ? totalSpend / totalShipments : 0;
            const monthlyShipments = timeframeMonths > 0 ? Math.round(totalShipments / timeframeMonths) : 0;
            const annualShipments = Math.round((totalShipments / timeframeMonths) * 12);
            const annualSpend = Math.round(avgCostPerShipment * annualShipments);
            const monthlySpend = Math.round(annualSpend / 12);

            const calculations = {
                total_shipments: totalShipments,
                monthly_shipments: monthlyShipments,
                data_timeframe_months: timeframeMonths,
                data_start_date: metadata.date_range?.start || null,
                data_end_date: metadata.date_range?.end || null,
                projected_monthly_spend: monthlySpend,
                projected_annual_spend: annualSpend
            };

            return calculations;
        },
        onSuccess: (calculations) => {
            if (hasData) {
                setCalculatedData(calculations);
                setShowOverridePrompt(true);
            } else {
                setFormData(prev => ({
                    ...prev,
                    ...calculations
                }));
                setIsEditing(true);
                toast({
                    title: "Calculations Complete",
                    description: "Review the calculated values and adjust if needed.",
                });
            }
        },
        onError: (error) => {
            toast({
                title: "Calculation Failed",
                description: error.message,
                variant: "destructive",
            });
        }
    });

    const handleOverrideAccept = () => {
        setFormData(prev => ({
            ...prev,
            ...calculatedData
        }));
        setShowOverridePrompt(false);
        setIsEditing(true);
        toast({
            title: "Data Updated",
            description: "Volume and spend data has been recalculated from strategy report.",
        });
    };

    const handleOverrideCancel = () => {
        setShowOverridePrompt(false);
        setCalculatedData(null);
    };

    const handleSave = () => {
        updateProjectionsMutation.mutate(formData);
    };

    const handleValueChange = (field, value) => {
        const updates = { [field]: value };

        if (field === 'total_shipments' && formData.data_timeframe_months) {
            const months = Number(formData.data_timeframe_months);
            if (months > 0) {
                updates.monthly_shipments = Math.round(Number(value) / months);
            }
        }

        if (field === 'monthly_shipments' && formData.data_timeframe_months) {
            const months = Number(formData.data_timeframe_months);
            if (months > 0) {
                updates.total_shipments = Math.round(Number(value) * months);
            }
        }

        if (field === 'data_timeframe_months') {
            const months = Number(value);
            if (months > 0) {
                if (formData.total_shipments) {
                    updates.monthly_shipments = Math.round(Number(formData.total_shipments) / months);
                } else if (formData.monthly_shipments) {
                    updates.total_shipments = Math.round(Number(formData.monthly_shipments) * months);
                }
            }
        }

        if (field === 'projected_monthly_spend') {
            updates.projected_annual_spend = Math.round(Number(value) * 12);
        }

        if (field === 'projected_annual_spend') {
            updates.projected_monthly_spend = Math.round(Number(value) / 12);
        }

        setFormData(prev => ({ ...prev, ...updates }));
    };

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
                    <div className="grid grid-cols-3 gap-4">
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
                            <Label htmlFor="monthly_shipments">Monthly Shipments</Label>
                            {isEditing ? (
                                <Input
                                    id="monthly_shipments"
                                    type="number"
                                    value={formData.monthly_shipments}
                                    onChange={(e) => handleValueChange('monthly_shipments', e.target.value)}
                                    placeholder="e.g., 417"
                                />
                            ) : (
                                <p className="text-2xl font-bold text-slate-900">
                                    {formData.monthly_shipments ? Number(formData.monthly_shipments).toLocaleString() : '-'}
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

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                    <p className="font-semibold text-sm text-blue-900 mb-1">
                        Carrier Participation Note
                    </p>
                    <p className="text-sm text-blue-700">
                        Typically, carriers don't want to pursue CSP events unless they are at least $40,000 spend per month. Consider this when planning your carrier outreach strategy.
                    </p>
                </div>
            </div>

            {isEditing && (
                <div className="flex justify-end gap-2">
                    <Button
                        variant="outline"
                        onClick={() => {
                            setFormData({
                                total_shipments: cspEvent?.total_shipments || '',
                                monthly_shipments: cspEvent?.monthly_shipments || '',
                                data_timeframe_months: cspEvent?.data_timeframe_months || '',
                                data_start_date: cspEvent?.data_start_date || null,
                                data_end_date: cspEvent?.data_end_date || null,
                                projected_monthly_spend: cspEvent?.projected_monthly_spend || '',
                                projected_annual_spend: cspEvent?.projected_annual_spend || ''
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

            <AlertDialog open={showOverridePrompt} onOpenChange={setShowOverridePrompt}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Override Existing Data?</AlertDialogTitle>
                        <AlertDialogDescription>
                            You already have volume and spend data entered. Would you like to replace it with the newly calculated values from your strategy report?
                            <div className="mt-4 p-4 bg-slate-50 rounded-lg space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="font-medium">New Total Shipments:</span>
                                    <span>{calculatedData?.total_shipments?.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium">New Monthly Shipments:</span>
                                    <span>{calculatedData?.monthly_shipments?.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium">New Annual Spend:</span>
                                    <span>${calculatedData?.projected_annual_spend?.toLocaleString()}</span>
                                </div>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={handleOverrideCancel}>Keep Current Data</AlertDialogCancel>
                        <AlertDialogAction onClick={handleOverrideAccept}>Replace with New Data</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
