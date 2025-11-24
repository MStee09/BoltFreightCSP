import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../api/supabaseClient';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useToast } from '../ui/use-toast';
import { Upload, Loader2, X, FileText, Pencil, Check } from 'lucide-react';
import { Card, CardContent } from '../ui/card';

export default function BidDocsUploadDialog({ eventCarrier, open, onOpenChange }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [fileNames, setFileNames] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(prev => [...prev, ...files]);
    setFileNames(prev => [...prev, ...files.map(f => f.name)]);
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setFileNames(prev => prev.filter((_, i) => i !== index));
  };

  const updateFileName = (index, newName) => {
    setFileNames(prev => {
      const updated = [...prev];
      updated[index] = newName;
      return updated;
    });
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (selectedFiles.length === 0) {
        throw new Error('No files selected');
      }

      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      const uploadedDocs = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const customName = fileNames[i] || file.name;
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `csp_bids/${eventCarrier.csp_event_id}/${eventCarrier.carrier_id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        uploadedDocs.push({
          file_name: customName,
          file_path: filePath,
          uploaded_at: new Date().toISOString(),
          uploaded_by: user?.id || '00000000-0000-0000-0000-000000000000',
          file_size: file.size,
          file_type: file.type,
        });
      }

      const existingDocs = eventCarrier.bid_docs || [];
      const updatedDocs = [...existingDocs, ...uploadedDocs];

      const { error: updateError } = await supabase
        .from('csp_event_carriers')
        .update({
          bid_docs: updatedDocs,
          status: eventCarrier.status === 'invited' ? 'submitted' : eventCarrier.status,
          submitted_at: eventCarrier.submitted_at || new Date().toISOString(),
        })
        .eq('id', eventCarrier.id);

      if (updateError) throw updateError;

      await supabase.from('customer_carrier_activities').insert({
        customer_id: eventCarrier.csp_event?.customer_id,
        carrier_id: eventCarrier.carrier_id,
        csp_event_id: eventCarrier.csp_event_id,
        csp_event_carrier_id: eventCarrier.id,
        activity_type: 'bid_documents_uploaded',
        description: `${uploadedDocs.length} bid document(s) uploaded`,
        user_id: '00000000-0000-0000-0000-000000000000',
      });

      return uploadedDocs;
    },
    onSuccess: (uploadedDocs) => {
      queryClient.invalidateQueries(['csp_event_carriers']);
      queryClient.invalidateQueries(['customer_carrier_activities']);
      toast({
        title: 'Success',
        description: `${uploadedDocs.length} document(s) uploaded successfully`,
      });
      setSelectedFiles([]);
      setFileNames([]);
      setEditingIndex(null);
      setUploading(false);
      onOpenChange(false);
    },
    onError: (error) => {
      setUploading(false);
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload documents',
        variant: 'destructive',
      });
    },
  });

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload Bid Documents</DialogTitle>
          <DialogDescription>
            Upload bid documents for {eventCarrier?.carrier?.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="file-upload">Select Files</Label>
            <div className="mt-2">
              <Input
                id="file-upload"
                type="file"
                multiple
                onChange={handleFileSelect}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Accepted: PDF, Word, Excel, CSV, TXT
            </p>
          </div>

          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <Label>Selected Files ({selectedFiles.length})</Label>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {selectedFiles.map((file, index) => (
                  <Card key={index}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileText className="w-4 h-4 text-slate-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            {editingIndex === index ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  value={fileNames[index] || file.name}
                                  onChange={(e) => updateFileName(index, e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      setEditingIndex(null);
                                    } else if (e.key === 'Escape') {
                                      updateFileName(index, file.name);
                                      setEditingIndex(null);
                                    }
                                  }}
                                  className="h-7 text-sm"
                                  autoFocus
                                  disabled={uploading}
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 flex-shrink-0"
                                  onClick={() => setEditingIndex(null)}
                                  disabled={uploading}
                                >
                                  <Check className="w-3 h-3 text-green-600" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <p className="text-sm font-medium truncate">{fileNames[index] || file.name}</p>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 flex-shrink-0"
                                  onClick={() => setEditingIndex(index)}
                                  disabled={uploading}
                                >
                                  <Pencil className="w-3 h-3 text-slate-400" />
                                </Button>
                              </div>
                            )}
                            <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 flex-shrink-0"
                          onClick={() => removeFile(index)}
                          disabled={uploading}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {(eventCarrier?.bid_docs?.length > 0) && (
            <div className="pt-4 border-t">
              <Label className="text-slate-600">Previously Uploaded ({eventCarrier.bid_docs.length})</Label>
              <p className="text-xs text-slate-500 mt-1">New files will be added to existing documents</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button
            onClick={() => uploadMutation.mutate()}
            disabled={selectedFiles.length === 0 || uploading}
          >
            {uploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <Upload className="w-4 h-4 mr-2" />
            Upload {selectedFiles.length > 0 && `(${selectedFiles.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
