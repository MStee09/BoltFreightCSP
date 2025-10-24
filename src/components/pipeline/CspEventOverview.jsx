import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { format } from 'date-fns';
import { Calendar, Target, TrendingUp, Users } from 'lucide-react';

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
