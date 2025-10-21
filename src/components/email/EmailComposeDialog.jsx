import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Send, X, Plus } from 'lucide-react';
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
  trackingEmail = 'csp-tracking@yourdomain.com'
}) {
  const [trackingCode, setTrackingCode] = useState('');
  const [toEmails, setToEmails] = useState([]);
  const [ccEmails, setCcEmails] = useState([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [toInput, setToInput] = useState('');
  const [ccInput, setCcInput] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      generateTrackingCode();

      const recipients = defaultRecipients.length > 0
        ? defaultRecipients
        : collectDefaultRecipients();

      setToEmails(recipients);
      setCcEmails([trackingEmail]);
      setSubject(defaultSubject);
      setBody(generateEmailTemplate());
    }
  }, [open, defaultRecipients, defaultSubject]);

  useEffect(() => {
    if (trackingCode && !subject.startsWith('[')) {
      setSubject(`[${trackingCode}] ${defaultSubject || ''}`);
    }
  }, [trackingCode]);

  const generateTrackingCode = () => {
    const code = `CSP-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    setTrackingCode(code);
  };

  const collectDefaultRecipients = () => {
    const recipients = [];

    if (carrier?.primary_contact_email) {
      recipients.push(carrier.primary_contact_email);
    }

    if (customer?.primary_contact_email) {
      recipients.push(customer.primary_contact_email);
    }

    return recipients;
  };

  const generateEmailTemplate = () => {
    const carrierName = carrier?.name || '[Carrier]';
    const customerName = customer?.name || '[Customer]';

    return `Hi team,

I wanted to follow up regarding ${cspEvent?.title || 'our discussion'}.

Best regards`;
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
      if (email === trackingEmail) {
        toast.error('Cannot remove tracking email');
        return;
      }
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

      const { data: tokens } = await supabase
        .from('user_gmail_tokens')
        .select('access_token')
        .eq('user_id', user.id)
        .single();

      if (!tokens) {
        toast.error('Gmail not connected. Please connect your Gmail account in settings.');
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
          gmailAccessToken: tokens.access_token,
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
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error(error.message || 'Failed to send email. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compose Email</DialogTitle>
          <DialogDescription>
            {cspEvent?.title && `Regarding: ${cspEvent.title}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Tracking Code</Label>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-sm font-mono">
                {trackingCode}
              </Badge>
              <span className="text-xs text-muted-foreground">
                This will be included in the email subject for tracking
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="to-emails">To</Label>
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
                <Badge
                  key={email}
                  variant={email === trackingEmail ? "default" : "secondary"}
                  className="gap-1"
                >
                  {email}
                  {email === trackingEmail && (
                    <span className="text-xs ml-1">(Tracking)</span>
                  )}
                  {email !== trackingEmail && (
                    <button
                      type="button"
                      onClick={() => removeEmail(email, 'cc')}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
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
              Tracking email is automatically CC'd to capture all replies
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
