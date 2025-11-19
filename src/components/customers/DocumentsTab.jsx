import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Document, Interaction } from '../../api/entities';
import { supabase } from '../../api/supabaseClient';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Card, CardContent } from '../ui/card';
import { useToast } from '../ui/use-toast';
import { Upload, FileText, Download, Trash2, File, Image as ImageIcon, FileSpreadsheet, Eye } from 'lucide-react';
import { format } from 'date-fns';

const MOCK_USER_ID = '00000000-0000-0000-0000-000000000000';

const getFileIcon = (fileType) => {
    if (fileType?.startsWith('image/')) return <ImageIcon className="w-8 h-8 text-blue-500" />;
    if (fileType?.includes('pdf')) return <FileText className="w-8 h-8 text-red-500" />;
    if (fileType?.includes('sheet') || fileType?.includes('excel')) return <FileSpreadsheet className="w-8 h-8 text-green-500" />;
    return <File className="w-8 h-8 text-slate-500" />;
};

const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

export default function DocumentsTab({ customerId, carrierId, cspEventId, entityType = 'customer' }) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const fileInputRef = useRef(null);
    const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
    const [uploadingFile, setUploadingFile] = useState(null);
    const [previewDocument, setPreviewDocument] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [uploadForm, setUploadForm] = useState({
        document_type: 'general',
        description: '',
    });

    const entityId = customerId || carrierId || cspEventId;

    const { data: documents = [], isLoading } = useQuery({
        queryKey: ['documents', entityType, entityId],
        queryFn: () => {
            const filter = { order_by: '-created_date' };
            if (customerId) filter.customer_id = customerId;
            if (carrierId) filter.entity_type = 'carrier';
            if (cspEventId) filter.csp_event_id = cspEventId;
            if (carrierId || cspEventId) filter.entity_id = entityId;
            return Document.filter(filter);
        },
        enabled: !!entityId,
        initialData: []
    });

    const uploadMutation = useMutation({
        mutationFn: async ({ file, metadata }) => {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_${file.name}`;
            const filePath = `${MOCK_USER_ID}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('documents')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const documentData = {
                entity_type: entityType,
                entity_id: entityId,
                customer_id: customerId || null,
                csp_event_id: cspEventId || null,
                file_name: file.name,
                file_path: filePath,
                file_size: file.size,
                file_type: file.type,
                document_type: metadata.document_type,
                description: metadata.description,
                uploaded_by: 'Current User',
            };

            const document = await Document.create(documentData);

            await Interaction.create({
                entity_type: entityType,
                entity_id: entityId,
                interaction_type: 'document_upload',
                summary: `Document Uploaded: ${file.name}`,
                details: metadata.description || `Uploaded a ${metadata.document_type} document.`,
                metadata: {
                    document_id: document.id,
                    document_type: metadata.document_type,
                    file_size: file.size
                }
            });

            return document;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['documents', entityType, entityId]);
            queryClient.invalidateQueries(['interactions', entityId, entityType]);
            toast({
                title: "Success!",
                description: "Document uploaded successfully.",
            });
            setIsUploadDialogOpen(false);
            setUploadingFile(null);
            setUploadForm({ document_type: 'general', description: '' });
        },
        onError: (error) => {
            toast({
                title: "Error",
                description: error.message || "Failed to upload document.",
                variant: "destructive",
            });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (document) => {
            await supabase.storage
                .from('documents')
                .remove([document.file_path]);

            await Document.delete(document.id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['documents', entityType, entityId]);
            toast({
                title: "Success!",
                description: "Document deleted successfully.",
            });
        },
        onError: (error) => {
            toast({
                title: "Error",
                description: error.message || "Failed to delete document.",
                variant: "destructive",
            });
        }
    });

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setUploadingFile(file);
            setIsUploadDialogOpen(true);
        }
    };

    const handleUpload = () => {
        if (!uploadingFile) return;
        uploadMutation.mutate({ file: uploadingFile, metadata: uploadForm });
    };

    const handleDownload = async (document) => {
        try {
            const { data, error } = await supabase.storage
                .from('documents')
                .download(document.file_path);

            if (error) throw error;

            const url = URL.createObjectURL(data);
            const a = window.document.createElement('a');
            a.href = url;
            a.download = document.file_name;
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

    const handlePreview = async (document) => {
        try {
            const { data, error } = await supabase.storage
                .from('documents')
                .download(document.file_path);

            if (error) throw error;

            const url = URL.createObjectURL(data);
            setPreviewUrl(url);
            setPreviewDocument(document);
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to preview document.",
                variant: "destructive",
            });
        }
    };

    const closePreview = () => {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
        setPreviewUrl(null);
        setPreviewDocument(null);
    };

    if (isLoading) {
        return <div className="py-8 text-center text-slate-500">Loading documents...</div>;
    }

    return (
        <div className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Documents</h3>
                <Button onClick={() => fileInputRef.current?.click()} className="gap-2">
                    <Upload className="w-4 h-4" />
                    Upload Document
                </Button>
                <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileSelect}
                />
            </div>

            {documents.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500 mb-2">No documents uploaded yet</p>
                        <p className="text-sm text-slate-400">Upload documents related to this customer</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {documents.map(doc => (
                        <Card key={doc.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                                <div className="flex items-start gap-4">
                                    <div className="flex-shrink-0">
                                        {getFileIcon(doc.file_type)}
                                    </div>
                                    <div className="flex-grow min-w-0">
                                        <h4 className="font-semibold text-slate-900 truncate">{doc.file_name}</h4>
                                        <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                                            <span className="capitalize">{doc.document_type.replace(/_/g, ' ')}</span>
                                            <span>•</span>
                                            <span>{formatFileSize(doc.file_size)}</span>
                                            <span>•</span>
                                            <span>{format(new Date(doc.created_date), 'MMM d, yyyy')}</span>
                                        </div>
                                        {doc.description && (
                                            <p className="text-sm text-slate-600 mt-2">{doc.description}</p>
                                        )}
                                    </div>
                                    <div className="flex gap-2 flex-shrink-0">
                                        {(doc.file_type?.includes('pdf') || doc.file_type?.startsWith('image/')) && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handlePreview(doc)}
                                                title="Preview"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </Button>
                                        )}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleDownload(doc)}
                                            title="Download"
                                        >
                                            <Download className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => deleteMutation.mutate(doc)}
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Upload Document</DialogTitle>
                        <DialogDescription>
                            Add details about the document you're uploading
                        </DialogDescription>
                    </DialogHeader>
                    {uploadingFile && (
                        <div className="space-y-4 py-4">
                            <div className="p-3 bg-slate-50 rounded-lg flex items-center gap-3">
                                {getFileIcon(uploadingFile.type)}
                                <div className="flex-grow min-w-0">
                                    <p className="font-medium truncate">{uploadingFile.name}</p>
                                    <p className="text-sm text-slate-500">{formatFileSize(uploadingFile.size)}</p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="document_type">Document Type</Label>
                                <Select
                                    value={uploadForm.document_type}
                                    onValueChange={(value) => setUploadForm(prev => ({ ...prev, document_type: value }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="general">General</SelectItem>
                                        <SelectItem value="contract">Contract</SelectItem>
                                        <SelectItem value="proposal">Proposal</SelectItem>
                                        <SelectItem value="report">Report</SelectItem>
                                        <SelectItem value="analysis">Analysis</SelectItem>
                                        <SelectItem value="presentation">Presentation</SelectItem>
                                        <SelectItem value="invoice">Invoice</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Description (Optional)</Label>
                                <Textarea
                                    id="description"
                                    value={uploadForm.description}
                                    onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Add a brief description..."
                                    rows={3}
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleUpload} disabled={uploadMutation.isPending}>
                            {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!previewDocument} onOpenChange={closePreview}>
                <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>{previewDocument?.file_name}</DialogTitle>
                        <DialogDescription>
                            {previewDocument?.document_type && (
                                <span className="capitalize">{previewDocument.document_type.replace(/_/g, ' ')}</span>
                            )}
                            {previewDocument?.file_size && ` • ${formatFileSize(previewDocument.file_size)}`}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-hidden">
                        {previewDocument?.file_type?.includes('pdf') ? (
                            <iframe
                                src={previewUrl}
                                className="w-full h-full border rounded"
                                title={previewDocument.file_name}
                            />
                        ) : previewDocument?.file_type?.startsWith('image/') ? (
                            <div className="w-full h-full flex items-center justify-center bg-slate-50 rounded">
                                <img
                                    src={previewUrl}
                                    alt={previewDocument.file_name}
                                    className="max-w-full max-h-full object-contain"
                                />
                            </div>
                        ) : null}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={closePreview}>Close</Button>
                        <Button onClick={() => handleDownload(previewDocument)}>
                            <Download className="w-4 h-4 mr-2" />
                            Download
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
