import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../api/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useToast } from '../ui/use-toast';
import { FileText, Upload, Plus, Lock, Share2, Download, Edit2, Trash2, Clock, User, ChevronDown, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { Separator } from '../ui/separator';

export default function TariffSopsTab({ tariffId, tariffFamilyId, carrierName, customerName }) {
    const { toast } = useToast();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [editingSop, setEditingSop] = useState(null);
    const [expandedRevisions, setExpandedRevisions] = useState({});
    const [formData, setFormData] = useState({
        title: '',
        type: 'note',
        content: '',
        visibility: 'internal',
        document_url: ''
    });

    const { data: sops = [], isLoading } = useQuery({
        queryKey: ['tariff_sops', tariffId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('tariff_sops')
                .select('*')
                .eq('tariff_id', tariffId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        },
        enabled: !!tariffId
    });

    const { data: revisions = {} } = useQuery({
        queryKey: ['tariff_sop_revisions', tariffId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('tariff_sop_revisions')
                .select('*')
                .in('sop_id', sops.map(s => s.id))
                .order('version', { ascending: false });

            if (error) throw error;

            const grouped = {};
            (data || []).forEach(rev => {
                if (!grouped[rev.sop_id]) grouped[rev.sop_id] = [];
                grouped[rev.sop_id].push(rev);
            });
            return grouped;
        },
        enabled: sops.length > 0
    });

    const createSopMutation = useMutation({
        mutationFn: async (sopData) => {
            const { data, error } = await supabase
                .from('tariff_sops')
                .insert({
                    ...sopData,
                    tariff_id: tariffId,
                    tariff_family_id: tariffFamilyId,
                    user_id: user?.id || '00000000-0000-0000-0000-000000000000',
                    created_by: user?.id || '00000000-0000-0000-0000-000000000000'
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['tariff_sops', tariffId]);
            queryClient.invalidateQueries(['tariff_activity', tariffId]);
            setIsAddDialogOpen(false);
            resetForm();
            toast({
                title: 'SOP Added',
                description: 'The SOP has been successfully added.'
            });
        },
        onError: (error) => {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive'
            });
        }
    });

    const updateSopMutation = useMutation({
        mutationFn: async ({ id, ...sopData }) => {
            const { data, error } = await supabase
                .from('tariff_sops')
                .update(sopData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['tariff_sops', tariffId]);
            queryClient.invalidateQueries(['tariff_sop_revisions', tariffId]);
            queryClient.invalidateQueries(['tariff_activity', tariffId]);
            setEditingSop(null);
            resetForm();
            toast({
                title: 'SOP Updated',
                description: 'The SOP has been successfully updated.'
            });
        },
        onError: (error) => {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive'
            });
        }
    });

    const deleteSopMutation = useMutation({
        mutationFn: async (id) => {
            const { error } = await supabase
                .from('tariff_sops')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['tariff_sops', tariffId]);
            queryClient.invalidateQueries(['tariff_activity', tariffId]);
            toast({
                title: 'SOP Deleted',
                description: 'The SOP has been successfully deleted.'
            });
        },
        onError: (error) => {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive'
            });
        }
    });

    const resetForm = () => {
        setFormData({
            title: '',
            type: 'note',
            content: '',
            visibility: 'internal',
            document_url: ''
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (editingSop) {
            updateSopMutation.mutate({ id: editingSop.id, ...formData });
        } else {
            createSopMutation.mutate(formData);
        }
    };

    const handleEdit = (sop) => {
        setEditingSop(sop);
        setFormData({
            title: sop.title,
            type: sop.type,
            content: sop.content || '',
            visibility: sop.visibility,
            document_url: sop.document_url || ''
        });
        setIsAddDialogOpen(true);
    };

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this SOP?')) {
            deleteSopMutation.mutate(id);
        }
    };

    const toggleRevisions = (sopId) => {
        setExpandedRevisions(prev => ({
            ...prev,
            [sopId]: !prev[sopId]
        }));
    };

    const handleDialogClose = (open) => {
        setIsAddDialogOpen(open);
        if (!open) {
            setEditingSop(null);
            resetForm();
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                        SOPs for: {carrierName} × {customerName}
                    </h3>
                    <p className="text-sm text-slate-600 mt-1">
                        Standard Operating Procedures and documentation
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => setIsAddDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add SOP
                    </Button>
                </div>
            </div>

            <Separator />

            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-sm text-slate-600">Loading SOPs...</p>
                    </div>
                </div>
            ) : sops.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <FileText className="h-12 w-12 text-slate-400 mb-4" />
                        <p className="text-slate-600 mb-2">No SOPs yet</p>
                        <p className="text-sm text-slate-500 mb-4">
                            Add documentation and procedures for this tariff
                        </p>
                        <Button onClick={() => setIsAddDialogOpen(true)} variant="outline">
                            <Plus className="h-4 w-4 mr-2" />
                            Add First SOP
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {sops.map((sop) => (
                        <Card key={sop.id}>
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-3 flex-1">
                                        <div className="p-2 bg-blue-50 rounded-lg">
                                            {sop.type === 'document' ? (
                                                <FileText className="h-5 w-5 text-blue-600" />
                                            ) : (
                                                <FileText className="h-5 w-5 text-blue-600" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <CardTitle className="text-base">{sop.title}</CardTitle>
                                                <Badge variant={sop.visibility === 'internal' ? 'secondary' : 'default'} className="text-xs">
                                                    {sop.visibility === 'internal' ? (
                                                        <>
                                                            <Lock className="h-3 w-3 mr-1" />
                                                            Internal
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Share2 className="h-3 w-3 mr-1" />
                                                            Shared
                                                        </>
                                                    )}
                                                </Badge>
                                                <Badge variant="outline" className="text-xs">
                                                    v{sop.version}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-slate-600">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {format(new Date(sop.created_at), 'MM/dd/yy')}
                                                </span>
                                                <span className="capitalize">{sop.type}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {sop.document_url && (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => window.open(sop.document_url, '_blank')}
                                            >
                                                <Download className="h-4 w-4" />
                                            </Button>
                                        )}
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleEdit(sop)}
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleDelete(sop.id)}
                                        >
                                            <Trash2 className="h-4 w-4 text-red-600" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            {sop.content && (
                                <CardContent className="pt-0 pb-3">
                                    <div className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3 whitespace-pre-wrap">
                                        {sop.content}
                                    </div>
                                </CardContent>
                            )}
                            {revisions[sop.id]?.length > 0 && (
                                <CardContent className="pt-0 pb-3">
                                    <Collapsible>
                                        <CollapsibleTrigger
                                            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
                                            onClick={() => toggleRevisions(sop.id)}
                                        >
                                            {expandedRevisions[sop.id] ? (
                                                <ChevronDown className="h-4 w-4" />
                                            ) : (
                                                <ChevronRight className="h-4 w-4" />
                                            )}
                                            <Clock className="h-4 w-4" />
                                            Revision History ({revisions[sop.id].length})
                                        </CollapsibleTrigger>
                                        <CollapsibleContent className="mt-3">
                                            <div className="space-y-2 pl-6 border-l-2 border-slate-200">
                                                {revisions[sop.id].map((rev) => (
                                                    <div key={rev.id} className="text-xs text-slate-600">
                                                        <div className="font-medium">v{rev.version}</div>
                                                        <div>{format(new Date(rev.changed_at), 'MM/dd/yy h:mm a')}</div>
                                                        {rev.change_notes && (
                                                            <div className="text-slate-500 mt-1">{rev.change_notes}</div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </CollapsibleContent>
                                    </Collapsible>
                                </CardContent>
                            )}
                        </Card>
                    ))}
                </div>
            )}

            <Dialog open={isAddDialogOpen} onOpenChange={handleDialogClose}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingSop ? 'Edit SOP' : 'Add New SOP'}</DialogTitle>
                        <DialogDescription>
                            {editingSop ? 'Update the SOP details' : 'Create a new standard operating procedure or upload documentation'}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Title *</Label>
                            <Input
                                id="title"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="e.g., 2025 Loading Procedures"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="type">Type</Label>
                                <Select
                                    value={formData.type}
                                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                                >
                                    <SelectTrigger id="type">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="note">Note</SelectItem>
                                        <SelectItem value="document">Document</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="visibility">Visibility</Label>
                                <Select
                                    value={formData.visibility}
                                    onValueChange={(value) => setFormData({ ...formData, visibility: value })}
                                >
                                    <SelectTrigger id="visibility">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="internal">
                                            <div className="flex items-center gap-2">
                                                <Lock className="h-4 w-4" />
                                                Internal Only
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="shared">
                                            <div className="flex items-center gap-2">
                                                <Share2 className="h-4 w-4" />
                                                Share with Carrier
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {formData.type === 'document' && (
                            <div className="space-y-2">
                                <Label htmlFor="document_url">Document URL</Label>
                                <Input
                                    id="document_url"
                                    value={formData.document_url}
                                    onChange={(e) => setFormData({ ...formData, document_url: e.target.value })}
                                    placeholder="https://..."
                                />
                                <p className="text-xs text-slate-500">
                                    Upload your document to a storage service and paste the URL here
                                </p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="content">
                                {formData.type === 'document' ? 'Description (Optional)' : 'Content *'}
                            </Label>
                            <Textarea
                                id="content"
                                value={formData.content}
                                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                placeholder={formData.type === 'document' ? 'Brief description of the document' : 'Enter procedural notes and instructions...'}
                                rows={8}
                                required={formData.type === 'note'}
                            />
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleDialogClose(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={createSopMutation.isPending || updateSopMutation.isPending}
                            >
                                {editingSop ? 'Update SOP' : 'Add SOP'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
