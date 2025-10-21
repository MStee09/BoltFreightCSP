import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { Progress } from '../ui/progress';

const STAGES = ["discovery", "rfp_sent", "final_offers", "awarded", "implementation", "live"];

export default function PipelineSnapshot({ events }) {
    // ULTRA DEFENSIVE: Multiple levels of array checking
    let safeEvents = [];
    
    try {
        if (events === null || events === undefined) {
            safeEvents = [];
        } else if (Array.isArray(events)) {
            safeEvents = events;
        } else if (typeof events === 'object') {
            if (Array.isArray(events.data)) {
                safeEvents = events.data;
            } else if (Array.isArray(events.results)) {
                safeEvents = events.results;
            } else if (Array.isArray(events.items)) {
                safeEvents = events.items;
            } else {
                safeEvents = [];
            }
        } else {
            safeEvents = [];
        }
    } catch (error) {
        console.error('Error processing events:', error);
        safeEvents = [];
    }
    
    const eventsByStage = {};
    
    for (let i = 0; i < STAGES.length; i++) {
        eventsByStage[STAGES[i]] = 0;
    }
    
    if (Array.isArray(safeEvents) && safeEvents.length > 0) {
        for (let i = 0; i < safeEvents.length; i++) {
            const event = safeEvents[i];
            if (event && event.stage && eventsByStage.hasOwnProperty(event.stage)) {
                eventsByStage[event.stage]++;
            }
        }
    }

    const totalEvents = safeEvents.length;

    const stagePercentages = STAGES.map(stage => {
        const count = eventsByStage[stage] || 0;
        return {
            stage,
            count,
            percentage: totalEvents > 0 ? (count / totalEvents) * 100 : 0
        };
    });

    return (
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-bold text-slate-900">
                        CSP Pipeline Snapshot
                    </CardTitle>
                    <div className="text-sm font-semibold text-slate-600">
                        Total: <span className="text-lg text-blue-600">{totalEvents}</span> CSPs
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex items-center mb-4">
                    {STAGES.map((stage, index) => {
                        const count = eventsByStage[stage] || 0;
                        return (
                            <React.Fragment key={stage}>
                                <Link to={createPageUrl("Pipeline")} className="flex flex-col items-center group">
                                    <div className="text-2xl font-bold text-blue-600">
                                        {count}
                                    </div>
                                    <div className="text-xs uppercase font-semibold text-slate-500 group-hover:text-blue-600 transition-colors">
                                        {stage.replace(/_/g, ' ')}
                                    </div>
                                </Link>
                                {index < STAGES.length - 1 && (
                                    <div className="flex-1 px-2">
                                        <div className="w-full h-px bg-slate-200 relative">
                                            <ArrowRight className="w-4 h-4 text-slate-300 absolute -top-2 right-1/2" />
                                        </div>
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                        <span>Pipeline Distribution</span>
                        <span>{totalEvents > 0 ? '100%' : '0%'}</span>
                    </div>
                    <div className="flex gap-0.5 h-2 bg-slate-100 rounded-full overflow-hidden">
                        {stagePercentages.map(({ stage, percentage }) => {
                            if (percentage === 0) return null;
                            const colors = {
                                discovery: 'bg-blue-500',
                                rfp_sent: 'bg-cyan-500',
                                final_offers: 'bg-emerald-500',
                                awarded: 'bg-green-500',
                                implementation: 'bg-amber-500',
                                live: 'bg-purple-500'
                            };
                            return (
                                <div
                                    key={stage}
                                    className={`${colors[stage] || 'bg-slate-400'} transition-all`}
                                    style={{ width: `${percentage}%` }}
                                    title={`${stage.replace(/_/g, ' ')}: ${percentage.toFixed(1)}%`}
                                />
                            );
                        })}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}