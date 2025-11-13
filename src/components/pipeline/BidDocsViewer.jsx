import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../api/supabaseClient';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useToast } from '../ui/use-toast';
import { Paperclip, Download, FileText, Loader2, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent } from '../ui/card';
import BidDocsUploadDialog from './BidDocsUploadDialog';

export default function BidDocsViewer({ eventCarrier }) {
  const { toast } = useToast();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  const bidDocs = eventCarrier?.bid_docs || [];

  const { data: userProfiles = [] } = useQuery({
    queryKey: ['user_profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, email');
      if (error) throw error;
      return data;
    },
  });

  const handleDownload = async (doc, index) => {
    setDownloadingId(index);
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(doc.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = doc.file_name;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: 'Document downloaded successfully',
      });
    } catch (error) {
      toast({
        title: 'Download Failed',
        description: error.message || 'Failed to download document',
        variant: 'destructive',
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (bidDocs.length === 0) {
    return (
      <>
        <Button
          variant="ghost"
          size="sm"
          className="text-slate-400"
          onClick={() => setIsUploadOpen(true)}
        >
          <Paperclip className="w-4 h-4" />
        </Button>
        <BidDocsUploadDialog
          eventCarrier={eventCarrier}
          open={isUploadOpen}
          onOpenChange={setIsUploadOpen}
        />
      </>
    );
  }

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="relative">
            <Paperclip className="w-4 h-4" />
            <Badge
              variant="secondary"
              className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] flex items-center justify-center"
            >
              {bidDocs.length}
            </Badge>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-96" align="end">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">Bid Documents ({bidDocs.length})</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsUploadOpen(true)}
              >
                <Plus className="w-3 h-3 mr-1" />
                Upload More
              </Button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2">
              {bidDocs.map((doc, index) => {
                const uploader = userProfiles.find(u => u.id === doc.uploaded_by);
                const uploaderName = uploader
                  ? `${uploader.first_name} ${uploader.last_name}`
                  : 'Unknown';

                return (
                  <Card key={index} className="hover:bg-slate-50">
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2">
                        <FileText className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{doc.file_name}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                            <span>{uploaderName}</span>
                            <span>•</span>
                            <span>{format(new Date(doc.uploaded_at), 'MMM d, yyyy')}</span>
                            {doc.file_size && (
                              <>
                                <span>•</span>
                                <span>{formatFileSize(doc.file_size)}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 flex-shrink-0"
                          onClick={() => handleDownload(doc, index)}
                          disabled={downloadingId === index}
                        >
                          {downloadingId === index ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Download className="w-3 h-3" />
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <BidDocsUploadDialog
        eventCarrier={eventCarrier}
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
      />
    </>
  );
}
