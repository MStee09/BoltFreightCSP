
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Customer, Carrier, Tariff, CSPEvent, Task, Interaction, Alert as EntityAlert, Shipment, LostOpportunity, ReportSnapshot, Document } from '../../api/entities';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { UploadCloud, File, X, Loader2, BrainCircuit, BarChart, FileUp, Info, FileText, Calendar, User, Download, Trash2, Sparkles, MessageCircle, Send, Package, DollarSign, TrendingDown, AlertCircle, TrendingUp, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Badge } from '../ui/badge';
import { Bar, BarChart as RechartsBarChart, Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Separator } from '../ui/separator';
import { format } from 'date-fns';
import { useToast } from '../ui/use-toast';
import { supabase } from '../../api/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import _ from 'lodash';
import StrategyScacMatch from '../strategy/StrategyScacMatch';

const UploadPanel = ({ cspEventId, onAnalysisComplete }) => {
    const [txnFile, setTxnFile] = useState(null);
    const [loFile, setLoFile] = useState(null);
    const [txnDocType, setTxnDocType] = useState('transaction_detail');
    const [loDocType, setLoDocType] = useState('low_cost_opportunity');
    const [error, setError] = useState(null);
    const [txnHeaders, setTxnHeaders] = useState([]);
    const [loHeaders, setLoHeaders] = useState([]);
    const [txnMapping, setTxnMapping] = useState({});
    const [loMapping, setLoMapping] = useState({});
    const [txnAdditionalFields, setTxnAdditionalFields] = useState([]);
    const [loAdditionalFields, setLoAdditionalFields] = useState([]);
    const [showMapping, setShowMapping] = useState(false);
    const { toast } = useToast();
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const loadSavedMappings = async (docType) => {
        if (!user?.id) {
            console.log('No user ID available for loading mappings');
            return null;
        }

        try {
            console.log('Loading saved mappings for:', { docType, userId: user.id });
            const { data, error } = await supabase
                .from('field_mappings')
                .select('mapping')
                .eq('user_id', user.id)
                .eq('document_type', docType)
                .maybeSingle();

            if (error) throw error;
            console.log('Loaded mappings:', data?.mapping);
            return data?.mapping || null;
        } catch (err) {
            console.error('Error loading saved mappings:', err);
            return null;
        }
    };

    const saveMappings = async (docType, mapping) => {
        if (!user?.id || !mapping || Object.keys(mapping).length === 0) {
            console.log('Skip saving mappings:', { userId: user?.id, mappingKeys: Object.keys(mapping || {}) });
            return;
        }

        try {
            console.log('Saving field mappings:', { docType, mapping, userId: user.id });
            const { data, error } = await supabase
                .from('field_mappings')
                .upsert({
                    user_id: user.id,
                    document_type: docType,
                    mapping: mapping,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id,document_type'
                });

            if (error) {
                console.error('Supabase error saving mappings:', error);
                throw error;
            }
            console.log('Field mappings saved successfully:', data);
        } catch (err) {
            console.error('Error saving mappings:', err);
            toast({
                title: "Failed to save field mappings",
                description: err.message,
                variant: "destructive"
            });
        }
    };

    const requiredTxnFields = {
        load_id: 'Load ID',
        carrier: 'Carrier Name',
        cost: 'Cost/Bill Amount',
        origin_city: 'Origin City',
        dest_city: 'Destination City',
        ownership: 'Pricing Ownership',
        weight: 'Weight',
        class: 'Class',
        miles: 'Miles',
        mode: 'Mode'
    };

    const requiredLoFields = {
        load_id: 'Load ID',
        selected_carrier: 'Selected Carrier Name',
        selected_cost: 'Selected Carrier Cost',
        opportunity_carrier: 'Low Cost Carrier Name',
        opportunity_cost: 'Low Cost Carrier Cost'
    };

    const extractHeaders = (text) => {
        const lines = text.trim().split('\n');
        return lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    };

    const parseCSVWithMapping = (text, mapping) => {
        const lines = text.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            if (values.length === headers.length) {
                const row = {};
                headers.forEach((header, index) => {
                    const mappedKey = Object.keys(mapping).find(key => mapping[key] === header);
                    if (mappedKey) {
                        let value = values[index].trim().replace(/^"|"$/g, '');
                        if (!isNaN(value) && value !== '') {
                            value = parseFloat(value);
                        }
                        row[mappedKey] = value;
                    }
                });
                data.push(row);
            }
        }
        return data;
    };

    const handleFileSelect = async (file, type) => {
        if (!file) return;

        try {
            const text = await file.text();
            const headers = extractHeaders(text);

            if (type === 'txn') {
                setTxnFile(file);
                setTxnHeaders(headers);

                const savedMapping = await loadSavedMappings('transaction_detail');

                if (savedMapping && Object.keys(savedMapping).length > 0) {
                    const validMapping = {};
                    Object.entries(savedMapping).forEach(([key, value]) => {
                        if (headers.includes(value)) {
                            validMapping[key] = value;
                        }
                    });

                    if (Object.keys(validMapping).length > 0) {
                        setTxnMapping(validMapping);
                        setTxnAdditionalFields([]);
                        toast({
                            title: "Mapping Loaded",
                            description: "Previously saved field mapping has been applied.",
                        });
                        return;
                    }
                }

                const autoMapping = {};
                const defaultMappings = {
                    'load_id': ['Load', 'LoadID', 'Load ID', 'Load_ID'],
                    'carrier': ['Carrier', 'Carrier Name', 'Carrier_Name', 'CarrierName'],
                    'cost': ['TotalCost', 'Total Cost', 'Cost', 'Bill Amount', 'Amount'],
                    'origin_city': ['Origin_City', 'Origin City', 'OriginCity', 'Origin'],
                    'dest_city': ['Dest_City', 'Destination City', 'DestinationCity', 'Destination', 'Dest'],
                    'ownership': ['Pricing_Ownership', 'Pricing Ownership', 'Ownership'],
                    'weight': ['Weight'],
                    'class': ['Class'],
                    'miles': ['Miles'],
                    'mode': ['Mode']
                };

                Object.keys(requiredTxnFields).forEach(key => {
                    const defaults = defaultMappings[key] || [];
                    const match = headers.find(h =>
                        defaults.some(d => h.toLowerCase() === d.toLowerCase()) ||
                        h.toLowerCase().includes(key.replace('_', ' ').toLowerCase())
                    );
                    if (match) autoMapping[key] = match;
                });
                setTxnMapping(autoMapping);
                setTxnAdditionalFields([]);
            } else {
                setLoFile(file);
                setLoHeaders(headers);

                const savedMapping = await loadSavedMappings('low_cost_opportunity');

                if (savedMapping && Object.keys(savedMapping).length > 0) {
                    const validMapping = {};
                    Object.entries(savedMapping).forEach(([key, value]) => {
                        if (headers.includes(value)) {
                            validMapping[key] = value;
                        }
                    });

                    if (Object.keys(validMapping).length > 0) {
                        setLoMapping(validMapping);
                        setLoAdditionalFields([]);
                        toast({
                            title: "Mapping Loaded",
                            description: "Previously saved field mapping has been applied.",
                        });
                        return;
                    }
                }

                const autoMapping = {};
                const defaultMappings = {
                    'load_id': ['LoadId', 'LoadID', 'Load ID', 'Load_ID', 'Load'],
                    'selected_carrier': ['Selected_Carrier_Name', 'Selected Carrier Name', 'SelectedCarrierName'],
                    'selected_cost': ['Select_Carrier_Bill', 'Selected Carrier Cost', 'Selected Cost'],
                    'opportunity_carrier': ['LO_Carrier_Name', 'Low Cost Carrier Name', 'Opportunity Carrier'],
                    'opportunity_cost': ['LO_Carrier_Bill', 'Low Cost Carrier Cost', 'Opportunity Cost']
                };

                Object.keys(requiredLoFields).forEach(key => {
                    const defaults = defaultMappings[key] || [];
                    const match = headers.find(h =>
                        defaults.some(d => h.toLowerCase() === d.toLowerCase()) ||
                        h.toLowerCase().includes(key.replace('_', ' ').toLowerCase())
                    );
                    if (match) autoMapping[key] = match;
                });
                setLoMapping(autoMapping);
                setLoAdditionalFields([]);
            }

            setShowMapping(true);
        } catch (err) {
            setError(`Failed to read ${type === 'txn' ? 'transaction' : 'low cost opportunity'} file: ${err.message}`);
        }
    };

    const mutation = useMutation({
        mutationFn: async ({ txnFile, loFile, txnMapping, loMapping }) => {
            setError(null);

            const missingTxnFields = Object.keys(requiredTxnFields).filter(key => !txnMapping[key]);
            const missingLoFields = Object.keys(requiredLoFields).filter(key => !loMapping[key]);

            if (missingTxnFields.length > 0) {
                throw new Error(`Missing Transaction Detail mappings: ${missingTxnFields.map(k => requiredTxnFields[k]).join(', ')}`);
            }
            if (missingLoFields.length > 0) {
                throw new Error(`Missing Low Cost Opportunity mappings: ${missingLoFields.map(k => requiredLoFields[k]).join(', ')}`);
            }

            const timestamp = Date.now();
            const txnPath = `${user?.id || '00000000-0000-0000-0000-000000000000'}/${timestamp}_${txnFile.name}`;
            const loPath = `${user?.id || '00000000-0000-0000-0000-000000000000'}/${timestamp}_${loFile.name}`;

            const [txnUpload, loUpload] = await Promise.all([
                supabase.storage.from('documents').upload(txnPath, txnFile),
                supabase.storage.from('documents').upload(loPath, loFile)
            ]);

            if (txnUpload.error) throw new Error(`Transaction file upload failed: ${txnUpload.error.message}`);
            if (loUpload.error) throw new Error(`Low cost opportunity file upload failed: ${loUpload.error.message}`);

            const [txnText, loText] = await Promise.all([
                txnFile.text(),
                loFile.text()
            ]);

            const txnData = parseCSVWithMapping(txnText, txnMapping);
            const loData = parseCSVWithMapping(loText, loMapping);

            await Promise.all([
                saveMappings('transaction_detail', txnMapping),
                saveMappings('low_cost_opportunity', loMapping)
            ]);

            if (cspEventId) {
                const { data: { publicUrl: txnUrl } } = supabase.storage.from('documents').getPublicUrl(txnPath);
                const { data: { publicUrl: loUrl } } = supabase.storage.from('documents').getPublicUrl(loPath);

                await Document.create({
                    entity_type: 'csp_event',
                    entity_id: cspEventId,
                    csp_event_id: cspEventId,
                    file_name: txnFile.name,
                    file_path: txnUrl,
                    file_size: txnFile.size,
                    file_type: txnFile.type,
                    document_type: txnDocType,
                    uploaded_by: user?.email || 'Unknown',
                    user_id: user?.id || '00000000-0000-0000-0000-000000000000',
                    ai_processing_status: 'processing',
                });

                await Document.create({
                    entity_type: 'csp_event',
                    entity_id: cspEventId,
                    csp_event_id: cspEventId,
                    file_name: loFile.name,
                    file_path: loUrl,
                    file_size: loFile.size,
                    file_type: loFile.type,
                    document_type: loDocType,
                    uploaded_by: user?.email || 'Unknown',
                    user_id: user?.id || '00000000-0000-0000-0000-000000000000',
                    ai_processing_status: 'processing',
                });
            }

            return { txnData, loData };
        },
        onSuccess: async ({ txnData, loData }) => {
            if (cspEventId) {
                queryClient.invalidateQueries({ queryKey: ['documents', cspEventId] });

                try {
                    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-strategy-summary`;
                    const { data: { session } } = await supabase.auth.getSession();

                    const response = await fetch(apiUrl, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${session?.access_token}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            cspEventId,
                            analysisData: { txnData, loData }
                        })
                    });

                    if (response.ok) {
                        queryClient.invalidateQueries({ queryKey: ['csp_event', cspEventId] });
                    }
                } catch (err) {
                    console.error('Failed to generate AI summary:', err);
                }
            }

            onAnalysisComplete(txnData, loData);
        },
        onError: (err) => {
            setError(err.message);
        }
    });

    const FileDropzone = ({ file, setFile, title, docType, setDocType, type }) => (
        <div className="w-full space-y-2">
            <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-slate-700">{title}</Label>
                <Select value={docType} onValueChange={setDocType}>
                    <SelectTrigger className="w-[180px] h-8">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="transaction_detail">Transaction Detail</SelectItem>
                        <SelectItem value="low_cost_opportunity">Low Cost Opportunity</SelectItem>
                        <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            {file ? (
                <div className="p-2 border rounded-lg flex items-center justify-between bg-slate-50">
                    <div className="flex items-center gap-2 text-sm">
                        <File className="w-4 h-4 text-blue-500" />
                        <span className="font-medium">{file.name}</span>
                        <span className="text-slate-500">({(file.size / 1024).toFixed(1)} KB)</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setFile(null)}><X className="w-4 h-4" /></Button>
                </div>
            ) : (
                <div className="relative p-6 border-2 border-dashed rounded-lg text-center cursor-pointer hover:border-blue-500 transition-colors">
                    <UploadCloud className="w-6 h-6 mx-auto text-slate-400 mb-1" />
                    <p className="text-sm text-slate-500">Drag & drop or click</p>
                    <Input
                        type="file"
                        accept=".csv"
                        className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={(e) => e.target.files[0] && handleFileSelect(e.target.files[0], type)}
                    />
                </div>
            )}
        </div>
    );

    const ColumnMapper = ({ fields, headers, mapping, setMapping, title, additionalFields, setAdditionalFields, type }) => {
        const addAdditionalField = () => {
            setAdditionalFields([...additionalFields, { id: Date.now(), key: '', label: '', column: '' }]);
        };

        const updateAdditionalField = (id, updates) => {
            setAdditionalFields(additionalFields.map(field =>
                field.id === id ? { ...field, ...updates } : field
            ));
        };

        const removeAdditionalField = (id) => {
            setAdditionalFields(additionalFields.filter(field => field.id !== id));
            const newMapping = { ...mapping };
            const fieldToRemove = additionalFields.find(f => f.id === id);
            if (fieldToRemove?.key) {
                delete newMapping[fieldToRemove.key];
                setMapping(newMapping);
            }
        };

        const availableHeaders = headers.filter(h =>
            !Object.values(mapping).includes(h) ||
            additionalFields.some(f => f.column === h)
        );

        return (
            <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-700">{title}</h4>
                <div className="space-y-2">
                    {Object.entries(fields).map(([key, label]) => (
                        <div key={key} className="flex items-center gap-2">
                            <Label className="text-xs w-1/3">{label}</Label>
                            <Select
                                value={mapping[key] || ''}
                                onValueChange={(value) => setMapping({ ...mapping, [key]: value })}
                            >
                                <SelectTrigger className="w-2/3 h-8 text-xs">
                                    <SelectValue placeholder="Select column..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {headers.map(header => (
                                        <SelectItem key={header} value={header} className="text-xs">
                                            {header}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    ))}

                    {additionalFields.map((field) => (
                        <div key={field.id} className="flex items-center gap-2 pt-2 border-t">
                            <div className="flex-1 space-y-2">
                                <Input
                                    placeholder="Field name (e.g., customer_name)"
                                    value={field.label}
                                    onChange={(e) => {
                                        const label = e.target.value;
                                        const key = label.toLowerCase().replace(/\s+/g, '_');
                                        updateAdditionalField(field.id, { label, key });
                                    }}
                                    className="h-8 text-xs"
                                />
                                <Select
                                    value={field.column}
                                    onValueChange={(value) => {
                                        updateAdditionalField(field.id, { column: value });
                                        if (field.key) {
                                            setMapping({ ...mapping, [field.key]: value });
                                        }
                                    }}
                                >
                                    <SelectTrigger className="h-8 text-xs">
                                        <SelectValue placeholder="Select column..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableHeaders.map(header => (
                                            <SelectItem key={header} value={header} className="text-xs">
                                                {header}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeAdditionalField(field.id)}
                                className="h-8 w-8 p-0"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>

                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addAdditionalField}
                    className="w-full mt-2"
                >
                    <FileUp className="h-4 w-4 mr-2" />
                    Add Mapping Unit
                </Button>
            </div>
        );
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileUp className="w-5 h-5 text-blue-600" />Upload Strategy Files</CardTitle>
                <CardDescription>Upload shipment and low cost opportunity data to generate AI-powered insights.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FileDropzone
                        file={txnFile}
                        setFile={setTxnFile}
                        title="File A"
                        docType={txnDocType}
                        setDocType={setTxnDocType}
                        type="txn"
                    />
                    <FileDropzone
                        file={loFile}
                        setFile={setLoFile}
                        title="File B"
                        docType={loDocType}
                        setDocType={setLoDocType}
                        type="lo"
                    />
                </div>

                {showMapping && txnFile && loFile && (() => {
                    const missingTxnFields = Object.keys(requiredTxnFields).filter(key => !txnMapping[key]);
                    const missingLoFields = Object.keys(requiredLoFields).filter(key => !loMapping[key]);
                    const hasUnmappedFields = missingTxnFields.length > 0 || missingLoFields.length > 0;

                    if (!hasUnmappedFields) {
                        return (
                            <Alert>
                                <Info className="h-4 w-4" />
                                <AlertTitle>Column Mapping Complete</AlertTitle>
                                <AlertDescription>
                                    All required columns have been automatically mapped. Click "Upload & Analyze" to continue.
                                </AlertDescription>
                            </Alert>
                        );
                    }

                    return (
                        <div className="border rounded-lg p-4 space-y-4 bg-slate-50">
                            <div className="flex items-center gap-2 mb-3">
                                <Info className="w-4 h-4 text-blue-600" />
                                <h3 className="text-sm font-semibold text-slate-700">Map Your CSV Columns</h3>
                            </div>
                            <p className="text-xs text-slate-600 mb-4">
                                Match your CSV columns to the required fields. We've auto-detected some mappings, but please verify they're correct.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <ColumnMapper
                                    fields={requiredTxnFields}
                                    headers={txnHeaders}
                                    mapping={txnMapping}
                                    setMapping={setTxnMapping}
                                    title="Transaction Detail Columns"
                                    additionalFields={txnAdditionalFields}
                                    setAdditionalFields={setTxnAdditionalFields}
                                    type="txn"
                                />
                                <ColumnMapper
                                    fields={requiredLoFields}
                                    headers={loHeaders}
                                    mapping={loMapping}
                                    setMapping={setLoMapping}
                                    title="Low Cost Opportunity Columns"
                                    additionalFields={loAdditionalFields}
                                    setAdditionalFields={setLoAdditionalFields}
                                    type="lo"
                                />
                            </div>
                        </div>
                    );
                })()}

                {error && <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
                <Button
                    onClick={() => mutation.mutate({ txnFile, loFile, txnMapping, loMapping })}
                    disabled={!txnFile || !loFile || mutation.isLoading}
                    className="w-full"
                >
                    {mutation.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {mutation.isLoading ? 'Processing & Generating AI Summary...' : 'Upload & Analyze'}
                </Button>
            </CardContent>
        </Card>
    );
};

const AiSummaryPanel = ({ cspEvent }) => {
    const strategySummary = cspEvent?.strategy_summary;
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const { toast } = useToast();

    const { data: carriers = [] } = useQuery({
        queryKey: ['carriers'],
        queryFn: () => Carrier.list(),
        initialData: []
    });

    const getCarrierName = (scac) => {
        const carrier = carriers.find(c => c.scac_code?.toUpperCase() === scac?.toUpperCase());
        return carrier ? carrier.name : scac;
    };

    if (!strategySummary || !strategySummary.summary_text) {
        return null;
    }

    const handleSendMessage = async () => {
        if (!chatInput.trim() || isChatLoading) return;

        const userMessage = chatInput.trim();
        setChatInput('');
        setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsChatLoading(true);

        try {
            const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-with-strategy`;
            const { data: { session } } = await supabase.auth.getSession();

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    cspEventId: cspEvent.id,
                    message: userMessage,
                    conversationHistory: chatMessages
                })
            });

            if (!response.ok) {
                throw new Error('Failed to get AI response');
            }

            const data = await response.json();

            setChatMessages(prev => [...prev, {
                role: 'assistant',
                content: data.response
            }]);
        } catch (error) {
            console.error('Chat error:', error);
            toast({
                title: "Error",
                description: "Failed to get AI response. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsChatLoading(false);
        }
    };

    return (
        <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-blue-600" />
                            AI Strategy Summary
                        </CardTitle>
                        <CardDescription>
                            Generated {strategySummary.generated_at ? format(new Date(strategySummary.generated_at), 'MMM dd, yyyy') : 'recently'}
                        </CardDescription>
                    </div>
                    <Button
                        variant={showChat ? "default" : "outline"}
                        size="sm"
                        onClick={() => setShowChat(!showChat)}
                        className="gap-2"
                    >
                        <MessageCircle className="w-4 h-4" />
                        {showChat ? 'Hide Chat' : 'Chat with AI'}
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="prose prose-sm max-w-none whitespace-pre-line text-slate-700 leading-relaxed">
                    {strategySummary.summary_text}
                </div>

                {showChat && (
                    <div className="border-t pt-4 space-y-4">
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {chatMessages.length === 0 ? (
                                <div className="text-center text-slate-500 text-sm py-8">
                                    <MessageCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                                    Ask questions about the strategy analysis
                                </div>
                            ) : (
                                chatMessages.map((msg, idx) => (
                                    <div
                                        key={idx}
                                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[80%] rounded-lg px-4 py-2 ${
                                                msg.role === 'user'
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-white border text-slate-900'
                                            }`}
                                        >
                                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                            {isChatLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-white border rounded-lg px-4 py-2">
                                        <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Input
                                placeholder="Ask about the strategy data..."
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                disabled={isChatLoading}
                                className="flex-1"
                            />
                            <Button
                                onClick={handleSendMessage}
                                disabled={!chatInput.trim() || isChatLoading}
                                size="icon"
                            >
                                <Send className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

const DataVisualizationPanel = ({ cspEvent }) => {
    const strategySummary = cspEvent?.strategy_summary;

    const { data: carriers = [] } = useQuery({
        queryKey: ['carriers'],
        queryFn: () => Carrier.list(),
        initialData: []
    });

    const getCarrierName = (scac) => {
        const carrier = carriers.find(c => c.scac_code?.toUpperCase() === scac?.toUpperCase());
        return carrier ? carrier.name : scac;
    };

    if (!strategySummary || !strategySummary.carrier_breakdown) {
        return null;
    }

    const COLORS = ['#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#84cc16'];

    const carrierPieData = strategySummary.carrier_breakdown?.slice(0, 6).map((item, idx) => ({
        name: getCarrierName(item.carrier),
        value: item.percentage,
        shipments: item.shipments,
    })) || [];

    const carrierBarData = strategySummary.carrier_breakdown?.slice(0, 5).map(item => {
        const carrierName = getCarrierName(item.carrier);
        return {
            carrier: carrierName.length > 15 ? carrierName.substring(0, 15) + '...' : carrierName,
            spend: Math.round(item.spend),
            shipments: item.shipments,
        };
    }) || [];

    const laneData = strategySummary.top_lanes?.map(item => ({
        lane: item.lane.length > 20 ? item.lane.substring(0, 20) + '...' : item.lane,
        shipments: item.shipments,
        spend: Math.round(item.spend),
    })) || [];

    const savingsData = strategySummary.missed_savings_by_carrier?.map(item => ({
        carrier: item.carrier.length > 15 ? item.carrier.substring(0, 15) + '...' : item.carrier,
        savings: Math.round(item.savings),
        opportunities: item.opportunities,
    })) || [];

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <BarChart className="w-5 h-5" />
                    Data Visualizations
                </CardTitle>
                <CardDescription>Visual breakdown of shipment data and opportunities</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-200">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-600 mb-1">Total Shipments</p>
                                    <p className="text-2xl font-bold text-blue-600">{strategySummary.shipment_count?.toLocaleString()}</p>
                                    <p className="text-xs text-slate-500 mt-1">{strategySummary.lane_count} unique lanes</p>
                                </div>
                                <Package className="w-10 h-10 text-blue-300" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-green-50 to-white border-green-200">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-600 mb-1">Total Spend</p>
                                    <p className="text-2xl font-bold text-green-600">${Math.round(strategySummary.total_spend || 0).toLocaleString()}</p>
                                    <p className="text-xs text-slate-500 mt-1">Across all carriers</p>
                                </div>
                                <DollarSign className="w-10 h-10 text-green-300" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-red-50 to-white border-red-200">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-600 mb-1">Missed Savings</p>
                                    <p className="text-2xl font-bold text-red-600">${Math.round(strategySummary.lost_opportunity_total || 0).toLocaleString()}</p>
                                    <p className="text-xs text-slate-500 mt-1">{strategySummary.lost_opportunity_count} opportunities</p>
                                </div>
                                <TrendingDown className="w-10 h-10 text-red-300" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Tabs defaultValue="carriers" className="w-full">
                    <TabsList className="grid w-full grid-cols-5">
                        <TabsTrigger value="carriers">Carrier Mix</TabsTrigger>
                        <TabsTrigger value="spend">Spend Analysis</TabsTrigger>
                        <TabsTrigger value="lanes">Top Lanes</TabsTrigger>
                        <TabsTrigger value="savings">Savings Potential</TabsTrigger>
                        <TabsTrigger value="concentration">Concentration</TabsTrigger>
                    </TabsList>

                    <TabsContent value="carriers" className="space-y-4">
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={carrierPieData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                        outerRadius={100}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {carrierPieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value, name, props) => [
                                            `${value}% (${props.payload.shipments} shipments)`,
                                            'Share'
                                        ]}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="space-y-2">
                            <p className="text-sm font-medium">Carrier Distribution</p>
                            <div className="space-y-1">
                                {strategySummary.carrier_breakdown?.slice(0, 10).map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-sm gap-2">
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                            <span className="text-slate-600 truncate">{getCarrierName(item.carrier)}</span>
                                            {item.ownership && item.ownership !== 'Unknown' && (
                                                <Badge variant="outline" className="text-xs shrink-0">
                                                    {item.ownership}
                                                </Badge>
                                            )}
                                        </div>
                                        <span className="font-medium shrink-0">{item.percentage}% ({item.shipments})</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="spend" className="space-y-4">
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <RechartsBarChart data={carrierBarData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="carrier" angle={-45} textAnchor="end" height={100} />
                                    <YAxis />
                                    <Tooltip
                                        formatter={(value, name) => [
                                            name === 'spend' ? `$${value.toLocaleString()}` : value,
                                            name === 'spend' ? 'Total Spend' : 'Shipments'
                                        ]}
                                    />
                                    <Legend />
                                    <Bar dataKey="spend" fill="#3b82f6" name="Total Spend ($)" />
                                </RechartsBarChart>
                            </ResponsiveContainer>
                        </div>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Carrier</TableHead>
                                    <TableHead className="text-right">Shipments</TableHead>
                                    <TableHead className="text-right">Total Spend</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {strategySummary.carrier_breakdown?.slice(0, 5).map((item, idx) => (
                                    <TableRow key={idx}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{getCarrierName(item.carrier)}</span>
                                                {item.ownership && item.ownership !== 'Unknown' && (
                                                    <Badge variant="outline" className="text-xs">
                                                        {item.ownership}
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">{item.shipments.toLocaleString()}</TableCell>
                                        <TableCell className="text-right">${Math.round(item.spend).toLocaleString()}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TabsContent>

                    <TabsContent value="lanes" className="space-y-4">
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <RechartsBarChart data={laneData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" />
                                    <YAxis dataKey="lane" type="category" width={150} />
                                    <Tooltip
                                        formatter={(value, name) => [
                                            name === 'spend' ? `$${value.toLocaleString()}` : value,
                                            name === 'spend' ? 'Total Spend' : 'Shipments'
                                        ]}
                                    />
                                    <Legend />
                                    <Bar dataKey="shipments" fill="#10b981" name="Shipments" />
                                </RechartsBarChart>
                            </ResponsiveContainer>
                        </div>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Lane</TableHead>
                                    <TableHead className="text-right">Shipments</TableHead>
                                    <TableHead className="text-right">Total Spend</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {strategySummary.top_lanes?.map((item, idx) => (
                                    <TableRow key={idx}>
                                        <TableCell className="font-medium">{item.lane}</TableCell>
                                        <TableCell className="text-right">{item.shipments.toLocaleString()}</TableCell>
                                        <TableCell className="text-right">${Math.round(item.spend).toLocaleString()}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TabsContent>

                    <TabsContent value="savings" className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="h-80">
                                <p className="text-sm font-medium mb-2">Savings by Carrier</p>
                                <ResponsiveContainer width="100%" height="100%">
                                    <RechartsBarChart data={savingsData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="carrier" angle={-45} textAnchor="end" height={100} />
                                        <YAxis />
                                        <Tooltip
                                            formatter={(value, name) => [
                                                name === 'savings' ? `$${value.toLocaleString()}` : value,
                                                name === 'savings' ? 'Missed Savings' : 'Opportunities'
                                            ]}
                                        />
                                        <Legend />
                                        <Bar dataKey="savings" fill="#ef4444" name="Missed Savings ($)" />
                                    </RechartsBarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="h-80">
                                <p className="text-sm font-medium mb-2">Opportunity Distribution</p>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={savingsData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ carrier, percent }) => `${carrier}: ${(percent * 100).toFixed(0)}%`}
                                            outerRadius={100}
                                            fill="#8884d8"
                                            dataKey="savings"
                                        >
                                            {savingsData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16'][index % 5]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Savings']} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                                <div>
                                    <p className="font-semibold text-amber-900">Savings Opportunity Summary</p>
                                    <p className="text-sm text-amber-800 mt-1">
                                        Total potential savings of <span className="font-bold">${Math.round(strategySummary.lost_opportunity_total || 0).toLocaleString()}</span> identified across {strategySummary.lost_opportunity_count} loads.
                                        Focus renegotiations on {strategySummary.missed_savings_by_carrier?.[0]?.carrier} for maximum impact.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Carrier</TableHead>
                                    <TableHead className="text-right">Opportunities</TableHead>
                                    <TableHead className="text-right">Potential Savings</TableHead>
                                    <TableHead className="text-right">Avg Per Load</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {strategySummary.missed_savings_by_carrier?.map((item, idx) => (
                                    <TableRow key={idx}>
                                        <TableCell className="font-medium">{item.carrier}</TableCell>
                                        <TableCell className="text-right">{item.opportunities.toLocaleString()}</TableCell>
                                        <TableCell className="text-right text-red-600 font-semibold">
                                            ${Math.round(item.savings).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right text-slate-600">
                                            ${Math.round(item.savings / item.opportunities).toLocaleString()}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TabsContent>

                    <TabsContent value="concentration" className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Card className="bg-slate-50">
                                <CardContent className="pt-6">
                                    <p className="text-sm text-slate-600 mb-3">Top 3 Carrier Concentration</p>
                                    <p className="text-4xl font-bold text-slate-900">
                                        {(strategySummary.carrier_breakdown?.slice(0, 3).reduce((sum, c) => sum + c.percentage, 0) || 0).toFixed(1)}%
                                    </p>
                                    <p className="text-xs text-slate-500 mt-2">of total shipment volume</p>
                                    {(strategySummary.carrier_breakdown?.slice(0, 3).reduce((sum, c) => sum + c.percentage, 0) || 0) > 70 ? (
                                        <div className="mt-3 flex items-center gap-2 text-xs text-green-700 bg-green-100 px-2 py-1 rounded">
                                            <CheckCircle2 className="w-3 h-3" />
                                            Strong negotiating leverage
                                        </div>
                                    ) : (
                                        <div className="mt-3 flex items-center gap-2 text-xs text-amber-700 bg-amber-100 px-2 py-1 rounded">
                                            <AlertCircle className="w-3 h-3" />
                                            Consider volume consolidation
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                            <Card className="bg-slate-50">
                                <CardContent className="pt-6">
                                    <p className="text-sm text-slate-600 mb-3">Diversification Index</p>
                                    <p className="text-4xl font-bold text-slate-900">
                                        {(strategySummary.carrier_breakdown?.length || 0)}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-2">active carriers</p>
                                    <div className="mt-3 text-xs text-slate-600">
                                        {strategySummary.carrier_breakdown?.length > 10 ? 'Highly diversified network' : 'Moderate diversification'}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                        <div>
                            <p className="text-sm font-medium mb-3">Carrier Spend Concentration</p>
                            <div className="space-y-2">
                                {strategySummary.carrier_breakdown?.slice(0, 10).map((item, idx) => {
                                    const isHighConcentration = item.percentage > 15;
                                    return (
                                        <div key={idx} className="space-y-1">
                                            <div className="flex items-center justify-between text-sm gap-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="font-medium text-slate-700 truncate">{getCarrierName(item.carrier)}</span>
                                                    {item.ownership && item.ownership !== 'Unknown' && (
                                                        <Badge variant="outline" className="text-xs shrink-0">
                                                            {item.ownership}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <span className="text-slate-600 shrink-0">{item.percentage}% ({item.shipments})</span>
                                            </div>
                                            <div className="w-full bg-slate-200 rounded-full h-2">
                                                <div
                                                    className={`h-2 rounded-full ${isHighConcentration ? 'bg-blue-600' : 'bg-slate-400'}`}
                                                    style={{ width: `${item.percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5" />
                                <div>
                                    <p className="font-semibold text-blue-900">Concentration Analysis</p>
                                    <p className="text-sm text-blue-800 mt-1">
                                        Your top carrier ({getCarrierName(strategySummary.carrier_breakdown?.[0]?.carrier)}) handles {strategySummary.carrier_breakdown?.[0]?.percentage}% of volume.
                                        {(strategySummary.carrier_breakdown?.[0]?.percentage || 0) > 30
                                            ? ' This concentration provides strong negotiating power but also creates dependency risk.'
                                            : ' Consider consolidating volume for better rates and leverage.'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
};

const DocumentsPanel = ({ cspEventId }) => {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: documents = [], isLoading } = useQuery({
        queryKey: ['documents', cspEventId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('documents')
                .select('*')
                .eq('csp_event_id', cspEventId)
                .order('created_date', { ascending: false });

            if (error) throw error;
            return data || [];
        },
        enabled: !!cspEventId,
    });

    const deleteMutation = useMutation({
        mutationFn: async (docId) => {
            const { error } = await supabase
                .from('documents')
                .delete()
                .eq('id', docId);

            if (error) throw error;

            const { data: remainingDocs, error: checkError } = await supabase
                .from('documents')
                .select('id')
                .eq('csp_event_id', cspEventId)
                .in('document_type', ['transaction_detail', 'low_cost_opportunity']);

            if (checkError) throw checkError;

            if (!remainingDocs || remainingDocs.length === 0) {
                const { error: updateError } = await supabase
                    .from('csp_events')
                    .update({
                        strategy_summary: {},
                        strategy_summary_updated_at: null
                    })
                    .eq('id', cspEventId);

                if (updateError) throw updateError;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['documents', cspEventId] });
            queryClient.invalidateQueries({ queryKey: ['csp_event', cspEventId] });
            toast({
                title: "Document Deleted",
                description: "Document removed successfully.",
                duration: 3000,
            });
        },
        onError: (error) => {
            toast({
                title: "Error",
                description: error.message || "Failed to delete document.",
                variant: "destructive",
                duration: 5000,
            });
        }
    });

    const getDocTypeLabel = (docType) => {
        const labels = {
            transaction_detail: 'Transaction Detail',
            low_cost_opportunity: 'Low Cost Opportunity',
            summary: 'Summary',
            general: 'General',
        };
        return labels[docType] || docType;
    };

    const getDocTypeBadge = (docType) => {
        const variants = {
            transaction_detail: 'default',
            low_cost_opportunity: 'secondary',
            summary: 'outline',
            general: 'outline',
        };
        return variants[docType] || 'outline';
    };

    if (!cspEventId) return null;

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Related Documents</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-12 bg-slate-100 animate-pulse rounded" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Related Documents
                </CardTitle>
                <CardDescription>Files uploaded and stored for this CSP event</CardDescription>
            </CardHeader>
            <CardContent>
                {documents.length === 0 ? (
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>No Documents</AlertTitle>
                        <AlertDescription>
                            Upload files above to track them here.
                        </AlertDescription>
                    </Alert>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>File</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Uploaded</TableHead>
                                <TableHead>Size</TableHead>
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {documents.map((doc) => (
                                <TableRow key={doc.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <File className="w-4 h-4 text-blue-500" />
                                            <span className="font-medium">{doc.file_name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={getDocTypeBadge(doc.document_type)}>
                                            {getDocTypeLabel(doc.document_type)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm text-slate-600">
                                        {format(new Date(doc.created_date), 'MMM dd, yyyy')}
                                    </TableCell>
                                    <TableCell className="text-sm text-slate-600">
                                        {(doc.file_size / 1024).toFixed(1)} KB
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => deleteMutation.mutate(doc.id)}
                                            disabled={deleteMutation.isPending}
                                        >
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
};

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

export default function CspStrategyTab({ customer, cspEventId = null, cspEvent = null }) {
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
            adoption_pct
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
                        Run a strategy analysis for this specific bid opportunity. Upload transaction and low cost opportunity data relevant to this event's timeframe and lanes.
                    </AlertDescription>
                </Alert>
            )}

            {cspEvent && <AiSummaryPanel cspEvent={cspEvent} />}

            {cspEvent && <StrategyScacMatch strategySummary={cspEvent?.strategy_summary} />}

            {cspEvent && <DataVisualizationPanel cspEvent={cspEvent} />}

            <UploadPanel cspEventId={cspEventId} onAnalysisComplete={runAnalysis} />

            {cspEventId && <DocumentsPanel cspEventId={cspEventId} />}

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
                        Upload both a Transaction Detail and a Low Cost Opportunity file to run the CSP strategy analysis. The results will appear here.
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
