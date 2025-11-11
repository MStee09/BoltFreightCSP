import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, Copy, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/api/supabaseClient';

export default function EmailTrackingBCC() {
  const [trackingEmail, setTrackingEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'email_tracking_bcc')
        .maybeSingle();

      if (error) throw error;

      if (data?.value) {
        setTrackingEmail(data.value);
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      setWebhookUrl(`${supabaseUrl}/functions/v1/receive-email`);
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!trackingEmail.trim()) {
      toast.error('Please enter a tracking email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trackingEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: 'email_tracking_bcc',
          value: trackingEmail,
          description: 'Email address to BCC on all outgoing emails for reply tracking',
        });

      if (error) throw error;

      toast.success('Tracking email saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Auto-BCC Email Tracking
        </CardTitle>
        <CardDescription>
          Automatically track email replies by BCCing a dedicated email address
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-sm">
            <div className="space-y-2">
              <p className="font-semibold text-blue-900">How it works</p>
              <ol className="list-decimal list-inside space-y-1 text-blue-800">
                <li>Set up a dedicated email address for tracking (e.g., tracker@yourdomain.com)</li>
                <li>Configure email forwarding to send BCCs to the webhook URL below</li>
                <li>All outgoing emails will automatically BCC this address</li>
                <li>When recipients reply, the app will capture their responses automatically</li>
              </ol>
            </div>
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="tracking-email">Tracking Email Address</Label>
          <div className="flex gap-2">
            <Input
              id="tracking-email"
              type="email"
              placeholder="tracker@yourdomain.com"
              value={trackingEmail}
              onChange={(e) => setTrackingEmail(e.target.value)}
              disabled={loading}
            />
            <Button onClick={handleSave} disabled={saving || loading}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            This email will be automatically BCCed on all outgoing emails
          </p>
        </div>

        <div className="space-y-2">
          <Label>Webhook URL</Label>
          <div className="flex gap-2">
            <Input
              value={webhookUrl}
              readOnly
              className="font-mono text-xs bg-gray-50"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => copyToClipboard(webhookUrl)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Configure your tracking email to forward to this webhook URL
          </p>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <div className="space-y-2">
              <p className="font-semibold">Email Forwarding Options:</p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>SendGrid Parse API:</strong> Configure inbound parse webhook</li>
                <li><strong>Mailgun Routes:</strong> Set up route to forward to webhook</li>
                <li><strong>Zapier/Make:</strong> Create automation to parse emails and POST to webhook</li>
                <li><strong>Gmail Filters:</strong> Auto-forward to a service that can POST to webhook</li>
              </ul>
              <p className="mt-2 text-muted-foreground">
                The webhook expects JSON: {`{ from, to, cc, subject, body, messageId, inReplyTo, date }`}
              </p>
            </div>
          </AlertDescription>
        </Alert>

        {trackingEmail && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-sm text-green-800">
              <strong>Tracking enabled!</strong> All outgoing emails will BCC {trackingEmail}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
