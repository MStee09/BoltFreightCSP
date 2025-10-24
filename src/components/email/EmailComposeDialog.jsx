import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, X, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/api/supabaseClient';

export function EmailComposeDialog({
  open,
  onOpenChange,
  cspEvent,
  customer,
  carrier,
  defaultRecipients = [],
  defaultSubject = '',
  defaultTemplate = 'general'
}) {
  const [trackingCode, setTrackingCode] = useState('');
  const [toEmails, setToEmails] = useState([]);
  const [ccEmails, setCcEmails] = useState([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [toInput, setToInput] = useState('');
  const [ccInput, setCcInput] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(defaultTemplate);
  const [templates, setTemplates] = useState([]);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    if (open) {
      generateTrackingCode();
      loadUserEmail();
      loadTemplates();
    }
  }, [open]);

  useEffect(() => {
    if (open && trackingCode && templates.length > 0) {
      const recipients = defaultRecipients.length > 0
        ? defaultRecipients
        : collectDefaultRecipients();

      setToEmails(recipients);
      setCcEmails(userEmail ? [userEmail] : []);

      applyTemplate(selectedTemplate);
    }
  }, [open, trackingCode, defaultRecipients, cspEvent, customer, carrier, selectedTemplate, userEmail, templates]);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('name');

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      setTemplates([]);
    }
  };

  const loadUserEmail = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: credentials } = await supabase
          .from('user_gmail_credentials')
          .select('email_address')
          .eq('user_id', user.id)
          .maybeSingle();

        if (credentials) {
          setUserEmail(credentials.email_address);
        }
      }
    } catch (error) {
      console.error('Error loading user email:', error);
    }
  };

  const generateTrackingCode = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const code = `${timestamp}${random}`;
    setTrackingCode(code);
  };

  const collectDefaultRecipients = () => {
    const recipients = [];

    if (carrier?.contact_email) {
      recipients.push(carrier.contact_email);
    }
    if (carrier?.carrier_rep_email && !recipients.includes(carrier.carrier_rep_email)) {
      recipients.push(carrier.carrier_rep_email);
    }

    if (customer && !carrier) {
      const customerEmail = extractCustomerEmail();
      if (customerEmail) {
        recipients.push(customerEmail);
      }
    }

    return recipients;
  };

  const extractCustomerEmail = () => {
    if (!customer) return null;

    const notesMatch = customer.notes?.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
    if (notesMatch) {
      return notesMatch[1];
    }

    return null;
  };

  const getRecipientName = () => {
    if (carrier?.contact_name) return carrier.contact_name;
    if (toEmails.length > 0) {
      const email = toEmails[0];
      const namePart = email.split('@')[0];
      return namePart.charAt(0).toUpperCase() + namePart.slice(1);
    }
    return 'there';
  };

  const replaceTemplateVariables = (template, context) => {
    let result = template;

    const replacements = {
      '{{recipientName}}': context.recipientName,
      '{{customerName}}': context.customerName,
      '{{carrierName}}': context.carrierName,
      '{{contextTitle}}': context.contextTitle,
      '{{cspDescription}}': context.cspDescription,
      '{{notes}}': context.notes,
      '{{mode}}': context.mode,
      '{{additionalDetails}}': context.additionalDetails,
      '{{updateDetails}}': context.updateDetails,
      '{{context}}': context.context,
      '{{message}}': context.message
    };

    Object.entries(replacements).forEach(([key, value]) => {
      result = result.replace(new RegExp(key, 'g'), value || '');
    });

    return result.trim();
  };

  const applyTemplate = (templateKey) => {
    if (!trackingCode) return;

    const template = templates.find(t => t.template_key === templateKey);
    if (!template) return;

    const context = {
      recipientName: getRecipientName(),
      customerName: customer?.name || '[Customer]',
      carrierName: carrier?.name || '[Carrier]',
      contextTitle: cspEvent?.title || 'our discussion',
      cspDescription: cspEvent?.description || '',
      notes: cspEvent?.notes || '',
      mode: cspEvent?.metadata?.mode || cspEvent?.mode || 'FTL',
      additionalDetails: '',
      updateDetails: '',
      context: customer?.name || carrier?.name || 'your inquiry',
      message: ''
    };

    setSubject(replaceTemplateVariables(template.subject_template, context));
    setBody(replaceTemplateVariables(template.body_template, context));
  };

  const handleTemplateChange = (templateKey) => {
    setSelectedTemplate(templateKey);
    applyTemplate(templateKey);
  };

  const addEmail = (email, type) => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (type === 'to') {
      if (!toEmails.includes(trimmedEmail)) {
        setToEmails([...toEmails, trimmedEmail]);
      }
      setToInput('');
    } else {
      if (!ccEmails.includes(trimmedEmail)) {
        setCcEmails([...ccEmails, trimmedEmail]);
      }
      setCcInput('');
    }
  };

  const removeEmail = (email, type) => {
    if (type === 'to') {
      setToEmails(toEmails.filter(e => e !== email));
    } else {
      setCcEmails(ccEmails.filter(e => e !== email));
    }
  };

  const handleKeyDown = (e, type) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const input = type === 'to' ? toInput : ccInput;
      addEmail(input, type);
    }
  };

  const handleSend = async () => {
    if (toEmails.length === 0) {
      toast.error('Please add at least one recipient');
      return;
    }

    if (!subject.trim()) {
      toast.error('Please add a subject');
      return;
    }

    if (!body.trim()) {
      toast.error('Please add a message');
      return;
    }

    setSending(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      const { data: credentials } = await supabase
        .from('user_gmail_credentials')
        .select('email_address')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!credentials) {
        toast.error('Gmail not connected. Please connect your Gmail account in Settings.');
        setSending(false);
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': anonKey,
        },
        body: JSON.stringify({
          trackingCode,
          to: toEmails,
          cc: ccEmails,
          subject,
          body,
          cspEventId: cspEvent?.id,
          customerId: customer?.id,
          carrierId: carrier?.id,
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send email');
      }

      toast.success('Email sent successfully');
      onOpenChange(false);

      setToEmails([]);
      setCcEmails([]);
      setSubject('');
      setBody('');
      setToInput('');
      setCcInput('');
      setSelectedTemplate('general');
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error(error.message || 'Failed to send email. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const getContextInfo = () => {
    const parts = [];
    if (cspEvent) parts.push(`CSP Event: ${cspEvent.title}`);
    if (customer) parts.push(`Customer: ${customer.name}`);
    if (carrier) parts.push(`Carrier: ${carrier.name}`);
    return parts.join(' | ');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compose Email</DialogTitle>
          <DialogDescription>
            {getContextInfo() || 'New email message'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="template">Email Template</Label>
            <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
              <SelectTrigger id="template">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.template_key} value={template.template_key}>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      {template.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Choose a template to auto-fill the subject and body
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="to-emails">
              To {carrier && <span className="text-muted-foreground font-normal">(Carrier: {carrier.name})</span>}
              {customer && !carrier && <span className="text-muted-foreground font-normal">(Customer: {customer.name})</span>}
            </Label>
            <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[42px]">
              {toEmails.map((email) => (
                <Badge key={email} variant="secondary" className="gap-1">
                  {email}
                  <button
                    type="button"
                    onClick={() => removeEmail(email, 'to')}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <input
                id="to-emails"
                type="text"
                value={toInput}
                onChange={(e) => setToInput(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 'to')}
                onBlur={() => toInput && addEmail(toInput, 'to')}
                placeholder="Add recipient email..."
                className="flex-1 min-w-[200px] outline-none bg-transparent text-sm"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Press Enter or comma to add multiple emails
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cc-emails">CC</Label>
            <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[42px]">
              {ccEmails.map((email) => (
                <Badge key={email} variant="secondary" className="gap-1">
                  {email}
                  <button
                    type="button"
                    onClick={() => removeEmail(email, 'cc')}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <input
                id="cc-emails"
                type="text"
                value={ccInput}
                onChange={(e) => setCcInput(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 'cc')}
                onBlur={() => ccInput && addEmail(ccInput, 'cc')}
                placeholder="Add CC email..."
                className="flex-1 min-w-[200px] outline-none bg-transparent text-sm"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              CC yourself or others to keep a copy in your inbox
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject..."
            />
            <p className="text-xs text-muted-foreground">
              Tracking code is embedded in email headers (not visible to recipients)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Message</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Compose your message..."
              rows={12}
              className="resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sending}
          >
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending}>
            <Send className="h-4 w-4 mr-2" />
            {sending ? 'Sending...' : 'Send Email'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
