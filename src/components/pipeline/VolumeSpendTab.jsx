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
        projected_annual_spend: cspEvent?.projected_annual_spend || '',
        avg_cost_per_shipment: cspEvent?.avg_cost_per_shipment || ''
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
                .eq('document_type', 'transaction_detail');

            if (error) throw error;

            if (!documents || documents.length === 0) {
                throw new Error('No Transaction Detail document found. Please upload shipment data in the Strategy tab first.');
            }

            const txnDoc = documents[0];

            const urlParts = txnDoc.file_path.split('/');
            const bucketIndex = urlParts.findIndex(part => part === 'documents');
            const filePath = urlParts.slice(bucketIndex + 1).join('/');

            const { data: fileData, error: downloadError } = await supabase.storage
                .from('documents')
                .download(filePath);

            if (downloadError) throw new Error(`Failed to download file: ${downloadError.message}`);

            const parseCSVRow = (line) => {
                const result = [];
                let current = '';
                let inQuotes = false;

                for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    const nextChar = line[i + 1];

                    if (char === '"') {
                        if (inQuotes && nextChar === '"') {
                            current += '"';
                            i++;
                        } else {
                            inQuotes = !inQuotes;
                        }
                    } else if (char === ',' && !inQuotes) {
                        result.push(current);
                        current = '';
                    } else {
                        current += char;
                    }
                }
                result.push(current);
                return result.map(v => v.trim().replace(/^"|"$/g, ''));
            };

            const fileText = await fileData.text();
            const lines = fileText.trim().split('\n');

            if (lines.length < 2) {
                throw new Error('Transaction Detail file appears to be empty or invalid');
            }

            const headers = parseCSVRow(lines[0]);
            const dataRows = lines.slice(1).filter(row => row.trim());

            const totalShipments = dataRows.length;

            console.log('=== TRANSACTION DETAIL VALIDATION ===');
            console.log('Total Headers:', headers.length);
            console.log('First 5 Headers:', headers.slice(0, 5));
            console.log('Last 5 Headers:', headers.slice(-5));

            const totalBillIndex = headers.findIndex(h => {
                const lower = h.toLowerCase().replace(/[_\s]/g, '');
                return lower === 'totalbill';
            });

            if (totalBillIndex === -1) {
                throw new Error(
                    'DATA FORMAT ERROR: Cannot find "TotalBill" column (Column Q).\n\n' +
                    'This column is required for spend calculations.\n\n' +
                    'Found columns:\n' + headers.join(', ') + '\n\n' +
                    'Please verify:\n' +
                    '1. You uploaded the correct Transaction Detail report\n' +
                    '2. The file contains a column named "TotalBill", "Total Bill", or "Total_Bill"'
                );
            }

            const shipDateIndex = headers.findIndex(h => {
                const lower = h.toLowerCase().replace(/[_\s]/g, '');
                return lower.includes('date') && (lower.includes('ship') || lower.includes('pickup') || lower.includes('delivery'));
            });

            if (shipDateIndex === -1) {
                console.warn('WARNING: Cannot find date column (Ship Date, Pickup_Date, etc.) for date range calculation');
            }

            console.log('TotalBill Column (Q): Index', totalBillIndex, `(Column ${String.fromCharCode(65 + totalBillIndex)})`, `"${headers[totalBillIndex]}"`);
            if (totalBillIndex > 0) {
                console.log('Column before TotalBill:', `"${headers[totalBillIndex - 1]}"`);
            }
            if (totalBillIndex < headers.length - 1) {
                console.log('Column after TotalBill:', `"${headers[totalBillIndex + 1]}"`);
            }
            console.log('Date Column: Index', shipDateIndex, shipDateIndex >= 0 ? `"${headers[shipDateIndex]}"` : 'NOT FOUND');
            console.log('Total Rows:', totalShipments);

            let totalSpend = 0;
            let dates = [];
            let validCostCount = 0;
            let invalidRows = [];

            dataRows.forEach((row, idx) => {
                const cols = parseCSVRow(row);

                if (totalBillIndex >= 0 && cols[totalBillIndex]) {
                    const originalValue = cols[totalBillIndex];
                    const cost = parseFloat(originalValue.replace(/[$,]/g, ''));
                    if (!isNaN(cost) && cost > 0) {
                        totalSpend += cost;
                        validCostCount++;
                        if (idx < 3) {
                            console.log(`Row ${idx + 1}: TotalBill (Column Q) = "${originalValue}" → $${cost.toFixed(2)}`);
                        }
                    } else if (originalValue) {
                        invalidRows.push({ row: idx + 1, value: originalValue });
                    }
                }

                if (shipDateIndex >= 0 && cols[shipDateIndex]) {
                    const dateStr = cols[shipDateIndex];
                    const date = new Date(dateStr);
                    if (!isNaN(date.getTime())) dates.push(date);
                }
            });

            if (invalidRows.length > 0 && invalidRows.length < 10) {
                console.warn('Invalid cost values found in rows:', invalidRows);
            }

            if (validCostCount === 0) {
                throw new Error(
                    'DATA FORMAT ERROR: No valid cost data found in TotalBill column (Column Q).\n\n' +
                    'Please verify the Transaction Detail report has cost values in the TotalBill column.'
                );
            }

            console.log('=== SPEND CALCULATION RESULTS ===');
            console.log('Total Spend (Sum of TotalBill Column Q):', totalSpend.toLocaleString('en-US', { style: 'currency', currency: 'USD' }));
            console.log('Valid Shipments with Cost:', validCostCount);
            console.log('Total Rows:', totalShipments);
            console.log('Average per row:', (totalSpend / totalShipments).toFixed(2));

            dates.sort((a, b) => a - b);
            const startDate = dates.length > 0 ? dates[0] : null;
            const endDate = dates.length > 0 ? dates[dates.length - 1] : null;

            let timeframeMonths = 12;
            if (startDate && endDate) {
                const diffTime = Math.abs(endDate - startDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                timeframeMonths = Math.max(1, Math.round(diffDays / 30));
            }

            console.log('Date Range:', startDate, 'to', endDate);
            console.log('Timeframe:', timeframeMonths, 'months');

            const avgCostPerShipment = totalShipments > 0 ? totalSpend / totalShipments : 0;
            const monthlyShipments = timeframeMonths > 0 ? Math.round(totalShipments / timeframeMonths) : 0;
            const annualShipments = Math.round((totalShipments / timeframeMonths) * 12);
            const annualSpend = avgCostPerShipment * annualShipments;
            const monthlySpend = annualSpend / 12;

            console.log('Avg Cost Per Shipment:', avgCostPerShipment);
            console.log('Annual Shipments:', annualShipments);
            console.log('Annual Spend:', annualSpend);
            console.log('Monthly Spend:', monthlySpend);

            const calculations = {
                total_shipments: totalShipments,
                monthly_shipments: monthlyShipments,
                data_timeframe_months: timeframeMonths,
                data_start_date: startDate ? format(startDate, 'yyyy-MM-dd') : null,
                data_end_date: endDate ? format(endDate, 'yyyy-MM-dd') : null,
                projected_monthly_spend: Math.round(monthlySpend * 100) / 100,
                projected_annual_spend: Math.round(annualSpend * 100) / 100,
                avg_cost_per_shipment: Math.round(avgCostPerShipment * 100) / 100
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

        if (field === 'avg_cost_per_shipment' && formData.total_shipments) {
            const avgCost = Number(value);
            const totalShips = Number(formData.total_shipments);
            const annual = Math.round(avgCost * totalShips * (12 / (Number(formData.data_timeframe_months) || 12)));
            updates.projected_annual_spend = annual;
            updates.projected_monthly_spend = Math.round(annual / 12);
        }

        if (field === 'projected_monthly_spend') {
            const annual = Math.round(Number(value) * 12);
            updates.projected_annual_spend = annual;
            if (formData.total_shipments) {
                const annualShips = Number(formData.monthly_shipments) * 12;
                if (annualShips > 0) {
                    updates.avg_cost_per_shipment = Math.round((annual / annualShips) * 100) / 100;
                }
            }
        }

        if (field === 'projected_annual_spend') {
            const monthly = Math.round(Number(value) / 12);
            updates.projected_monthly_spend = monthly;
            if (formData.total_shipments) {
                const annualShips = Number(formData.monthly_shipments) * 12;
                if (annualShips > 0) {
                    updates.avg_cost_per_shipment = Math.round((Number(value) / annualShips) * 100) / 100;
                }
            }
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
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="avg_cost_per_shipment">Avg Cost / Shipment</Label>
                            {isEditing ? (
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                                    <Input
                                        id="avg_cost_per_shipment"
                                        type="number"
                                        step="0.01"
                                        value={formData.avg_cost_per_shipment}
                                        onChange={(e) => handleValueChange('avg_cost_per_shipment', e.target.value)}
                                        placeholder="250.00"
                                        className="pl-7"
                                    />
                                </div>
                            ) : (
                                <p className="text-2xl font-bold text-slate-900">
                                    {formData.avg_cost_per_shipment ? `$${Number(formData.avg_cost_per_shipment).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                                </p>
                            )}
                        </div>
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
                                    {formData.projected_monthly_spend ? `$${Number(formData.projected_monthly_spend).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
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
                                    {formData.projected_annual_spend ? `$${Number(formData.projected_annual_spend).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
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
                                projected_annual_spend: cspEvent?.projected_annual_spend || '',
                                avg_cost_per_shipment: cspEvent?.avg_cost_per_shipment || ''
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
                                    <span>${calculatedData?.projected_annual_spend?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium">New Avg Cost/Shipment:</span>
                                    <span>${calculatedData?.avg_cost_per_shipment?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
