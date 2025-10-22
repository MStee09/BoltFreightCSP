import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Carrier } from '../../api/entities';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { Building2, AlertCircle, PlusCircle, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

function extractScacCodes(text) {
    if (!text) return [];

    const scacPattern = /\b[A-Z]{2,4}\b/g;
    const matches = text.match(scacPattern) || [];

    const uniqueScacs = [...new Set(matches)]
        .filter(scac => scac.length >= 2 && scac.length <= 4)
        .filter(scac => {
            const commonWords = ['THE', 'AND', 'FOR', 'WITH', 'FROM', 'DATE', 'RATE', 'COST', 'TOTAL', 'USD', 'CAD', 'PDF', 'CSV', 'FILE'];
            return !commonWords.includes(scac);
        });

    return uniqueScacs;
}

export default function ScacCarrierMatch({ document }) {
    const { data: carriers = [] } = useQuery({
        queryKey: ['carriers'],
        queryFn: () => Carrier.list(),
        initialData: []
    });

    const scacMatches = useMemo(() => {
        if (!document?.ai_summary) return { matched: [], unmatched: [] };

        const scacs = extractScacCodes(document.ai_summary);
        const matched = [];
        const unmatched = [];

        scacs.forEach(scac => {
            const carrier = carriers.find(c =>
                c.scac_code?.toUpperCase() === scac.toUpperCase()
            );

            if (carrier) {
                matched.push({ scac, carrier });
            } else {
                unmatched.push(scac);
            }
        });

        return { matched, unmatched };
    }, [document, carriers]);

    if (!document?.ai_summary || (scacMatches.matched.length === 0 && scacMatches.unmatched.length === 0)) {
        return null;
    }

    return (
        <Card className="mt-4">
            <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Carriers Identified in Document
                </CardTitle>
                <CardDescription>
                    SCAC codes found and matched to carriers in your system
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {scacMatches.matched.length > 0 && (
                    <div>
                        <p className="text-sm font-medium text-slate-700 mb-3">Matched Carriers</p>
                        <div className="space-y-2">
                            {scacMatches.matched.map(({ scac, carrier }) => (
                                <div key={scac} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <Badge variant="outline" className="font-mono">
                                            {scac}
                                        </Badge>
                                        <div className="flex items-center gap-2">
                                            <span className="text-slate-400">→</span>
                                            <span className="font-medium text-slate-900">{carrier.name}</span>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        asChild
                                        className="h-8"
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

                {scacMatches.unmatched.length > 0 && (
                    <div>
                        <Alert className="bg-amber-50 border-amber-200">
                            <AlertCircle className="h-4 w-4 text-amber-600" />
                            <AlertDescription className="text-amber-900">
                                <span className="font-medium">Unmatched SCAC codes found.</span> Create these carriers to track them in your system.
                            </AlertDescription>
                        </Alert>
                        <div className="space-y-2 mt-3">
                            {scacMatches.unmatched.map(scac => (
                                <div key={scac} className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <Badge variant="outline" className="font-mono border-amber-300 text-amber-900">
                                            {scac}
                                        </Badge>
                                        <span className="text-sm text-slate-600">Not found in carrier database</span>
                                    </div>
                                    <Button
                                        variant="default"
                                        size="sm"
                                        asChild
                                        className="h-8 bg-amber-600 hover:bg-amber-700"
                                    >
                                        <Link to={createPageUrl(`CarrierDetail?new=true&scac=${scac}`)}>
                                            <PlusCircle className="w-3 h-3 mr-1" />
                                            Create Carrier
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
