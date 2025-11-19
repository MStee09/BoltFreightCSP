
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, Link, useLocation } from 'react-router-dom';
import { Customer, Carrier, Tariff, CSPEvent, Task, Interaction, Alert, Shipment, LostOpportunity, ReportSnapshot } from '../api/entities';
import { supabase } from '../api/supabaseClient';
import { createPageUrl } from '../utils';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { ArrowLeft, Edit, File, UploadCloud, Download, X, Loader2, BookMarked, ArrowRight, Users, Pencil, Check, Eye, ExternalLink, Sparkles, MessageSquare, Send, Bug } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Textarea } from '../components/ui/textarea';
import { ScrollArea } from '../components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import EditTariffDialog from '../components/tariffs/EditTariffDialog';
import TariffSopsTab from '../components/tariffs/TariffSopsTab';
import { BackButton } from '../components/navigation/BackButton';
import LinkedCspSummaryCard from '../components/tariffs/LinkedCspSummaryCard';
import RenewalStatusBadge from '../components/tariffs/RenewalStatusBadge';
import TariffActivityTimeline from '../components/tariffs/TariffActivityTimeline';
import { useToast } from '../components/ui/use-toast';

const MOCK_USER_ID = '00000000-0000-0000-0000-000000000000';

const TariffDocumentManager = ({ tariff }) => {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [file, setFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [customFileName, setCustomFileName] = useState('');
    const [isRenaming, setIsRenaming] = useState(false);
    const [newName, setNewName] = useState(tariff.file_name || '');
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatMessages, setChatMessages] = useState([]);
    const [currentQuestion, setCurrentQuestion] = useState('');

    const mutation = useMutation({
        mutationFn: async (newFile) => {
            const fileName = `${Date.now()}_${newFile.name}`;
            const filePath = `${MOCK_USER_ID}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('documents')
                .upload(filePath, newFile);

            if (uploadError) throw uploadError;

            const displayName = customFileName.trim() || newFile.name;

            await Tariff.update(tariff.id, {
                file_url: filePath,
                file_name: displayName
            });

            await Interaction.create({
                entity_type: 'tariff',
                entity_id: tariff.id,
                interaction_type: 'document_upload',
                summary: `Tariff Document Uploaded: ${displayName}`,
                details: `Uploaded tariff document for ${tariff.tariff_name || 'tariff'}.`,
                metadata: {
                    file_name: displayName,
                    file_size: newFile.size
                }
            });

            return { filePath, fileName: displayName };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tariff', tariff.id] });
            toast({
                title: "Success!",
                description: "Tariff document uploaded successfully.",
            });
            setFile(null);
            setCustomFileName('');
        },
        onError: (error) => {
            toast({
                title: "Error",
                description: error.message || "Failed to upload document.",
                variant: "destructive",
            });
        }
    });

    const handleFileChange = (e) => e.target.files && e.target.files[0] && setFile(e.target.files[0]);
    const handleDragEnter = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
    const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
    const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };
    const handleDrop = (e) => {
        e.preventDefault(); e.stopPropagation(); setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
        }
    };
    const handleUpload = () => file && mutation.mutate(file);

    const renameMutation = useMutation({
        mutationFn: async (newFileName) => {
            await Tariff.update(tariff.id, {
                file_name: newFileName
            });

            await Interaction.create({
                entity_type: 'tariff',
                entity_id: tariff.id,
                interaction_type: 'note',
                summary: `Document Renamed`,
                details: `Renamed document to: ${newFileName}`,
                metadata: {
                    old_name: tariff.file_name,
                    new_name: newFileName
                }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tariff', tariff.id] });
            toast({
                title: "Success!",
                description: "Document renamed successfully.",
            });
            setIsRenaming(false);
        },
        onError: (error) => {
            toast({
                title: "Error",
                description: "Failed to rename document.",
                variant: "destructive",
            });
        }
    });

    const handleRename = () => {
        if (newName.trim() && newName !== tariff.file_name) {
            renameMutation.mutate(newName.trim());
        } else {
            setIsRenaming(false);
        }
    };

    const summarizeMutation = useMutation({
        mutationFn: async () => {
            const { data, error } = await supabase.functions.invoke('summarize-document', {
                body: { tariffId: tariff.id }
            });

            if (error) throw error;
            if (!data.success) throw new Error(data.error);

            return data.summary;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tariff', tariff.id] });
            toast({
                title: "Success!",
                description: "Document summary generated successfully.",
            });
        },
        onError: (error) => {
            toast({
                title: "Error",
                description: error.message || "Failed to generate summary.",
                variant: "destructive",
            });
        }
    });

    const debugMutation = useMutation({
        mutationFn: async () => {
            const { data, error } = await supabase.functions.invoke('debug-pdf-extraction', {
                body: { tariffId: tariff.id }
            });

            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            const debugWindow = window.open('', '_blank');
            if (debugWindow) {
                debugWindow.document.write(`
                    <html>
                        <head><title>PDF Debug Info</title></head>
                        <body style="font-family: monospace; padding: 20px; background: #1e1e1e; color: #d4d4d4;">
                            <h2 style="color: #4fc3f7;">PDF Extraction Debug Information</h2>
                            <pre style="background: #2d2d2d; padding: 15px; border-radius: 5px; overflow-x: auto; white-space: pre-wrap;">${JSON.stringify(data, null, 2)}</pre>
                        </body>
                    </html>
                `);
                debugWindow.document.close();
            }
        },
        onError: (error) => {
            toast({
                title: "Error",
                description: error.message || "Failed to debug document.",
                variant: "destructive",
            });
        }
    });

    const chatMutation = useMutation({
        mutationFn: async (question) => {
            const conversationHistory = chatMessages.map(msg => ({
                role: msg.role,
                content: msg.content
            }));

            const { data, error } = await supabase.functions.invoke('chat-with-document', {
                body: {
                    tariffId: tariff.id,
                    question,
                    conversationHistory
                }
            });

            if (error) throw error;
            if (!data.success) throw new Error(data.error);

            return data.answer;
        },
        onSuccess: (answer) => {
            setChatMessages(prev => [...prev,
                { role: 'user', content: currentQuestion },
                { role: 'assistant', content: answer }
            ]);
            setCurrentQuestion('');
        },
        onError: (error) => {
            toast({
                title: "Error",
                description: error.message || "Failed to get answer.",
                variant: "destructive",
            });
        }
    });

    const handleAskQuestion = () => {
        if (currentQuestion.trim()) {
            chatMutation.mutate(currentQuestion);
        }
    };

    const handleView = async () => {
        if (!tariff.file_url) return;

        try {
            const { data, error } = await supabase.storage
                .from('documents')
                .createSignedUrl(tariff.file_url, 3600);

            if (error) throw error;

            window.open(data.signedUrl, '_blank');
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to view document.",
                variant: "destructive",
            });
        }
    };

    const handleDownload = async () => {
        if (!tariff.file_url) return;

        try {
            const { data, error } = await supabase.storage
                .from('documents')
                .download(tariff.file_url);

            if (error) throw error;

            const url = URL.createObjectURL(data);
            const a = window.document.createElement('a');
            a.href = url;
            a.download = tariff.file_name || 'tariff-document.pdf';
            window.document.body.appendChild(a);
            a.click();
            window.document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to download document.",
                variant: "destructive",
            });
        }
    };

    return (
        <Card id="documents-section">
            <CardHeader>
                <CardTitle>Tariff Document</CardTitle>
            </CardHeader>
            <CardContent>
                {tariff.file_url ? (
                    <div className="space-y-4">
                        <div className="p-4 border rounded-lg bg-slate-50">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3 flex-1">
                                    <File className="w-6 h-6 text-blue-500"/>
                                    {isRenaming ? (
                                        <div className="flex items-center gap-2 flex-1">
                                            <Input
                                                value={newName}
                                                onChange={(e) => setNewName(e.target.value)}
                                                className="h-8"
                                                placeholder="Enter document name"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleRename();
                                                    if (e.key === 'Escape') setIsRenaming(false);
                                                }}
                                                autoFocus
                                            />
                                            <Button size="sm" variant="ghost" onClick={handleRename} disabled={renameMutation.isPending}>
                                                <Check className="w-4 h-4"/>
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={() => { setIsRenaming(false); setNewName(tariff.file_name || ''); }}>
                                                <X className="w-4 h-4"/>
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 flex-1">
                                            <p className="font-medium text-sm">{tariff.file_name || 'Tariff Document'}</p>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => { setIsRenaming(true); setNewName(tariff.file_name || ''); }}
                                                className="h-7 w-7 p-0"
                                            >
                                                <Pencil className="w-3 h-3"/>
                                            </Button>
                                        </div>
                                    )}
                                </div>
                                {!isRenaming && (
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" size="sm" onClick={handleView}>
                                            <Eye className="w-4 h-4 mr-2"/>View
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={handleDownload}>
                                            <Download className="w-4 h-4 mr-2"/>Download
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 justify-center">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => summarizeMutation.mutate()}
                                disabled={summarizeMutation.isPending}
                            >
                                {summarizeMutation.isPending ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin"/>
                                        Generating Summary...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4 mr-2"/>
                                        {tariff.ai_summary ? 'Regenerate' : 'Generate'} AI Summary
                                    </>
                                )}
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => debugMutation.mutate()}
                                disabled={debugMutation.isPending}
                                title="Debug PDF text extraction"
                            >
                                {debugMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin"/>
                                ) : (
                                    <Bug className="w-4 h-4"/>
                                )}
                            </Button>
                            <Dialog open={isChatOpen} onOpenChange={setIsChatOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="sm">
                                        <MessageSquare className="w-4 h-4 mr-2"/>
                                        Chat with Document
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl h-[600px] flex flex-col">
                                    <DialogHeader>
                                        <DialogTitle>Chat with Document</DialogTitle>
                                        <DialogDescription>
                                            Ask questions about this tariff document
                                        </DialogDescription>
                                    </DialogHeader>
                                    <ScrollArea className="flex-1 pr-4">
                                        <div className="space-y-4">
                                            {chatMessages.length === 0 ? (
                                                <div className="text-center py-12 text-slate-500">
                                                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50"/>
                                                    <p>Ask any question about this document</p>
                                                    <p className="text-sm mt-2">Example: What are the payment terms?</p>
                                                </div>
                                            ) : (
                                                chatMessages.map((msg, idx) => (
                                                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                        <div className={`max-w-[80%] p-3 rounded-lg ${
                                                            msg.role === 'user'
                                                                ? 'bg-blue-500 text-white'
                                                                : 'bg-slate-100 text-slate-900'
                                                        }`}>
                                                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                            {chatMutation.isPending && (
                                                <div className="flex justify-start">
                                                    <div className="max-w-[80%] p-3 rounded-lg bg-slate-100">
                                                        <Loader2 className="w-4 h-4 animate-spin"/>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </ScrollArea>
                                    <div className="flex gap-2 pt-4 border-t">
                                        <Input
                                            value={currentQuestion}
                                            onChange={(e) => setCurrentQuestion(e.target.value)}
                                            placeholder="Ask a question..."
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleAskQuestion();
                                                }
                                            }}
                                            disabled={chatMutation.isPending}
                                        />
                                        <Button
                                            onClick={handleAskQuestion}
                                            disabled={!currentQuestion.trim() || chatMutation.isPending}
                                        >
                                            <Send className="w-4 h-4"/>
                                        </Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>

                        {tariff.ai_summary && (
                            <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
                                <div className="flex items-start gap-3">
                                    <Sparkles className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0"/>
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-blue-900 mb-2">AI Summary</h4>
                                        <div className="text-sm text-blue-800 whitespace-pre-wrap">
                                            {tariff.ai_summary}
                                        </div>
                                        {tariff.ai_summary_generated_at && (
                                            <p className="text-xs text-blue-600 mt-2">
                                                Generated {format(new Date(tariff.ai_summary_generated_at), 'MMM d, yyyy h:mm a')}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                         <p className="text-sm text-slate-600 text-center">To replace this document, upload a new one below.</p>
                    </div>
                ) : (
                    <p className="text-sm text-slate-600 text-center pb-4">No document has been uploaded for this tariff yet.</p>
                )}

                <div className="mt-4">
                    {file ? (
                        <div className="p-4 border rounded-lg space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <File className="w-6 h-6 text-blue-500"/>
                                    <p className="font-medium text-sm">{file.name}</p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">
                                    Document Name (optional)
                                </label>
                                <Input
                                    value={customFileName}
                                    onChange={(e) => setCustomFileName(e.target.value)}
                                    placeholder={file.name}
                                    className="h-9"
                                />
                                <p className="text-xs text-slate-500">Leave blank to use the original file name</p>
                            </div>
                            <div className="flex items-center gap-2 justify-end">
                                <Button variant="ghost" size="sm" onClick={() => { setFile(null); setCustomFileName(''); }}>
                                    <X className="w-4 h-4 mr-1"/>Cancel
                                </Button>
                                <Button onClick={handleUpload} disabled={mutation.isPending}>
                                    {mutation.isPending ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin"/>
                                            Uploading...
                                        </>
                                    ) : (
                                        <>
                                            <UploadCloud className="w-4 h-4 mr-2"/>
                                            Upload
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    ) : (
                         <div onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop} className={`relative p-8 border-2 border-dashed rounded-lg text-center cursor-pointer hover:border-blue-500 transition-colors ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300'}`}>
                            <UploadCloud className="w-8 h-8 mx-auto text-slate-400 mb-2"/>
                            <p className="font-semibold text-slate-700">Drag & drop new file here</p>
                            <p className="text-sm text-slate-500">or click to browse</p>
                            <Input type="file" className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileChange} accept=".pdf,.doc,.docx,.xls,.xlsx"/>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

const InfoItem = ({ label, value, children }) => (
    <div>
        <p className="text-sm text-slate-500 font-medium">{label}</p>
        <p className="text-base text-slate-900 font-semibold">{children || value || 'N/A'}</p>
    </div>
);

export default function TariffDetailPage() {
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const tariffId = searchParams.get('id');
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');

    const { data: tariff, isLoading: isLoadingTariff } = useQuery({
        queryKey: ['tariff', tariffId],
        queryFn: () => Tariff.get(tariffId),
        enabled: !!tariffId,
    });

    const { data: customer, isLoading: isLoadingCustomer } = useQuery({
        queryKey: ['customer', tariff?.customer_id],
        queryFn: () => Customer.get(tariff.customer_id),
        enabled: !!tariff?.customer_id,
    });

    const carrierId = tariff?.carrier_ids?.[0] || tariff?.carrier_id;

    const { data: carrier, isLoading: isLoadingCarrier } = useQuery({
        queryKey: ['carrier', carrierId],
        queryFn: () => Carrier.get(carrierId),
        enabled: !!carrierId,
    });

    const { data: cspEvent, isLoading: isLoadingCspEvent } = useQuery({
        queryKey: ['csp_event', tariff?.csp_event_id],
        queryFn: () => CSPEvent.get(tariff.csp_event_id),
        enabled: !!tariff?.csp_event_id,
    });

    const isLoading = isLoadingTariff || isLoadingCustomer || isLoadingCarrier || isLoadingCspEvent;

    useEffect(() => {
        if (location.hash === '#documents' && tariff) {
            setActiveTab('documents');
            setTimeout(() => {
                const element = document.getElementById('documents-section');
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 100);
        }
    }, [location.hash, tariff]);

    const ownershipTypeLabel = {
        rocket_csp: 'Rocket CSP',
        customer_direct: 'Customer Direct',
        customer_csp: 'Customer CSP'
    }[tariff?.ownership_type] || tariff?.ownership_type || 'N/A';
    
    if (isLoading) {
        return (
            <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
                <Skeleton className="h-8 w-1/4" />
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-96 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    if (!tariff) {
        return <div className="p-8 text-center">Tariff not found.</div>;
    }

    const headerDescription = tariff.is_blanket_tariff
        ? `Blanket tariff${carrier ? ` with ${carrier.name}` : ''}`
        : `For ${customer?.name || '...'}${carrier ? ` with ${carrier.name}` : ''}`;

    return (
        <div className="p-6 lg:p-8 max-w-4xl mx-auto">
            <div className="mb-6">
                <BackButton fallbackPath="/Tariffs" />
            </div>

            <div className="flex items-start justify-between mb-6">
                <div>
                    <div className="flex items-center gap-3">
                        {tariff.is_blanket_tariff && <BookMarked className="w-8 h-8 text-blue-600"/>}
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">{tariff.tariff_reference_id || 'Untitled Tariff'}</h1>
                        </div>
                    </div>
                    <p className="text-slate-600 mt-2">{headerDescription}</p>
                </div>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
                    <Edit className="w-4 h-4 mr-2" /> Edit Details
                </Button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="activity">Activity</TabsTrigger>
                    <TabsTrigger value="documents">Documents</TabsTrigger>
                    <TabsTrigger value="sops">SOPs</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                    {cspEvent && carrier && (
                        <LinkedCspSummaryCard
                            cspEvent={cspEvent}
                            customer={customer}
                            carriers={[carrier]}
                        />
                    )}

                    {(cspEvent || customer) && (
                        <Card className="border-blue-200 bg-blue-50/50">
                            <CardHeader>
                                <CardTitle className="text-lg">Related Records</CardTitle>
                                <CardDescription>Quick links to associated customer and CSP event</CardDescription>
                            </CardHeader>
                            <CardContent className="flex gap-3">
                                {customer && (
                                    <Button variant="outline" className="bg-white" asChild>
                                        <Link to={createPageUrl(`Customers?detailId=${customer.id}`)}>
                                            <Users className="w-4 h-4 mr-2" />
                                            View Customer
                                            <ArrowRight className="w-4 h-4 ml-2" />
                                        </Link>
                                    </Button>
                                )}
                                {cspEvent && (
                                    <Button variant="outline" className="bg-white" asChild>
                                        <Link to={createPageUrl(`CspEventDetail?id=${cspEvent.id}`)}>
                                            <File className="w-4 h-4 mr-2" />
                                            View RFP
                                            <ArrowRight className="w-4 h-4 ml-2" />
                                        </Link>
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardHeader><CardTitle>Key Information</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-6">
                            <InfoItem label="Tariff ID" value={tariff.tariff_reference_id || 'N/A'} />
                            <InfoItem label="Status">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${ {active: 'bg-green-100 text-green-800', proposed: 'bg-blue-100 text-blue-800', expired: 'bg-slate-100 text-slate-700', superseded: 'bg-purple-100 text-purple-700'}[tariff.status] || 'bg-gray-100'}`}>{tariff.status}</span>
                            </InfoItem>
                            <InfoItem label="Type" value={ownershipTypeLabel} />
                            {tariff.ownership_type === 'rocket_csp' && tariff.rocket_csp_subtype && (
                                <InfoItem label="Rocket CSP Type">
                                    <Badge variant="default">
                                        {tariff.rocket_csp_subtype === 'rocket_owned' && 'Rocket Owned'}
                                        {tariff.rocket_csp_subtype === 'blanket' && 'Blanket Tariff'}
                                        {tariff.rocket_csp_subtype === 'care_of' && 'C/O (Care Of)'}
                                    </Badge>
                                </InfoItem>
                            )}
                            <InfoItem label="Service Type" value={tariff.mode || 'N/A'} />
                            <InfoItem label="Effective Date" value={tariff.effective_date ? format(new Date(tariff.effective_date), 'MMM d, yyyy') : 'N/A'} />
                            <InfoItem label="Expiry Date" value={tariff.expiry_date ? format(new Date(tariff.expiry_date), 'MMM d, yyyy') : 'N/A'} />
                            {!tariff.is_blanket_tariff && customer && <InfoItem label="Customer" value={customer.name} />}
                            <InfoItem label="Customer Contact" value={tariff.customer_contact_name} />
                            <InfoItem label="Carrier Contact" value={tariff.carrier_contact_name} />
                        </CardContent>
                    </Card>

                    {carrier && (
                        <Card>
                            <CardHeader><CardTitle>Carrier Information</CardTitle></CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                    <InfoItem label="Carrier" value={carrier.name} />
                                    <InfoItem label="Carrier Login">
                                        {(tariff.carrier_portal_url || carrier.portal_login_url) ? (
                                            <a
                                                href={tariff.carrier_portal_url || carrier.portal_login_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:text-blue-800 hover:underline break-all"
                                            >
                                                {tariff.carrier_portal_url || carrier.portal_login_url}
                                            </a>
                                        ) : (
                                            'N/A'
                                        )}
                                    </InfoItem>
                                    <InfoItem label="Username" value={tariff.credential_username} />
                                    <InfoItem label="Password" value={tariff.credential_password} />
                                    <InfoItem label="Shipper Number/Code" value={tariff.shipper_number} />
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardHeader><CardTitle>Billing Information</CardTitle></CardHeader>
                        <CardContent>
                            {tariff.billing_company_name || tariff.billing_contact_name ? (
                                <div className="space-y-6">
                                    <div>
                                        <h4 className="text-sm font-semibold text-slate-700 mb-3">Company & Address</h4>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                            <InfoItem label="Company Name" value={tariff.billing_company_name} />
                                            <div className="col-span-2">
                                                <InfoItem label="Address">
                                                    {tariff.billing_address_line1 || tariff.billing_city ? (
                                                        <div className="text-sm">
                                                            {tariff.billing_address_line1 && <div>{tariff.billing_address_line1}</div>}
                                                            {tariff.billing_address_line2 && <div>{tariff.billing_address_line2}</div>}
                                                            {(tariff.billing_city || tariff.billing_state || tariff.billing_postal_code) && (
                                                                <div>
                                                                    {tariff.billing_city && `${tariff.billing_city}, `}
                                                                    {tariff.billing_state && `${tariff.billing_state} `}
                                                                    {tariff.billing_postal_code}
                                                                </div>
                                                            )}
                                                            {tariff.billing_country && <div>{tariff.billing_country}</div>}
                                                        </div>
                                                    ) : (
                                                        <span className="text-sm text-slate-600">N/A</span>
                                                    )}
                                                </InfoItem>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="border-t pt-4">
                                        <h4 className="text-sm font-semibold text-slate-700 mb-3">Billing Contact</h4>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                            <InfoItem label="Contact Name" value={tariff.billing_contact_name} />
                                            <InfoItem label="Email" value={tariff.billing_contact_email} />
                                            <InfoItem label="Phone" value={tariff.billing_contact_phone} />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-slate-500 italic">No billing information on file</p>
                            )}
                        </CardContent>
                    </Card>

                    {tariff.notes && (
                        <Card>
                            <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
                            <CardContent>
                                <p className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 p-4 rounded-lg">
                                    {tariff.notes}
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="activity" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Lifecycle Activity</CardTitle>
                            <CardDescription>
                                Complete history of this tariff including CSP stages, updates, documents, and communications
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <TariffActivityTimeline
                                tariffId={tariffId}
                                tariffFamilyId={tariff.tariff_family_id}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="documents" className="space-y-6">
                    <TariffDocumentManager tariff={tariff} />
                </TabsContent>

                <TabsContent value="sops" className="space-y-6">
                    <TariffSopsTab
                        tariffId={tariffId}
                        tariffFamilyId={tariff.tariff_family_id}
                        carrierName={carrier?.name || 'N/A'}
                        customerName={customer?.name || 'N/A'}
                    />
                </TabsContent>
            </Tabs>

            <EditTariffDialog
                open={isEditDialogOpen}
                onOpenChange={setIsEditDialogOpen}
                tariff={tariff}
            />
        </div>
    );
}
