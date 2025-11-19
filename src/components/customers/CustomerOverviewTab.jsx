import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { User, Mail, Phone, DollarSign, BarChart, TrendingUp, TrendingDown, Building, Calendar, Hash } from 'lucide-react';
import { createCspReviewEvent } from '../../utils/calendarHelpers';
import { useToast } from '../ui/use-toast';
import { useQueryClient } from '@tanstack/react-query';

const MetricDisplay = ({ icon: Icon, label, value, trend, trendColor, className }) => (
    <div className={`p-4 rounded-lg flex items-start gap-4 ${className}`}>
        <Icon className="w-6 h-6 mt-1 text-slate-600" />
        <div>
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <p className="text-xl font-bold text-slate-900">{value}</p>
            {trend && (
                 <p className={`text-xs font-semibold flex items-center gap-1 ${trendColor}`}>
                    {trend > 0 ? <TrendingUp className="w-3 h-3"/> : <TrendingDown className="w-3 h-3"/>}
                    {trend.toFixed(1)}% vs last period
                </p>
            )}
        </div>
    </div>
);

export default function CustomerOverviewTab({ customer }) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isCreatingEvent, setIsCreatingEvent] = useState(false);

    if (!customer) return null;

    const marginTrend = (customer.margin_30d || 0) - (customer.margin_60d || 0);

    const handleScheduleReview = async () => {
        if (!customer.csp_review_frequency) {
            toast({
                title: "Error",
                description: "Please set a CSP review frequency for this customer first.",
                variant: "destructive",
            });
            return;
        }

        setIsCreatingEvent(true);
        try {
            await createCspReviewEvent(customer);
            queryClient.invalidateQueries(['calendar_events']);
            toast({
                title: "Success!",
                description: "CSP review event scheduled successfully.",
            });
        } catch (error) {
            toast({
                title: "Error",
                description: error.message || "Failed to schedule CSP review.",
                variant: "destructive",
            });
        } finally {
            setIsCreatingEvent(false);
        }
    };

    const segmentColors = {
        'Enterprise': 'bg-purple-100 text-purple-700 border-purple-200',
        'Mid-Market': 'bg-blue-100 text-blue-700 border-blue-200',
        'SMB': 'bg-green-100 text-green-700 border-green-200'
    };

    return (
        <div className="space-y-6 mt-4">
            <Card className="bg-gradient-to-r from-slate-50 to-slate-100/50">
                <CardHeader>
                    <CardTitle className="text-base font-semibold">Account Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <span className="text-sm text-slate-500">Customer Code</span>
                            <div className="mt-1 flex items-center gap-2">
                                <Hash className="w-4 h-4 text-slate-400" />
                                <Badge variant="outline" className="bg-slate-100 text-slate-900 border-slate-300 font-mono font-semibold">
                                    {customer.short_code || 'N/A'}
                                </Badge>
                            </div>
                        </div>
                        <div>
                            <span className="text-sm text-slate-500">Revenue Tier</span>
                            <div className="mt-1">
                                <Badge variant="outline" className={`${segmentColors[customer.segment] || 'bg-slate-100 text-slate-700'} font-medium`}>
                                    {customer.segment || 'Mid-Market'}
                                </Badge>
                            </div>
                        </div>
                        <div>
                            <span className="text-sm text-slate-500">Status</span>
                            <p className="text-sm font-medium text-slate-900 capitalize">{customer.status || 'Active'}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <MetricDisplay
                    icon={DollarSign}
                    label="Annual Revenue"
                    value={customer.annual_revenue ? `$${customer.annual_revenue.toLocaleString()}` : 'N/A'}
                    className="bg-green-50"
                />
                 <MetricDisplay
                    icon={BarChart}
                    label="30-Day Margin"
                    value={`${customer.margin_30d?.toFixed(1) || '0.0'}%`}
                    trend={marginTrend}
                    trendColor={marginTrend >= 0 ? 'text-green-600' : 'text-red-600'}
                    className="bg-blue-50"
                />
                 <MetricDisplay
                    icon={Building}
                    label="Health Score"
                    value={customer.health_score || 'N/A'}
                    className="bg-amber-50"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base font-semibold">Primary Contact</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center gap-3">
                            <User className="w-4 h-4 text-slate-500" />
                            <span className="text-sm text-slate-800">{customer.primary_contact_name || 'Not specified'}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Mail className="w-4 h-4 text-slate-500" />
                            <span className="text-sm text-slate-800">{customer.primary_contact_email || 'Not specified'}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Phone className="w-4 h-4 text-slate-500" />
                            <span className="text-sm text-slate-800">{customer.primary_contact_phone || 'Not specified'}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base font-semibold">CSP Review Schedule</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-500">Frequency</span>
                                <span className="text-sm font-medium capitalize">
                                    {customer.csp_review_frequency?.replace(/_/g, ' ') || 'Not set'}
                                </span>
                            </div>
                            {customer.next_csp_review_date && (
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-500">Next Review</span>
                                    <span className="text-sm font-medium">
                                        {new Date(customer.next_csp_review_date).toLocaleDateString()}
                                    </span>
                                </div>
                            )}
                        </div>
                        <Button
                            onClick={handleScheduleReview}
                            disabled={isCreatingEvent || !customer.csp_review_frequency}
                            size="sm"
                            className="w-full gap-2"
                        >
                            <Calendar className="w-4 h-4" />
                            {isCreatingEvent ? 'Scheduling...' : 'Schedule Next Review'}
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base font-semibold">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">
                        {customer.notes || 'No additional notes for this customer.'}
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}