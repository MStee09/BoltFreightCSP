import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { format } from 'date-fns';
import { Calendar, Target, TrendingUp, Users, DollarSign, Package, AlertTriangle } from 'lucide-react';

const InfoItem = ({ label, value, children }) => (
    <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        {children ? (
            <div className="text-sm text-slate-800">{children}</div>
        ) : (
            <p className="text-sm text-slate-800">{value || 'N/A'}</p>
        )}
    </div>
);

export default function CspEventOverview({ event, customer }) {
    if (!event) return null;

    const getStageLabel = (stage) => {
        const labels = {
            discovery: 'Discovery',
            data_room_ready: 'Data Room Ready',
            rfp_sent: 'RFP Sent',
            qa_round: 'Q&A Round',
            round_1: 'Round 1',
            final_offers: 'Final Offers',
            awarded: 'Awarded',
            implementation: 'Implementation',
            validation: 'Validation',
            live: 'Live',
            renewal_watch: 'Renewal Watch'
        };
        return labels[stage] || stage;
    };

    const getStageColor = (stage) => {
        const early = ['discovery', 'data_room_ready', 'rfp_sent'];
        const mid = ['qa_round', 'round_1', 'final_offers'];
        const late = ['awarded', 'implementation', 'validation', 'live'];

        if (early.includes(stage)) return 'bg-blue-100 text-blue-800 border-blue-200';
        if (mid.includes(stage)) return 'bg-amber-100 text-amber-800 border-amber-200';
        if (late.includes(stage)) return 'bg-green-100 text-green-800 border-green-200';
        return 'bg-slate-100 text-slate-800 border-slate-200';
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Event Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <InfoItem label="Customer">
                            <p className="font-medium text-slate-900">{customer?.name || 'N/A'}</p>
                        </InfoItem>

                        <InfoItem label="Current Stage">
                            <Badge className={`${getStageColor(event.stage)}`}>
                                {getStageLabel(event.stage)}
                            </Badge>
                        </InfoItem>

                        <InfoItem label="Mode">
                            <Badge variant="secondary" className="capitalize">
                                {event.mode || 'Standard'}
                            </Badge>
                        </InfoItem>

                        {event.description && (
                            <div>
                                <p className="text-sm font-medium text-slate-500 mb-1">Description</p>
                                <p className="text-sm text-slate-700">{event.description}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Timeline</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {event.start_date && (
                            <div className="flex items-center gap-3">
                                <Calendar className="w-4 h-4 text-slate-500" />
                                <InfoItem
                                    label="Start Date"
                                    value={format(new Date(event.start_date), 'MMM d, yyyy')}
                                />
                            </div>
                        )}

                        {event.due_date && (
                            <div className="flex items-center gap-3">
                                <Target className="w-4 h-4 text-slate-500" />
                                <InfoItem
                                    label="Due Date"
                                    value={format(new Date(event.due_date), 'MMM d, yyyy')}
                                />
                            </div>
                        )}

                        {event.expected_completion_date && (
                            <div className="flex items-center gap-3">
                                <TrendingUp className="w-4 h-4 text-slate-500" />
                                <InfoItem
                                    label="Expected Completion"
                                    value={format(new Date(event.expected_completion_date), 'MMM d, yyyy')}
                                />
                            </div>
                        )}
                    </CardContent>
                </Card>

                {(event.total_shipments > 0 || event.projected_annual_spend > 0) && (
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg">Volume & Spend Projections</CardTitle>
                                {event.projected_annual_spend > 0 && event.minimum_annual_spend_threshold > 0 &&
                                 event.projected_annual_spend < event.minimum_annual_spend_threshold && (
                                    <Badge variant="destructive" className="flex items-center gap-1">
                                        <AlertTriangle className="h-3 w-3" />
                                        Below Threshold
                                    </Badge>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {event.total_shipments > 0 && (
                                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                                    <Package className="w-5 h-5 text-blue-600 mt-0.5" />
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-blue-900">Shipment Volume</p>
                                        <p className="text-2xl font-bold text-blue-700 mt-1">
                                            {event.total_shipments?.toLocaleString()}
                                        </p>
                                        {event.data_timeframe_months > 0 && (
                                            <p className="text-xs text-blue-600 mt-1">
                                                Over {event.data_timeframe_months} month{event.data_timeframe_months !== 1 ? 's' : ''}
                                                {event.data_start_date && event.data_end_date && (
                                                    <span className="ml-1">
                                                        ({format(new Date(event.data_start_date), 'MMM yyyy')} - {format(new Date(event.data_end_date), 'MMM yyyy')})
                                                    </span>
                                                )}
                                            </p>
                                        )}
                                        {event.projected_monthly_shipments > 0 && (
                                            <div className="mt-2 pt-2 border-t border-blue-200">
                                                <p className="text-xs text-blue-700">
                                                    <span className="font-medium">Projected:</span> {Math.round(event.projected_monthly_shipments).toLocaleString()}/mo • {Math.round(event.projected_annual_shipments).toLocaleString()}/yr
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {event.projected_annual_spend > 0 && (
                                <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                                    <DollarSign className="w-5 h-5 text-green-600 mt-0.5" />
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-green-900">Projected Spend</p>
                                        <div className="space-y-1 mt-1">
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-xs text-green-700 font-medium">Monthly:</span>
                                                <span className="text-lg font-bold text-green-800">
                                                    ${event.projected_monthly_spend?.toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-xs text-green-700 font-medium">Annual:</span>
                                                <span className="text-2xl font-bold text-green-700">
                                                    ${event.projected_annual_spend?.toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {event.projected_annual_revenue > 0 && (
                                <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
                                    <TrendingUp className="w-5 h-5 text-amber-600 mt-0.5" />
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-amber-900">Projected Revenue</p>
                                        <div className="space-y-1 mt-1">
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-xs text-amber-700 font-medium">Monthly:</span>
                                                <span className="text-lg font-bold text-amber-800">
                                                    ${event.projected_monthly_revenue?.toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-xs text-amber-700 font-medium">Annual:</span>
                                                <span className="text-2xl font-bold text-amber-700">
                                                    ${event.projected_annual_revenue?.toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {event.minimum_annual_spend_threshold > 0 && (
                                <Alert className={
                                    event.projected_annual_spend >= event.minimum_annual_spend_threshold
                                        ? "border-green-200 bg-green-50"
                                        : "border-red-200 bg-red-50"
                                }>
                                    <AlertTriangle className={`h-4 w-4 ${
                                        event.projected_annual_spend >= event.minimum_annual_spend_threshold
                                            ? "text-green-600"
                                            : "text-red-600"
                                    }`} />
                                    <AlertDescription className="text-xs">
                                        <span className="font-semibold">Carrier Minimum Threshold:</span> ${event.minimum_annual_spend_threshold?.toLocaleString()}/year
                                        {event.projected_annual_spend >= event.minimum_annual_spend_threshold ? (
                                            <span className="block mt-1 text-green-700">This CSP meets carrier participation requirements.</span>
                                        ) : (
                                            <span className="block mt-1 text-red-700">This CSP is below carrier minimum. Consider bundling with other lanes or adjusting scope.</span>
                                        )}
                                    </AlertDescription>
                                </Alert>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>

            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Progress & Metrics</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm font-medium text-slate-500">Priority</p>
                                <Badge variant="outline" className="mt-1 capitalize">
                                    {event.priority || 'Medium'}
                                </Badge>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-500">Status</p>
                                <Badge
                                    variant={event.status === 'completed' ? 'default' : 'outline'}
                                    className={event.status === 'completed' ? 'bg-green-100 text-green-800' : 'capitalize'}
                                >
                                    {event.status || 'In Progress'}
                                </Badge>
                            </div>
                        </div>

                        {event.estimated_volume && (
                            <InfoItem
                                label="Estimated Volume"
                                value={event.estimated_volume.toLocaleString()}
                            />
                        )}

                        {event.target_savings_pct && (
                            <InfoItem
                                label="Target Savings"
                                value={`${event.target_savings_pct}%`}
                            />
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Assignment</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {event.assigned_to && (
                            <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-slate-500" />
                                <InfoItem
                                    label="Assigned To"
                                    value={event.assigned_to}
                                />
                            </div>
                        )}

                        {event.created_date && (
                            <InfoItem
                                label="Created"
                                value={format(new Date(event.created_date), 'MMM d, yyyy')}
                            />
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
