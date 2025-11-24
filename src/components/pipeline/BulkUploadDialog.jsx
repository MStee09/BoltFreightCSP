import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../api/supabaseClient';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useToast } from '../ui/use-toast';
import { Upload, Loader2, X, FileText, Check, Pencil } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';

export default function BulkUploadDialog({ selectedCarriers, carriers, cspEventId, open, onOpenChange, onSuccess }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [fileNames, setFileNames] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [fileCarrierMap, setFileCarrierMap] = useState({});
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
    setFileNames(files.map(f => f.name));

    const newMap = {};
    files.forEach((file, index) => {
      newMap[index] = new Set(selectedCarriers);
    });
    setFileCarrierMap(newMap);
  };

  const updateFileName = (index, newName) => {
    setFileNames(prev => {
      const updated = [...prev];
      updated[index] = newName;
      return updated;
    });
  };

  const toggleCarrierForFile = (fileIndex, carrierId) => {
    setFileCarrierMap(prev => {
      const newMap = { ...prev };
      const carrierSet = new Set(newMap[fileIndex] || []);

      if (carrierSet.has(carrierId)) {
        carrierSet.delete(carrierId);
      } else {
        carrierSet.add(carrierId);
      }

      newMap[fileIndex] = carrierSet;
      return newMap;
    });
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (selectedFiles.length === 0) {
        throw new Error('No files selected');
      }

      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      const updates = new Map();

      for (let fileIndex = 0; fileIndex < selectedFiles.length; fileIndex++) {
        const file = selectedFiles[fileIndex];
        const customName = fileNames[fileIndex] || file.name;
        const assignedCarriers = Array.from(fileCarrierMap[fileIndex] || []);

        if (assignedCarriers.length === 0) continue;

        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `csp_bids/${cspEventId}/bulk/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const docMetadata = {
          file_name: customName,
          file_path: filePath,
          uploaded_at: new Date().toISOString(),
          uploaded_by: user?.id || '00000000-0000-0000-0000-000000000000',
          file_size: file.size,
          file_type: file.type,
        };

        assignedCarriers.forEach(carrierId => {
          if (!updates.has(carrierId)) {
            updates.set(carrierId, []);
          }
          updates.get(carrierId).push(docMetadata);
        });
      }

      const updatePromises = [];
      for (const [carrierId, docs] of updates) {
        const carrier = carriers.find(c => c.carrier_id === carrierId);
        if (!carrier) continue;

        const existingDocs = carrier.bid_docs || [];
        const updatedDocs = [...existingDocs, ...docs];

        updatePromises.push(
          supabase.from('csp_event_carriers').update({
            bid_docs: updatedDocs,
            status: carrier.status === 'invited' ? 'submitted' : carrier.status,
            submitted_at: carrier.submitted_at || new Date().toISOString(),
          }).eq('id', carrier.id)
        );
      }

      await Promise.all(updatePromises);

      return { carrierCount: updates.size, fileCount: selectedFiles.length };
    },
    onSuccess: ({ carrierCount, fileCount }) => {
      queryClient.invalidateQueries(['csp_event_carriers']);
      toast({
        title: 'Upload Complete',
        description: `${fileCount} file(s) uploaded to ${carrierCount} carrier(s)`,
      });
      setSelectedFiles([]);
      setFileNames([]);
      setEditingIndex(null);
      setFileCarrierMap({});
      setUploading(false);
      onSuccess?.();
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

  const carrierList = carriers.filter(c => selectedCarriers.includes(c.carrier_id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Bulk Upload Bid Documents</DialogTitle>
          <DialogDescription>
            Upload files and assign them to selected carriers ({selectedCarriers.length} selected)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Input
              type="file"
              multiple
              onChange={handleFileSelect}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
            />
            <p className="text-xs text-slate-500 mt-1">
              Select files to upload (PDF, Word, Excel, CSV, TXT)
            </p>
          </div>

          {selectedFiles.length > 0 && (
            <ScrollArea className="h-[400px] border rounded-md p-4">
              <div className="space-y-4">
                {selectedFiles.map((file, fileIndex) => (
                  <Card key={fileIndex}>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-slate-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            {editingIndex === fileIndex ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  value={fileNames[fileIndex] || file.name}
                                  onChange={(e) => updateFileName(fileIndex, e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      setEditingIndex(null);
                                    } else if (e.key === 'Escape') {
                                      updateFileName(fileIndex, file.name);
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
                                <p className="text-sm font-medium truncate">{fileNames[fileIndex] || file.name}</p>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 flex-shrink-0"
                                  onClick={() => setEditingIndex(fileIndex)}
                                  disabled={uploading}
                                >
                                  <Pencil className="w-3 h-3 text-slate-400" />
                                </Button>
                              </div>
                            )}
                            <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-medium text-slate-700 mb-2">
                            Assign to carriers ({(fileCarrierMap[fileIndex]?.size || 0)} selected):
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {carrierList.map(carrier => {
                              const isSelected = fileCarrierMap[fileIndex]?.has(carrier.carrier_id);
                              return (
                                <label
                                  key={carrier.carrier_id}
                                  className="flex items-center gap-2 p-2 rounded border hover:bg-slate-50 cursor-pointer"
                                >
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() => toggleCarrierForFile(fileIndex, carrier.carrier_id)}
                                  />
                                  <span className="text-sm flex-1">{carrier.carrier?.name}</span>
                                  {isSelected && <Check className="w-3 h-3 text-green-600" />}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
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
            Upload to {selectedCarriers.length} Carrier(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
