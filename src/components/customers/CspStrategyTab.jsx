
import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Customer, Carrier, Tariff, CSPEvent, Task, Interaction, Alert as EntityAlert, Shipment, LostOpportunity, ReportSnapshot } from '../../api/entities';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Input } from '../ui/input';
import { UploadCloud, File, X, Loader2, BrainCircuit, BarChart, FileUp, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Bar, BarChart as RechartsBarChart, Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import _ from 'lodash';

// Panel A: File Upload
const UploadPanel = ({ onAnalysisComplete }) => {
    const [txnFile, setTxnFile] = useState(null);
    const [loFile, setLoFile] = useState(null);
    const [error, setError] = useState(null);

    const mutation = useMutation({
        mutationFn: async ({ txnFile, loFile }) => {
            setError(null);
            
            const txnSchema = {
                type: "object",
                properties: {
                    Load: { type: "string" },
                    Pricing_Ownership: { type: "string" },
                    Carrier: { type: "string" }, // This is the Carrier Name from the transaction
                    Bill: { type: "number" }, // Assuming a bill value for the selected carrier
                }
            };
            const loSchema = {
                type: "object",
                properties: {
                    LoadId: { type: "string" },
                    Selected_Carrier_Name: { type: "string" },
                    Selected_Carrier_Cost: { type: "number" },
                    LO_Carrier_Name: { type: "string" },
                    LO_Carrier_Cost: { type: "number" },
                }
            };

            const [txnUploadResult, loUploadResult] = await Promise.all([
                base44.integrations.Core.UploadFile({ file: txnFile }),
                base44.integrations.Core.UploadFile({ file: loFile }),
            ]);

            const [txnDataResult, loDataResult] = await Promise.all([
                base44.integrations.Core.ExtractDataFromUploadedFile({ file_url: txnUploadResult.file_url, json_schema: txnSchema }),
                base44.integrations.Core.ExtractDataFromUploadedFile({ file_url: loUploadResult.file_url, json_schema: loSchema }),
            ]);

            if (txnDataResult.status === 'error' || loDataResult.status === 'error') {
                throw new Error(`Data extraction failed. TXN: ${txnDataResult.details}, LO: ${loDataResult.details}`);
            }

            return { txnData: txnDataResult.output, loData: loDataResult.output };
        },
        onSuccess: ({ txnData, loData }) => {
            onAnalysisComplete(txnData, loData);
        },
        onError: (err) => {
            setError(err.message);
        }
    });

    const FileDropzone = ({ file, setFile, title }) => (
        <div className="w-full">
            <label className="text-sm font-medium text-slate-700 block mb-2">{title}</label>
            {file ? (
                <div className="p-2 border rounded-lg flex items-center justify-between bg-slate-50">
                    <div className="flex items-center gap-2 text-sm">
                        <File className="w-4 h-4 text-blue-500" />
                        <span className="font-medium">{file.name}</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setFile(null)}><X className="w-4 h-4" /></Button>
                </div>
            ) : (
                <div className="relative p-6 border-2 border-dashed rounded-lg text-center cursor-pointer hover:border-blue-500">
                    <UploadCloud className="w-6 h-6 mx-auto text-slate-400 mb-1" />
                    <p className="text-sm text-slate-500">Drag & drop or click</p>
                    <Input type="file" className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => e.target.files[0] && setFile(e.target.files[0])} />
                </div>
            )}
        </div>
    );
    
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileUp className="w-5 h-5 text-blue-600" />Upload & Map</CardTitle>
                <CardDescription>Upload shipment and lost opportunity data to run the analysis.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FileDropzone file={txnFile} setFile={setTxnFile} title="Transaction Detail File" />
                    <FileDropzone file={loFile} setFile={setLoFile} title="Lost Opportunity File" />
                </div>
                {error && <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
                <Button onClick={() => mutation.mutate({ txnFile, loFile })} disabled={!txnFile || !loFile || mutation.isLoading} className="w-full">
                    {mutation.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {mutation.isLoading ? 'Analyzing...' : 'Run Strategy Analysis'}
                </Button>
            </CardContent>
        </Card>
    );
};

