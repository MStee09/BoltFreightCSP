import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { KnowledgeBase } from '../../api/entities';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Upload, Trash2, FileText, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '../ui/alert';
import { format } from 'date-fns';

export default function KnowledgeBaseSettings() {
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['knowledge-base'],
    queryFn: () => KnowledgeBase.list(),
  });

  const createMutation = useMutation({
    mutationFn: (doc) => KnowledgeBase.create(doc),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-base'] });
      toast.success('Document uploaded successfully');
      setSelectedFile(null);
      setIsUploading(false);
    },
    onError: (error) => {
      toast.error(`Upload failed: ${error.message}`);
      setIsUploading(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }) => KnowledgeBase.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-base'] });
      toast.success('Document updated');
    },
    onError: (error) => {
      toast.error(`Update failed: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => KnowledgeBase.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-base'] });
      toast.success('Document deleted');
    },
    onError: (error) => {
      toast.error(`Delete failed: ${error.message}`);
    },
  });

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      const content = e.target.result;
      const fileExtension = selectedFile.name.split('.').pop().toLowerCase();

      createMutation.mutate({
        title: selectedFile.name,
        content,
        file_type: fileExtension,
        file_size: selectedFile.size,
        is_active: true,
      });
    };

    reader.onerror = () => {
      toast.error('Failed to read file');
      setIsUploading(false);
    };

    reader.readAsText(selectedFile);
  };

  const handleToggleActive = (doc) => {
    updateMutation.mutate({
      id: doc.id,
      updates: { is_active: !doc.is_active },
    });
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this document?')) {
      deleteMutation.mutate(id);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Knowledge Base Documents</CardTitle>
          <CardDescription>
            Upload documents that the AI chatbot will use to answer questions. Active documents will be included in the chatbot's context.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Currently supports plain text files (.txt, .md, .csv). Maximum file size: 5MB.
              The entire document content will be included in AI responses.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <Label htmlFor="file-upload">Upload Document</Label>
            <div className="flex gap-2">
              <Input
                id="file-upload"
                type="file"
                accept=".txt,.md,.csv,.log"
                onChange={handleFileSelect}
                disabled={isUploading}
              />
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
              >
                <Upload className="w-4 h-4 mr-2" />
                {isUploading ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
            {selectedFile && (
              <p className="text-sm text-slate-600">
                Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Uploaded Documents ({documents.length})</CardTitle>
          <CardDescription>
            Manage your knowledge base documents. Toggle documents on/off to control what the AI uses.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-slate-500">Loading documents...</div>
          ) : documents.length === 0 ? (
            <div className="text-center py-12 text-slate-500 border border-dashed rounded-lg">
              <FileText className="w-12 h-12 mx-auto mb-4 text-slate-400" />
              <p className="font-semibold">No Documents Uploaded</p>
              <p className="text-sm">Upload your first document to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400" />
                        {doc.title}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{doc.file_type || 'txt'}</Badge>
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {formatFileSize(doc.file_size || 0)}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {format(new Date(doc.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={doc.is_active}
                          onCheckedChange={() => handleToggleActive(doc)}
                        />
                        <span className="text-sm text-slate-600">
                          {doc.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(doc.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
