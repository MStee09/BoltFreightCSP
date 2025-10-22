import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';

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

    return (
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
            <CardHeader className="pb-4">
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
                <div className="flex items-center">
                    {STAGES.map((stage, index) => {
                        const count = eventsByStage[stage] || 0;
                        return (
                            <React.Fragment key={stage}>
                                <Link to={`${createPageUrl("Pipeline")}?stage=${stage}`} className="flex flex-col items-center group">
                                    <div className="text-2xl font-bold text-blue-600 group-hover:scale-110 transition-transform">
                                        {count}
                                    </div>
                                    <div className="text-xs uppercase font-semibold text-slate-500 group-hover:text-blue-600 transition-colors">
                                        {stage.replace(/_/g, ' ')}
                                    </div>
                                </Link>
                                {index < STAGES.length - 1 && (
                                    <div className="flex-1 px-2 group">
                                        <div className="w-full h-px bg-slate-200 relative">
                                            <ArrowRight className="w-4 h-4 text-slate-300 absolute -top-2 right-1/2 group-hover:text-blue-500 group-hover:animate-pulse transition-colors" />
                                        </div>
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}