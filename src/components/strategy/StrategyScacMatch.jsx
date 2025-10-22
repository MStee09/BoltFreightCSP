import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Carrier } from '../../api/entities';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { Building2, AlertCircle, PlusCircle, ExternalLink, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

export default function StrategyScacMatch({ strategySummary }) {
    const { data: carriers = [] } = useQuery({
        queryKey: ['carriers'],
        queryFn: () => Carrier.list(),
        initialData: []
    });

    const scacMatches = useMemo(() => {
        if (!strategySummary?.carrier_breakdown) return { matched: [], unmatched: [] };

        const matched = [];
        const unmatched = [];

        strategySummary.carrier_breakdown.forEach(item => {
            const scac = item.carrier;
            const carrier = carriers.find(c =>
                c.scac_code?.toUpperCase() === scac.toUpperCase()
            );

            if (carrier) {
                matched.push({ scac, carrier, shipments: item.shipments, percentage: item.percentage, spend: item.spend });
            } else {
                unmatched.push({ scac, shipments: item.shipments, percentage: item.percentage, spend: item.spend });
            }
        });

        return { matched, unmatched };
    }, [strategySummary, carriers]);

    if (!strategySummary?.carrier_breakdown) {
        return null;
    }

    const hasUnmatched = scacMatches.unmatched.length > 0;
    const totalCarriers = strategySummary.carrier_breakdown.length;

    return (
        <Card className="mt-6 border-2">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Building2 className="w-5 h-5" />
                            Carrier Database Status
                        </CardTitle>
                        <CardDescription>
                            {scacMatches.matched.length} of {totalCarriers} carriers found in your system
                        </CardDescription>
                    </div>
                    {!hasUnmatched && (
                        <Badge variant="default" className="bg-green-600">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            All Matched
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {hasUnmatched && (
                    <Alert className="bg-amber-50 border-amber-300 border-2">
                        <AlertCircle className="h-5 w-5 text-amber-600" />
                        <AlertTitle className="text-amber-900 font-semibold">
                            {scacMatches.unmatched.length} Carriers Not Found in Database
                        </AlertTitle>
                        <AlertDescription className="text-amber-900 mt-2">
                            These carriers appear in your shipment data but aren't in your carrier database yet.
                            Add them to track performance, contacts, and tariffs.
                        </AlertDescription>
                    </Alert>
                )}

                {scacMatches.unmatched.length > 0 && (
                    <div>
                        <p className="text-sm font-medium text-slate-700 mb-3">Missing Carriers</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {scacMatches.unmatched.map(({ scac, shipments, percentage, spend }) => (
                                <div key={scac} className="flex items-center justify-between p-4 bg-amber-50 border-2 border-amber-200 rounded-lg">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Badge variant="outline" className="font-mono border-amber-400 text-amber-900 font-semibold">
                                                {scac}
                                            </Badge>
                                            <span className="text-sm font-medium text-slate-700">
                                                {percentage}%
                                            </span>
                                        </div>
                                        <div className="text-xs text-slate-600">
                                            {shipments} shipments • ${spend?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                        </div>
                                    </div>
                                    <Button
                                        variant="default"
                                        size="sm"
                                        asChild
                                        className="h-9 bg-amber-600 hover:bg-amber-700 ml-3"
                                    >
                                        <Link to={createPageUrl(`CarrierDetail?new=true&scac=${scac}`)}>
                                            <PlusCircle className="w-3 h-3 mr-1" />
                                            Add
                                        </Link>
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {scacMatches.matched.length > 0 && (
                    <div>
                        <p className="text-sm font-medium text-slate-700 mb-3">
                            Matched Carriers {scacMatches.unmatched.length > 0 && `(${scacMatches.matched.length})`}
                        </p>
                        <div className="space-y-2">
                            {scacMatches.matched.map(({ scac, carrier, shipments, percentage, spend }) => (
                                <div key={scac} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <Badge variant="outline" className="font-mono border-green-400 text-green-900 font-semibold">
                                            {scac}
                                        </Badge>
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="text-slate-400">→</span>
                                            <span className="font-medium text-slate-900 truncate">{carrier.name}</span>
                                        </div>
                                        <div className="text-xs text-slate-600 ml-auto flex items-center gap-2">
                                            <span>{percentage}%</span>
                                            <span>•</span>
                                            <span>{shipments} shipments</span>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        asChild
                                        className="h-8 ml-3"
                                    >
                                        <Link to={createPageUrl(`CarrierDetail?id=${carrier.id}`)}>
                                            View <ExternalLink className="w-3 h-3 ml-1" />
                                        </Link>
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