// Panel B: Analysis & Visuals
const AnalysisPanel = ({ result }) => {
    const { renegotiate, target_csp, missed_savings_30d, ownership_mix_30d, adoption_pct } = result;
    const ownershipData = Object.entries(ownership_mix_30d || {}).map(([name, value]) => ({ name, value: value * 100 }));

    const formatCurrency = (value) => value ? `$${Math.round(value).toLocaleString()}` : '$0';
    
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><BarChart className="w-5 h-5 text-green-600" />Analysis & Visuals</CardTitle>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="kpis">
                    <TabsList>
                        <TabsTrigger value="kpis">Key Metrics</TabsTrigger>
                        <TabsTrigger value="renegotiate">Renegotiation Targets</TabsTrigger>
                        <TabsTrigger value="csp">CSP Targets</TabsTrigger>
                    </TabsList>
                    <TabsContent value="kpis" className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
                       <div className="p-4 bg-red-50 rounded-lg">
                           <p className="text-sm text-red-800">Missed Savings (30d)</p>
                           <p className="text-2xl font-bold text-red-900">{formatCurrency(missed_savings_30d)}</p>
                       </div>
                       {adoption_pct !== null && (
                           <div className="p-4 bg-purple-50 rounded-lg">
                               <p className="text-sm text-purple-800">CSP Adoption (30d)</p>
                               <p className="text-2xl font-bold text-purple-900">{adoption_pct.toFixed(1)}%</p>
                           </div>
                       )}
                       {ownershipData.map(item => (
                           <div key={item.name} className="p-4 bg-blue-50 rounded-lg">
                               <p className="text-sm text-blue-800">{item.name} Mix</p>
                               <p className="text-2xl font-bold text-blue-900">{item.value.toFixed(1)}%</p>
                           </div>
                       ))}
                    </TabsContent>
                    <TabsContent value="renegotiate">
                         <ResponsiveContainer width="100%" height={300}>
                            <RechartsBarChart data={renegotiate} margin={{ top: 20, right: 20, bottom: 5, left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="carrier" angle={-20} textAnchor="end" height={50} />
                                <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                                <Tooltip formatter={(value) => formatCurrency(value)} />
                                <Legend />
                                <Bar yAxisId="left" dataKey="total_opportunity" fill="#8884d8" name="Total Opportunity $" />
                            </RechartsBarChart>
                        </ResponsiveContainer>
                    </TabsContent>
                     <TabsContent value="csp">
                         <ResponsiveContainer width="100%" height={300}>
                            <RechartsBarChart data={target_csp} margin={{ top: 20, right: 20, bottom: 5, left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="carrier" angle={-20} textAnchor="end" height={50} />
                                <YAxis yAxisId="left" orientation="left" stroke="#82ca9d" />
                                <Tooltip formatter={(value) => formatCurrency(value)} />
                                <Legend />
                                <Bar yAxisId="left" dataKey="total_savings" fill="#82ca9d" name="Total Savings Offered $" />
                            </RechartsBarChart>
                        </ResponsiveContainer>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
};

// Panel C: Recommendation
const RecommendationPanel = ({ result, onRunCSP }) => {
    const { run_csp_now, renegotiate, target_csp, missed_savings_30d } = result;

    const top_renegotiate = renegotiate[0];
    const top_target = target_csp[0];
    const formatCurrency = (value) => value ? `$${Math.round(value).toLocaleString()}` : '$0';

    let why = '';
    if (run_csp_now) {
        if (missed_savings_30d > 5000) {
            why = `Significant missed savings of ${formatCurrency(missed_savings_30d)} in the last 30 days.`;
        } else if (top_renegotiate) {
            why = `${top_renegotiate.carrier} lost ${top_renegotiate.lost_lanes} lanes with an opportunity of ${formatCurrency(top_renegotiate.total_opportunity)}.`;
        } else if (top_target) {
            why = `${top_target.carrier} offered cheaper rates ${top_target.times_cheaper} times, with total potential savings of ${formatCurrency(top_target.total_savings)}.`;
        }
    } else {
        why = 'Current shipment data does not indicate a strong need for a new CSP event. Monitor for changes.'
    }

    const shortlist = _.uniq([...renegotiate.map(r => r.carrier), ...target_csp.map(t => t.carrier)]).slice(0, 4);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><BrainCircuit className="w-5 h-5 text-purple-600" />Recommendation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className={`p-4 rounded-lg flex items-center gap-4 ${run_csp_now ? 'bg-green-50' : 'bg-amber-50'}`}>
                    <p className="text-lg font-bold">Run CSP Now?</p>
                    <p className={`text-2xl font-extrabold ${run_csp_now ? 'text-green-700' : 'text-amber-700'}`}>
                        {run_csp_now ? 'Yes' : 'Not Yet'}
                    </p>
                </div>
                <div className="space-y-1">
                    <h4 className="font-semibold text-slate-800">Why:</h4>
                    <p className="text-sm text-slate-600">{why}</p>
                </div>
                <div className="space-y-1">
                    <h4 className="font-semibold text-slate-800">Carrier Shortlist:</h4>
                    <div className="flex flex-wrap gap-2">
                        {shortlist.map(c => <div key={c} className="px-2 py-1 bg-slate-200 text-slate-800 rounded-md text-sm">{c}</div>)}
                    </div>
                </div>
                {run_csp_now && (
                    <Button className="w-full" onClick={onRunCSP}>
                        Create CSP Opportunity in Pipeline
                    </Button>
                )}
            </CardContent>
        </Card>
    );
};

export default function CspStrategyTab({ customer, cspEventId = null }) {
    const queryClient = useQueryClient();
    const [analysisResult, setAnalysisResult] = useState(customer?.strategy_result || null);

    const updateCustomerMutation = useMutation({
        mutationFn: (data) => Customer.update(customer.id, data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customer', customer.id] }),
    });

    const createCspEventMutation = useMutation({
        mutationFn: (data) => CSPEvent.create(data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['csp_events'] }),
    });

    const runAnalysis = (txnData, loData) => {
        // Ensure data is always an array
        const safeTxnData = Array.isArray(txnData) ? txnData : (txnData ? [txnData] : []);
        const safeLoData = Array.isArray(loData) ? loData : (loData ? [loData] : []);

        const merged = [];
        const loMap = _.keyBy(safeLoData, 'LoadId');

        safeTxnData.forEach(t => {
            if (loMap[t.Load]) {
                merged.push({
                    ...t,
                    ...loMap[t.Load],
                    Cost_Diff: loMap[t.Load].Selected_Carrier_Cost - loMap[t.Load].LO_Carrier_Cost
                });
            }
        });

        const cheaper = merged.filter(m => m.Cost_Diff > 0);

        const renegotiate = _(cheaper)
            .groupBy('Selected_Carrier_Name')
            .map((group, carrier) => ({
                carrier,
                lost_lanes: group.length,
                total_opportunity: _.sumBy(group, 'Cost_Diff'),
                avg_opportunity: _.meanBy(group, 'Cost_Diff'),
            }))
            .orderBy('total_opportunity', 'desc')
            .value();
        
        const target_csp = _(cheaper)
            .groupBy('LO_Carrier_Name')
            .map((group, carrier) => ({
                carrier,
                times_cheaper: group.length,
                total_savings: _.sumBy(group, 'Cost_Diff'),
                avg_savings: _.meanBy(group, 'Cost_Diff'),
            }))
            .orderBy('total_savings', 'desc')
            .value();
        
        const missed_savings_30d = _.sumBy(cheaper, 'Cost_Diff');
        const ownership_mix_30d = _.countBy(merged, 'Pricing_Ownership');
        const totalLoads = merged.length;
        const normalized_ownership_mix = _.mapValues(ownership_mix_30d, count => count / totalLoads);

        const totalShipments = merged.length;

        const intendedCarriers = customer.intended_csp_carriers || [];
        const adoption_pct = intendedCarriers.length > 0 && totalShipments > 0 ?
            (merged.filter(s => intendedCarriers.includes(s.Carrier)).length / totalShipments) * 100
            : null;

        const run_csp_now = (
            (_.sumBy(_.take(target_csp, 3), 'total_savings') >= 5000) ||
            (_.sumBy(_.take(renegotiate, 1), 'total_opportunity') >= 3000)
        );

        const result = {
            run_csp_now,
            renegotiate: renegotiate.slice(0, 5),
            target_csp: target_csp.slice(0, 5),
            missed_savings_30d,
            ownership_mix_30d: normalized_ownership_mix,
            adoption_pct // Add new adoption percentage to result
        };
        
        setAnalysisResult(result);
        updateCustomerMutation.mutate({ strategy_result: result, last_strategy_run_at: new Date().toISOString() });
    };

    const handleCreateCsp = () => {
        if (!analysisResult) return;
        const shortlist = _.uniq([...analysisResult.renegotiate.map(r => r.carrier), ...analysisResult.target_csp.map(t => t.carrier)]).slice(0, 4);
        createCspEventMutation.mutate({
            customer_id: customer.id,
            title: `CSP Opportunity for ${customer.name}`,
            description: `Automated recommendation based on ${formatCurrency(analysisResult.missed_savings_30d)} missed savings. Shortlist: ${shortlist.join(', ')}`,
            stage: 'discovery',
            priority: 'high',
        });
    };

    return (
        <div className="space-y-6 mt-4">
            {cspEventId && (
                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Event-Specific Analysis</AlertTitle>
                    <AlertDescription>
                        Run a strategy analysis for this specific bid opportunity. Upload transaction and lost-lane data relevant to this event's timeframe and lanes.
                    </AlertDescription>
                </Alert>
            )}
            <UploadPanel onAnalysisComplete={runAnalysis} />

            {analysisResult ? (
                <>
                    <AnalysisPanel result={analysisResult} />
                    {!cspEventId && <RecommendationPanel result={analysisResult} onRunCSP={handleCreateCsp} />}
                </>
            ) : (
                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Awaiting Data</AlertTitle>
                    <AlertDescription>
                        Upload both a Transaction Detail and a Lost Opportunity file to run the CSP strategy analysis. The results will appear here.
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
}

function formatCurrency(value) {
    if (typeof value !== 'number') return '$0';
    return `$${Math.round(value).toLocaleString()}`;
}
