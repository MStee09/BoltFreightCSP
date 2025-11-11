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
  const [trackingDomain, setTrackingDomain] = useState('');
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
        .eq('key', 'email_tracking_domain')
        .maybeSingle();

      if (error) throw error;

      if (data?.value) {
        setTrackingDomain(data.value);
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
    if (!trackingDomain.trim()) {
      toast.error('Please enter a tracking domain');
      return;
    }

    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(trackingDomain)) {
      toast.error('Please enter a valid domain (e.g., yourdomain.com)');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: 'email_tracking_domain',
          value: trackingDomain,
          description: 'Domain for Reply-To email tracking addresses (e.g., replies+CODE@domain.com)',
        });

      if (error) throw error;

      toast.success('Tracking domain saved successfully');
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
          Reply-To Email Tracking
        </CardTitle>
        <CardDescription>
          Automatically track email replies using unique Reply-To addresses
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-sm">
            <div className="space-y-2">
              <p className="font-semibold text-blue-900">How it works - Simple & Reliable</p>
              <ol className="list-decimal list-inside space-y-1 text-blue-800">
                <li>Enter your domain (e.g., yourdomain.com)</li>
                <li>Each email gets a unique Reply-To like replies+FO-ABC12345@yourdomain.com</li>
                <li>Set up catch-all forwarding for replies+*@yourdomain.com to the webhook</li>
                <li>All replies are captured automatically, even if they click "Reply" (not "Reply All")</li>
              </ol>
            </div>
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="tracking-domain">Your Email Domain</Label>
          <div className="flex gap-2">
            <Input
              id="tracking-domain"
              type="text"
              placeholder="yourdomain.com"
              value={trackingDomain}
              onChange={(e) => setTrackingDomain(e.target.value)}
              disabled={loading}
            />
            <Button onClick={handleSave} disabled={saving || loading}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            All replies will be sent to replies+CODE@{trackingDomain || 'yourdomain.com'}
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
            Set up catch-all forwarding for replies+*@{trackingDomain || 'yourdomain.com'} to this webhook
          </p>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <div className="space-y-2">
              <p className="font-semibold">Quick Setup Options:</p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>SendGrid Inbound Parse:</strong> Add catch-all rule for replies+* (easiest)</li>
                <li><strong>Mailgun Routes:</strong> Create route matching replies+* pattern</li>
                <li><strong>Cloudflare Email Routing:</strong> Free catch-all forwarding to webhook</li>
                <li><strong>Zapier/Make:</strong> Email parser automation for any inbox</li>
              </ul>
              <p className="mt-2 text-muted-foreground">
                Webhook format: {`{ from, to, cc, subject, body, messageId, inReplyTo, date }`}
              </p>
            </div>
          </AlertDescription>
        </Alert>

        {trackingDomain && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-sm text-green-800">
              <strong>Tracking enabled!</strong> Replies will go to replies+CODE@{trackingDomain}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
