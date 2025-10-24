import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, FileText, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function EmailTemplatesManagement() {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    template_key: '',
    subject_template: '',
    body_template: '',
    description: ''
  });
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['email_templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('name');

      if (error) throw error;
      return data || [];
    }
  });

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      template_key: template.template_key,
      subject_template: template.subject_template,
      body_template: template.body_template,
      description: template.description || ''
    });
    setIsEditDialogOpen(true);
  };

  const handleNew = () => {
    setEditingTemplate(null);
    setFormData({
      name: '',
      template_key: '',
      subject_template: '',
      body_template: '',
      description: ''
    });
    setIsEditDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (!formData.name || !formData.template_key || !formData.subject_template || !formData.body_template) {
        toast.error('Please fill in all required fields');
        return;
      }

      if (editingTemplate) {
        const { error } = await supabase
          .from('email_templates')
          .update({
            name: formData.name,
            subject_template: formData.subject_template,
            body_template: formData.body_template,
            description: formData.description,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingTemplate.id);

        if (error) throw error;
        toast.success('Template updated successfully');
      } else {
        const templateKeyExists = templates.some(t => t.template_key === formData.template_key);
        if (templateKeyExists) {
          toast.error('A template with this key already exists');
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();

        const { error } = await supabase
          .from('email_templates')
          .insert({
            ...formData,
            is_system: false,
            created_by: user.id
          });

        if (error) throw error;
        toast.success('Template created successfully');
      }

      queryClient.invalidateQueries(['email_templates']);
      setIsEditDialogOpen(false);
      setFormData({
        name: '',
        template_key: '',
        subject_template: '',
        body_template: '',
        description: ''
      });
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error(error.message || 'Failed to save template');
    }
  };

  const handleDelete = async (template) => {
    if (template.is_system) {
      toast.error('System templates cannot be deleted');
      return;
    }

    if (!confirm(`Are you sure you want to delete the template "${template.name}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', template.id);

      if (error) throw error;

      toast.success('Template deleted successfully');
      queryClient.invalidateQueries(['email_templates']);
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error(error.message || 'Failed to delete template');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Email Templates</CardTitle>
            <CardDescription>
              Manage email templates for faster communication with carriers and customers
            </CardDescription>
          </div>
          <Button onClick={handleNew}>
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Template Variables:</strong> Use {'{{recipientName}}'}, {'{{customerName}}'}, {'{{carrierName}}'},
            {'{{contextTitle}}'}, {'{{mode}}'}, and {'{{notes}}'} in your templates. These will be automatically replaced with actual values.
          </AlertDescription>
        </Alert>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="border rounded-lg p-4 animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map((template) => (
              <div key={template.id} className="border rounded-lg p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="h-4 w-4 text-slate-500" />
                      <h4 className="font-semibold">{template.name}</h4>
                      {template.is_system && (
                        <Badge variant="secondary" className="text-xs">System</Badge>
                      )}
                    </div>
                    {template.description && (
                      <p className="text-sm text-slate-600 mb-2">{template.description}</p>
                    )}
                    <div className="text-xs text-slate-500 space-y-1">
                      <p><strong>Key:</strong> {template.template_key}</p>
                      <p><strong>Subject:</strong> {template.subject_template}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(template)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {!template.is_system && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(template)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? 'Edit Template' : 'Create New Template'}
              </DialogTitle>
              <DialogDescription>
                {editingTemplate?.is_system
                  ? 'You can edit the content of system templates but cannot change their key.'
                  : 'Create a custom email template with variables for dynamic content.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Template Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Follow Up Call"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="template_key">Template Key *</Label>
                <Input
                  id="template_key"
                  value={formData.template_key}
                  onChange={(e) => setFormData({ ...formData, template_key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
                  placeholder="e.g., follow_up_call"
                  disabled={editingTemplate !== null}
                />
                <p className="text-xs text-muted-foreground">
                  Unique identifier for this template (lowercase, underscores only)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="When to use this template"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject_template">Subject Template *</Label>
                <Input
                  id="subject_template"
                  value={formData.subject_template}
                  onChange={(e) => setFormData({ ...formData, subject_template: e.target.value })}
                  placeholder="e.g., Follow Up: {{customerName}}"
                />
                <p className="text-xs text-muted-foreground">
                  Use variables like {'{{customerName}}'} or {'{{contextTitle}}'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="body_template">Email Body Template *</Label>
                <Textarea
                  id="body_template"
                  value={formData.body_template}
                  onChange={(e) => setFormData({ ...formData, body_template: e.target.value })}
                  placeholder="Hi {{recipientName}},&#10;&#10;Your message here...&#10;&#10;Best regards"
                  rows={10}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Available variables: {'{{recipientName}}'}, {'{{customerName}}'}, {'{{carrierName}}'},
                  {'{{contextTitle}}'}, {'{{cspDescription}}'}, {'{{notes}}'}, {'{{mode}}'}
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {editingTemplate ? 'Update Template' : 'Create Template'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
